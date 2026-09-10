
-- Clear existing permission grants and permissions
DELETE FROM public.user_permissions;
DELETE FROM public.permissions;

-- Insert new module-based permissions
INSERT INTO public.permissions (name, category, description) VALUES
  ('analytics.manage', 'Reporting', 'View analytics dashboard and reports'),
  ('categories.manage', 'Commerce', 'Create, edit, and delete product categories'),
  ('products.manage', 'Commerce', 'Create, edit, and delete products'),
  ('orders.manage', 'Commerce', 'View and manage customer orders'),
  ('learn.manage', 'Content', 'Create, edit, and delete learn articles'),
  ('testimonials.manage', 'Content', 'Review, approve, and manage testimonials'),
  ('impact.manage', 'Content', 'Manage impact metrics, awards, and ESG reports'),
  ('users.manage', 'People', 'View and manage user accounts'),
  ('partners.manage', 'People', 'Manage partner profiles and applications'),
  ('careers.manage', 'People', 'Manage job positions and applications'),
  ('inbox.manage', 'Communication', 'Read and respond to contact messages'),
  ('notifications.manage', 'Communication', 'View and manage system alerts');
