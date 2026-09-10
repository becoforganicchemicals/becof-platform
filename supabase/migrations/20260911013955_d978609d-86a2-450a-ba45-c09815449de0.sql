-- Add a permission entry for the new admin Coupons module, so it participates
-- in the module-based permission/access-request system like every other tab.
INSERT INTO public.permissions (name, category, description)
VALUES ('coupons.manage', 'Commerce', 'Create, edit, and manage discount coupons')
ON CONFLICT (name) DO NOTHING;
