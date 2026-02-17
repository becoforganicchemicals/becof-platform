
-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('product-pdfs', 'product-pdfs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('career-cvs', 'career-cvs', false);

-- Storage policies: product-images (public read, admin write)
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

-- Storage policies: product-pdfs (admin manage, authenticated read)
CREATE POLICY "Authenticated can view product pdfs"
ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-pdfs');

CREATE POLICY "Admins can upload product pdfs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-pdfs' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can delete product pdfs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-pdfs' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

-- Storage policies: avatars (public read, own user write)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies: career-cvs (admin read, anyone insert)
CREATE POLICY "Admins can view career cvs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'career-cvs' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Anyone can upload career cv"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'career-cvs');

-- Careers tables
CREATE TABLE public.job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text,
  location text,
  type text NOT NULL DEFAULT 'full-time',
  description text,
  requirements text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active positions"
ON public.job_positions FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all positions"
ON public.job_positions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage positions"
ON public.job_positions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_job_positions_updated_at
BEFORE UPDATE ON public.job_positions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.career_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_position_id uuid REFERENCES public.job_positions(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cover_letter text,
  cv_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit applications"
ON public.career_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view applications"
ON public.career_applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update applications"
ON public.career_applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_career_applications_updated_at
BEFORE UPDATE ON public.career_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_active field to categories for toggle support
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
