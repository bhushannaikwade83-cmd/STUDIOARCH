-- Add authenticated user to admin_users table with admin role
-- First, get your user ID from the Auth Users table in Supabase Dashboard
-- Then replace 'YOUR_USER_ID_HERE' with your actual UUID

INSERT INTO public.admin_users (id, email, full_name, role, access_level)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user UUID from auth.users
  'admin@studioarch.com',
  'Admin User',
  'admin',
  'internal'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Verify the insert
SELECT * FROM public.admin_users;
