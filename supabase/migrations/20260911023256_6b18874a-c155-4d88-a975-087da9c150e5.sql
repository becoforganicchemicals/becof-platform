-- Allow manual admin point adjustments (customer service corrections, goodwill
-- credits, etc.) as a new ledger entry type. Still no INSERT policy granted to
-- authenticated/anon — this only ever gets written by the admin-adjust-points
-- edge function via the service role, same tamper-resistance as every other type.
ALTER TABLE public.loyalty_points DROP CONSTRAINT loyalty_points_type_check;
ALTER TABLE public.loyalty_points ADD CONSTRAINT loyalty_points_type_check
  CHECK (type IN ('purchase', 'review', 'referral', 'redemption', 'admin_adjustment'));
