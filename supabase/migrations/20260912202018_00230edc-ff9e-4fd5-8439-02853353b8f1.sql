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
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_affiliate_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.resolve_affiliate_code(_code text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.affiliates WHERE upper(code) = upper(_code) AND status = 'approved' LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_affiliate_code(text) TO anon, authenticated;

ALTER TABLE public.orders ADD COLUMN affiliate_id uuid REFERENCES public.affiliates(id);

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
GRANT SELECT, UPDATE ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_commissions.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins can view all commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));
CREATE POLICY "Admins can update commissions" ON public.affiliate_commissions
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));

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
GRANT SELECT, UPDATE ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.affiliate_payouts(id);

CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_payouts.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins can view all payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));
CREATE POLICY "Admins can update payouts" ON public.affiliate_payouts
  FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'affiliates.manage'));

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

INSERT INTO public.permissions (name, category, description)
VALUES ('affiliates.manage', 'Commerce', 'Review affiliate applications, adjust commission rates, and process payouts')
ON CONFLICT (name) DO NOTHING;