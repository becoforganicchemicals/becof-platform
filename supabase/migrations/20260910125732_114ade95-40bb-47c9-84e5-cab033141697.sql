-- Mirror the M-Pesa tracking columns already on orders so custom_orders deposit
-- payments (mpesa-stk-push / mpesa-callback) can write payment_status and phone_number
-- without hitting "column does not exist" errors.
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS phone_number text;
