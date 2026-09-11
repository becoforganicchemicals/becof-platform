-- =============================================
-- Affiliate marketing program
--
-- Model: an approved affiliate gets a trackable link (?aff=CODE). A visitor
-- who arrives via that link has the code captured client-side (mirroring the
-- existing ?ref= referral capture) for a bounded attribution window. If they
-- place an order while that code is active, the order is tagged with the
-- affiliate. Commission is only ever created once that order is confirmed
-- BOTH delivered and paid (same rule already used for loyalty points), and
-- is voided if the order is later cancelled/refunded — so the business only
-- ever pays commission on real, completed revenue, never on a click, a
-- signup, or a refunded sale.
-- =============================================

-- ── Affiliates ──────────────────────────────────────────────────────────────
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  commission_rate numeric NOT NULL DEFAULT 0.08 CHECK (commission_rate >= 0 AND commission_rate <= 0.5),
  business_name text,
  mpesa_phone text,
  application_note text,
  admin_note text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Code is derived from the row's own id (8 hex chars, uppercased) at insert
-- time — same zero-collision-handling trick already used for referral codes
-- (a slice of an already-unique UUID). Admins can rebrand it afterward
-- (e.g. to "GREENACRES") since the column stays a plain editable UNIQUE text.
CREATE OR REPLACE FUNCTION public.set_affiliate_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := upper(substr(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_affiliate_code BEFORE INSERT ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.set_affiliate_code();

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view own affiliate profile" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can apply as affiliate" ON public.affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can view all affiliates" ON public.affiliates
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));
CREATE POLICY "Admins can manage affiliates" ON public.affiliates
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));

-- Resolves a shareable affiliate code back to its affiliate id. SECURITY
-- DEFINER because affiliates SELECT is locked to own-row/admin — an
-- anonymous visitor (or a signed-in shopper who isn't that affiliate)
-- can't otherwise look this up. Returns only the id of an APPROVED
-- affiliate, never any profile/commission detail.
CREATE OR REPLACE FUNCTION public.resolve_affiliate_code(_code text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.affiliates WHERE upper(code) = upper(_code) AND status = 'approved' LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_affiliate_code(text) TO anon, authenticated;

-- ── Orders: which affiliate (if any) is attributed to this order ──────────
ALTER TABLE public.orders ADD COLUMN affiliate_id uuid REFERENCES public.affiliates(id);

-- ── Commission ledger ───────────────────────────────────────────────────────
-- One row per commissionable order. No INSERT/UPDATE policy for regular
-- users — only the trigger below (SECURITY DEFINER) and admins can write
-- here, same append-only-by-default posture as loyalty_points.
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
  order_total numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'payable' CHECK (status IN ('payable', 'paid', 'void')),
  payout_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_commissions.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins can view all commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));
CREATE POLICY "Admins can update commissions" ON public.affiliate_commissions
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));

-- Award commission the moment an order becomes BOTH delivered and paid
-- (mirrors award_delivery_points exactly), and void it if a previously
-- commissioned order is later cancelled or refunded — so the business never
-- pays out on a sale that didn't actually stick.
CREATE OR REPLACE FUNCTION public.award_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_affiliate RECORD;
BEGIN
  IF NEW.affiliate_id IS NOT NULL
     AND NEW.status = 'delivered' AND NEW.payment_status = 'paid'
     AND NOT (OLD.status = 'delivered' AND OLD.payment_status = 'paid') THEN

    SELECT * INTO v_affiliate FROM public.affiliates WHERE id = NEW.affiliate_id AND status = 'approved';
    IF FOUND THEN
      INSERT INTO public.affiliate_commissions (affiliate_id, order_id, order_total, commission_rate, commission_amount, status)
      VALUES (
        v_affiliate.id, NEW.id, NEW.total_amount, v_affiliate.commission_rate,
        round(NEW.total_amount * v_affiliate.commission_rate, 2), 'payable'
      )
      ON CONFLICT (order_id) DO NOTHING;
    END IF;
  END IF;

  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded') THEN
    UPDATE public.affiliate_commissions SET status = 'void' WHERE order_id = NEW.id AND status = 'payable';
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_award_affiliate_commission
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.award_affiliate_commission();

-- ── Payouts ──────────────────────────────────────────────────────────────
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  amount numeric NOT NULL,
  mpesa_phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  mpesa_receipt text,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.affiliate_payouts(id);

CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_payouts.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins can view all payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));
CREATE POLICY "Admins can update payouts" ON public.affiliate_payouts
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));

-- When a payout is marked completed, flip its linked commissions to 'paid'.
-- When marked failed/cancelled, release them back to 'payable' (clearing
-- payout_id) so they're eligible to be requested again.
CREATE OR REPLACE FUNCTION public.handle_payout_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE public.affiliate_commissions SET status = 'paid' WHERE payout_id = NEW.id;
  ELSIF NEW.status IN ('failed', 'cancelled') AND OLD.status NOT IN ('failed', 'cancelled') THEN
    UPDATE public.affiliate_commissions SET status = 'payable', payout_id = NULL WHERE payout_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_handle_payout_status_change
  AFTER UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_payout_status_change();

-- ── Permission (module-based admin access, same convention as every other
-- admin tab) ────────────────────────────────────────────────────────────────
INSERT INTO public.permissions (name, category, description)
VALUES ('affiliates.manage', 'Commerce', 'Review affiliate applications, adjust commission rates, and process payouts')
ON CONFLICT (name) DO NOTHING;
