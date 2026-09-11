CREATE TABLE public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'review', 'referral', 'redemption')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  review_id uuid REFERENCES public.product_reviews(id) ON DELETE SET NULL,
  referred_user_id uuid,
  description text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
ON public.loyalty_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
ON public.loyalty_points FOR SELECT TO authenticated
USING (is_admin_or_super());

ALTER TABLE public.profiles ADD COLUMN referred_by_user_id uuid;

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

ALTER TABLE public.product_reviews ADD COLUMN image_url text;
ALTER TABLE public.product_reviews ADD COLUMN order_item_id uuid REFERENCES public.order_items(id);
ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_order_item_id_key UNIQUE (order_item_id);

CREATE POLICY "Anyone can view review images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'review-images');

CREATE POLICY "Users can upload own review images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'review-images' AND (storage.foldername(name))[1] = auth.uid()::text);

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

    INSERT INTO public.loyalty_points (user_id, points, type, order_id, description, expires_at)
    VALUES (
      NEW.user_id,
      floor(NEW.total_amount / 100)::integer,
      'purchase',
      NEW.id,
      'Points earned — order #' || upper(substr(NEW.id::text, 1, 8)),
      now() + interval '1 year'
    );

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

ALTER TABLE public.orders ADD COLUMN points_redeemed integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN points_discount numeric DEFAULT 0;

INSERT INTO public.permissions (name, category, description)
VALUES ('loyalty.manage', 'Commerce', 'View and adjust customer loyalty points and referrals')
ON CONFLICT (name) DO NOTHING;