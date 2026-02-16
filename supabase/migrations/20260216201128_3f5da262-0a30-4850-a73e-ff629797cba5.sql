
-- Add status field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create permissions table
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view permissions"
ON public.permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Super admins manage permissions"
ON public.permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create user_permissions pivot table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT false,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins manage all user permissions"
ON public.user_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper function to check user permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Super admins bypass all permission checks
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id AND up.granted = true AND p.name = _permission
    )
  END
$$;

-- Create function to check if user is suspended
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE user_id = _user_id),
    true
  )
$$;

-- Seed permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('product.create', 'Create new products', 'Products'),
  ('product.view', 'View all products', 'Products'),
  ('product.update', 'Update existing products', 'Products'),
  ('product.delete', 'Delete products', 'Products'),
  ('category.create', 'Create categories', 'Categories'),
  ('category.view', 'View categories', 'Categories'),
  ('category.update', 'Update categories', 'Categories'),
  ('category.delete', 'Delete categories', 'Categories'),
  ('subcategory.create', 'Create subcategories', 'Subcategories'),
  ('subcategory.view', 'View subcategories', 'Subcategories'),
  ('subcategory.update', 'Update subcategories', 'Subcategories'),
  ('subcategory.delete', 'Delete subcategories', 'Subcategories'),
  ('order.create', 'Create orders', 'Orders'),
  ('order.view', 'View all orders', 'Orders'),
  ('order.update', 'Update order status', 'Orders'),
  ('order.delete', 'Delete/cancel orders', 'Orders'),
  ('user.create', 'Create user accounts', 'Users'),
  ('user.view', 'View user profiles', 'Users'),
  ('user.update', 'Update user accounts', 'Users'),
  ('user.delete', 'Delete user accounts', 'Users');
