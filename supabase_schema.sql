-- ============================================
-- STUDIOARCH DATABASE SCHEMA
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROJECTS TABLE
-- ============================================
CREATE TABLE public.projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  year TEXT,
  category TEXT,
  description TEXT,
  images JSONB, -- Array of image URLs from B2
  locationmapurl TEXT, -- Google Maps embed URL
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 2. GALLERY TABLES
-- ============================================
CREATE TABLE public.gallery_folders (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.gallery_items (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL, -- B2 URL
  thumbnail_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (folder_id) REFERENCES public.gallery_folders(id) ON DELETE CASCADE
);

-- ============================================
-- 3. EVENT VIDEOS TABLE
-- ============================================
CREATE TABLE public.event_videos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 4. CONTENT SETTINGS TABLE
-- ============================================
CREATE TABLE public.content_settings (
  id BIGSERIAL PRIMARY KEY,
  home_quote TEXT,
  philosophy_text TEXT,
  carousel_speed INTEGER DEFAULT 10000, -- milliseconds
  transition_duration INTEGER DEFAULT 3, -- seconds
  admin_password TEXT, -- Store hashed password
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. ADMIN USERS TABLE (for B2B roles)
-- ============================================
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'editor', -- admin, editor, viewer
  company_name TEXT, -- For B2B access
  access_level TEXT DEFAULT 'internal', -- internal, b2b, partner
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECTS POLICIES
-- ============================================
-- Public read access for projects
CREATE POLICY "Anyone can read projects"
ON public.projects
FOR SELECT
TO PUBLIC
USING (TRUE);

-- Only admin can insert/update/delete
CREATE POLICY "Admin can insert projects"
ON public.projects
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role = 'admin'
  )
);

CREATE POLICY "Admin can update projects"
ON public.projects
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor')
  )
);

CREATE POLICY "Admin can delete projects"
ON public.projects
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role = 'admin'
  )
);

-- ============================================
-- GALLERY POLICIES
-- ============================================
-- Public read access for gallery
CREATE POLICY "Anyone can read gallery folders"
ON public.gallery_folders
FOR SELECT
TO PUBLIC
USING (TRUE);

CREATE POLICY "Anyone can read gallery items"
ON public.gallery_items
FOR SELECT
TO PUBLIC
USING (TRUE);

-- Admin can manage gallery
CREATE POLICY "Admin can manage gallery folders"
ON public.gallery_folders
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor')
  )
);

CREATE POLICY "Admin can manage gallery items"
ON public.gallery_items
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor')
  )
);

-- ============================================
-- EVENT VIDEOS POLICIES
-- ============================================
-- Public read access
CREATE POLICY "Anyone can read event videos"
ON public.event_videos
FOR SELECT
TO PUBLIC
USING (TRUE);

-- Admin can manage
CREATE POLICY "Admin can manage event videos"
ON public.event_videos
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor')
  )
);

-- ============================================
-- CONTENT SETTINGS POLICIES
-- ============================================
-- Public read access
CREATE POLICY "Anyone can read content settings"
ON public.content_settings
FOR SELECT
TO PUBLIC
USING (TRUE);

-- Only admin can update
CREATE POLICY "Admin can update content settings"
ON public.content_settings
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role = 'admin'
  )
);

-- ============================================
-- ADMIN USERS POLICIES
-- ============================================
-- Users can only read their own profile
CREATE POLICY "Users can read own profile"
ON public.admin_users
FOR SELECT
USING (auth.uid() = id OR auth.uid() IN (
  SELECT id FROM public.admin_users WHERE role = 'admin'
));

-- Only admin can manage users
CREATE POLICY "Admin can manage admin users"
ON public.admin_users
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role = 'admin'
  )
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_year ON public.projects(year);
CREATE INDEX idx_gallery_items_folder_id ON public.gallery_items(folder_id);
CREATE INDEX idx_event_videos_created_at ON public.event_videos(created_at DESC);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_admin_users_access_level ON public.admin_users(access_level);

-- ============================================
-- INITIAL DATA (OPTIONAL)
-- ============================================
-- Insert default content settings
INSERT INTO public.content_settings (home_quote, philosophy_text)
VALUES (
  'Space is the beginning of all architecture.',
  'At StudioArch, we believe in thoughtful design.'
)
ON CONFLICT DO NOTHING;

-- Note: To use this schema:
-- 1. Copy and paste this SQL into Supabase SQL Editor
-- 2. Run the script
-- 3. Create auth users for admins and editors
-- 4. Add them to the admin_users table with appropriate roles
