GRANT INSERT ON public.distributor_applications TO anon;
GRANT SELECT, INSERT, UPDATE ON public.distributor_applications TO authenticated;
GRANT ALL ON public.distributor_applications TO service_role;

DROP POLICY IF EXISTS "Anyone can apply" ON public.distributor_applications;
CREATE POLICY "Anyone can submit a distributor application"
ON public.distributor_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);