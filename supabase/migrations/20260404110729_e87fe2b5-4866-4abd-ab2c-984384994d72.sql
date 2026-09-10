
-- Remove users.manage permission and any grants referencing it
DELETE FROM public.user_permissions
WHERE permission_id IN (SELECT id FROM public.permissions WHERE name = 'users.manage');

DELETE FROM public.permissions WHERE name = 'users.manage';
