ALTER TABLE public.orders
ADD COLUMN delivered_at timestamptz;

UPDATE public.orders
SET delivered_at = updated_at
WHERE status = 'delivered'
  AND delivered_at IS NULL
  AND updated_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.track_order_delivery_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'delivered' THEN
      NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    END IF;
  ELSIF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := now();
  ELSIF NEW.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER track_order_delivery_timestamp
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.track_order_delivery_timestamp();