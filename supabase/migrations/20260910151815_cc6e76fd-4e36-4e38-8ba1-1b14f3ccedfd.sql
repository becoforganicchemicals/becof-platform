ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS phone_number text;