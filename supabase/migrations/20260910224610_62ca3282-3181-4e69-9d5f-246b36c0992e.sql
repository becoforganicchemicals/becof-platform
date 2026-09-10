INSERT INTO public.permissions (name, category, description)
VALUES ('coupons.manage', 'Commerce', 'Create, edit, and manage discount coupons')
ON CONFLICT (name) DO NOTHING;