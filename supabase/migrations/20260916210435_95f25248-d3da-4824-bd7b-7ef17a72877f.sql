-- =============================================
-- Guest checkout
--
-- orders.user_id was already nullable — this just gives a guest order
-- somewhere to record contact info without an account, and a narrow,
-- safe way for that same guest to poll their own payment status
-- afterward. No changes to any existing RLS policy on orders/order_items:
-- guest order creation is routed entirely through a new edge function
-- (create-guest-order) using the service role, so the existing
-- "Users can create orders" / "Users can view own orders" policies for
-- authenticated users are untouched — zero risk of this subtly changing
-- behavior for a signed-in shopper's checkout.
-- =============================================

ALTER TABLE public.orders ADD COLUMN email text;

-- Lets a guest (or admin) check payment status for a guest order without
-- opening a general anon SELECT policy on the orders table — same pattern
-- as resolve_referral_code/resolve_affiliate_code: a narrow read, scoped
-- so it can only ever return a row that already has no account attached
-- (user_id IS NULL), never a real customer's order.
CREATE OR REPLACE FUNCTION public.get_guest_order_status(_order_id uuid)
RETURNS TABLE (payment_status text, mpesa_receipt_number text, status text, total_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT payment_status, mpesa_receipt_number, status::text, total_amount
  FROM public.orders
  WHERE id = _order_id AND user_id IS NULL
$$;
GRANT EXECUTE ON FUNCTION public.get_guest_order_status(uuid) TO anon, authenticated;
