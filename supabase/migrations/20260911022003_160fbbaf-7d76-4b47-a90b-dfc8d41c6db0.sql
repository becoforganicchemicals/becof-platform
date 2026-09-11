-- ══════════════════════════════════════════════════════════════════
-- Loyalty points + referral program
-- Economics: 100 KES spent = 1 point earned, 1 point = KES 2 on redemption,
-- capped at 10% of order (post-coupon) value, points expire 1 year after
-- earning. Points are earned on delivery (not payment) to prevent gaming
-- via pay-then-refund. Review bonus: 200 pts, +200 more with a photo.
-- Referral bonus: 500 pts to the referrer when their friend's first order
-- is delivered.
-- ══════════════════════════════════════════════════════════════════

-- ── Points ledger — append-only. Balance = SUM of valid rows, computed at
-- read time, so expiry needs no cleanup job: an expired earn row just stops
-- counting once its expires_at passes. No INSERT/UPDATE/DELETE policy is
-- granted to authenticated/anon, so only SECURITY DEFINER trigger functions
-- (or the service role) can ever write to it — a client can never mint
-- itself points directly.
CREATE TABLE public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL, -- positive = earned, negative = redeemed
  type text NOT NULL CHECK (type IN ('purchase', 'review', 'referral', 'redemption')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  review_id uuid REFERENCES public.product_reviews(id) ON DELETE SET NULL,
  referred_user_id uuid,
  description text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
ON public.loyalty_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
ON public.loyalty_points FOR SELECT TO authenticated
USING (is_admin_or_super());

-- ── Referral tracking: who referred this user. A user's own referral code
-- is derived from their user_id (first 8 hex chars, uppercased) rather than
-- stored — no collision handling needed since it's just a slice of an
-- already-unique UUID.
ALTER TABLE public.profiles ADD COLUMN referred_by_user_id uuid;

-- Resolves a referral code back to the referrer's user_id. SECURITY DEFINER
-- because profiles SELECT is locked to own-row/admin — a brand-new signup
-- can't otherwise look up who a code belongs to. Returns only a UUID, never
-- profile details, so this doesn't leak anything sensitive.
CREATE OR REPLACE FUNCTION public.resolve_referral_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles
  WHERE upper(substr(user_id::text, 1, 8)) = upper(_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_referral_code(text) TO anon, authenticated;

-- ── Product reviews: add photo support + link to the specific purchased
-- line item, so points can be tied to a verified purchase and a given
-- order_item can only be reviewed once (UNIQUE), preventing farming
-- multiple bonuses off one purchase.
ALTER TABLE public.product_reviews ADD COLUMN image_url text;
ALTER TABLE public.product_reviews ADD COLUMN order_item_id uuid REFERENCES public.order_items(id);
ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_order_item_id_key UNIQUE (order_item_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true);

CREATE POLICY "Anyone can view review images"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-images');

CREATE POLICY "Users can upload own review images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── Award purchase points + referral bonus when an order is marked delivered.
CREATE OR REPLACE FUNCTION public.award_delivery_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_prior_delivered integer;
  v_already_referred integer;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.user_id IS NOT NULL THEN

    -- Purchase points: 100 KES = 1 point
    INSERT INTO public.loyalty_points (user_id, points, type, order_id, description, expires_at)
    VALUES (
      NEW.user_id,
      floor(NEW.total_amount / 100)::integer,
      'purchase',
      NEW.id,
      'Points earned — order #' || upper(substr(NEW.id::text, 1, 8)),
      now() + interval '1 year'
    );

    -- Referral bonus: only on the referred user's first-ever delivered order,
    -- only once per referred user (both checked explicitly, not assumed).
    SELECT referred_by_user_id INTO v_referrer FROM public.profiles WHERE user_id = NEW.user_id;

    IF v_referrer IS NOT NULL THEN
      SELECT count(*) INTO v_prior_delivered FROM public.orders
      WHERE user_id = NEW.user_id AND status = 'delivered' AND id <> NEW.id;

      SELECT count(*) INTO v_already_referred FROM public.loyalty_points
      WHERE type = 'referral' AND referred_user_id = NEW.user_id;

      IF v_prior_delivered = 0 AND v_already_referred = 0 THEN
        INSERT INTO public.loyalty_points (user_id, points, type, referred_user_id, description, expires_at)
        VALUES (v_referrer, 500, 'referral', NEW.user_id, 'Referral bonus — your friend completed their first order', now() + interval '1 year');
      END IF;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_delivery_points
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_delivery_points();

-- ── Award review bonus points on insert, only for a genuinely delivered,
-- matching purchase — a review with no order_item_id, or one that doesn't
-- check out, earns nothing (still gets saved, just no points).
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
  v_points integer := 200;
BEGIN
  IF NEW.order_item_id IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = NEW.order_item_id
      AND o.user_id = NEW.user_id
      AND o.status = 'delivered'
      AND oi.product_id = NEW.product_id
  ) INTO v_valid;

  IF NOT v_valid THEN RETURN NEW; END IF;

  IF NEW.image_url IS NOT NULL THEN v_points := v_points + 200; END IF;

  INSERT INTO public.loyalty_points (user_id, points, type, review_id, description, expires_at)
  VALUES (
    NEW.user_id, v_points, 'review', NEW.id,
    CASE WHEN NEW.image_url IS NOT NULL THEN 'Review bonus (with photo)' ELSE 'Review bonus' END,
    now() + interval '1 year'
  );

  UPDATE public.product_reviews SET is_verified_purchase = true WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_review_points
AFTER INSERT ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.award_review_points();

-- ── Redemption: track how many points (and how much KES) were applied to
-- an order, separate from coupon_id/discount_amount so both can be used
-- together on the same order.
ALTER TABLE public.orders ADD COLUMN points_redeemed integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN points_discount numeric DEFAULT 0;

-- Add the new coupons.manage-style permission for the eventual admin points
-- view, matching the existing module-permission system.
INSERT INTO public.permissions (name, category, description)
VALUES ('loyalty.manage', 'Commerce', 'View and adjust customer loyalty points and referrals')
ON CONFLICT (name) DO NOTHING;
