CREATE POLICY "admins_can_insert_notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_super());