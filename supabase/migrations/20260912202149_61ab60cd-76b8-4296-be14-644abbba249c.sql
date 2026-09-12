INSERT INTO public.user_permissions (user_id, permission_id, granted)
SELECT '89d47f06-0a03-4dae-9c1a-a8b0d0a1c029'::uuid, p.id, true
FROM public.permissions p WHERE p.name = 'affiliates.manage'
ON CONFLICT DO NOTHING;