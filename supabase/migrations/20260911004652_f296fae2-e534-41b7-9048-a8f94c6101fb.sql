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
  IF NEW.status = 'delivered' AND NEW.payment_status = 'paid'
     AND NOT (OLD.status = 'delivered' AND OLD.payment_status = 'paid')
     AND NEW.user_id IS NOT NULL THEN

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

    -- Referral bonus: only on the referred user's first-ever delivered+paid
    -- order, only once per referred user (both checked explicitly).
    SELECT referred_by_user_id INTO v_referrer FROM public.profiles WHERE user_id = NEW.user_id;

    IF v_referrer IS NOT NULL THEN
      SELECT count(*) INTO v_prior_delivered FROM public.orders
      WHERE user_id = NEW.user_id AND status = 'delivered' AND payment_status = 'paid' AND id <> NEW.id;

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