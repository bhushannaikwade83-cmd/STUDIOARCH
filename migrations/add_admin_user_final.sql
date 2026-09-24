-- Add the authenticated user to admin_users table
INSERT INTO public.admin_users (id, email, full_name, role, access_level)
VALUES (
  '26fd03f1-693c-4106-a1db-f50f2cee93e3',
  'admin@studioarch.com',
  'Admin User',
  'admin',
  'internal'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Verify the user was added
SELECT id, email, role, access_level FROM public.admin_users WHERE email = 'admin@studioarch.com';
