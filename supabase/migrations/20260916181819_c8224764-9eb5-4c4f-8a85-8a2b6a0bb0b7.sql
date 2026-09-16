ALTER TABLE public.orders ADD COLUMN email text;

CREATE OR REPLACE FUNCTION public.get_guest_order_status(_order_id uuid)
RETURNS TABLE (payment_status text, mpesa_receipt_number text, status text, total_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT payment_status, mpesa_receipt_number, status::text, total_amount
  FROM public.orders
  WHERE id = _order_id AND user_id IS NULL
$$;
GRANT EXECUTE ON FUNCTION public.get_guest_order_status(uuid) TO anon, authenticated;