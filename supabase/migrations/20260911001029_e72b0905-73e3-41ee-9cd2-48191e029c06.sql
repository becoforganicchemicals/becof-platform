ALTER TABLE public.loyalty_points DROP CONSTRAINT loyalty_points_type_check;
ALTER TABLE public.loyalty_points ADD CONSTRAINT loyalty_points_type_check
  CHECK (type IN ('purchase', 'review', 'referral', 'redemption', 'admin_adjustment'));