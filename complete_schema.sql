-- Complete 1StudioArch Database Schema
-- Run all queries in Supabase SQL Editor

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  year TEXT,
  location TEXT,
  locationmapurl TEXT,
  images TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read projects" ON public.projects FOR SELECT TO PUBLIC USING (TRUE);
CREATE POLICY "Admin can manage projects" ON public.projects FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

CREATE INDEX idx_projects_display_order ON public.projects(display_order);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- ============================================
-- JOURNAL POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.journal_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  excerpt TEXT,
  category TEXT,
  content TEXT,
  featured_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.journal_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read journal posts" ON public.journal_posts FOR SELECT TO PUBLIC USING (TRUE);
CREATE POLICY "Admin can manage journal posts" ON public.journal_posts FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

CREATE INDEX idx_journal_posts_created_at ON public.journal_posts(created_at DESC);
CREATE INDEX idx_journal_posts_category ON public.journal_posts(category);

-- ============================================
-- GALLERY FOLDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.gallery_folders (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.gallery_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gallery folders" ON public.gallery_folders FOR SELECT TO PUBLIC USING (TRUE);
CREATE POLICY "Admin can manage gallery folders" ON public.gallery_folders FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

CREATE INDEX idx_gallery_folders_display_order ON public.gallery_folders(display_order);

-- ============================================
-- GALLERY ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT NOT NULL REFERENCES public.gallery_folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gallery items" ON public.gallery_items FOR SELECT TO PUBLIC USING (TRUE);
CREATE POLICY "Admin can manage gallery items" ON public.gallery_items FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

CREATE INDEX idx_gallery_items_folder_id ON public.gallery_items(folder_id);
CREATE INDEX idx_gallery_items_display_order ON public.gallery_items(display_order);

-- ============================================
-- EVENT VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_videos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  event_date TEXT,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.event_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event videos" ON public.event_videos FOR SELECT TO PUBLIC USING (TRUE);
CREATE POLICY "Admin can manage event videos" ON public.event_videos FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

CREATE INDEX idx_event_videos_created_at ON public.event_videos(created_at DESC);
CREATE INDEX idx_event_videos_category ON public.event_videos(category);

-- ============================================
-- CONTACT INFO TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.contact_info (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  locations TEXT,
  instagram TEXT,
  linkedin TEXT,
  youtube TEXT,
  locationmapurl TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contact info" ON public.contact_info FOR SELECT TO PUBLIC USING (TRUE);
CREATE POLICY "Admin can manage contact info" ON public.contact_info FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

-- ============================================
-- CONTACT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit messages" ON public.contact_messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admin can view messages" ON public.contact_messages FOR SELECT USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);
CREATE POLICY "Admin can delete messages" ON public.contact_messages FOR DELETE USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_read ON public.contact_messages(read);

-- ============================================
-- CONTENT SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_settings (
  id BIGSERIAL PRIMARY KEY,
  site_title TEXT DEFAULT '1StudioArch',
  site_description TEXT,
  site_logo TEXT,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  homepage_hero_title TEXT,
  homepage_hero_subtitle TEXT,
  homepage_featured_projects_count INTEGER DEFAULT 3,
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read content settings" ON public.content_settings FOR SELECT TO PUBLIC USING (TRUE);
CREATE POLICY "Admin can manage content settings" ON public.content_settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor'))
);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Sample contact info
INSERT INTO public.contact_info (email, phone, locations, instagram, linkedin, youtube, locationmapurl)
VALUES (
  'inquiry@1studioarch.com',
  '+44 (0) 20 1234 5678',
  'London, UK
New York, USA
Singapore, SG',
  'https://instagram.com/1studioarch',
  'https://linkedin.com/company/1studioarch',
  'https://youtube.com/@1studioarch',
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.1234567890!2d-0.1276!3d51.5074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTHCsDMwJzI2LjYiTiAwwrAwN0myMzUuNiJX!5e0!3m2!1sen!2sus!4v1234567890'
) ON CONFLICT DO NOTHING;

-- Sample content settings
INSERT INTO public.content_settings (site_title, site_description, homepage_hero_title, homepage_hero_subtitle)
VALUES (
  '1StudioArch',
  'Premium architectural design studio creating innovative spaces',
  'Architectural Excellence',
  'Transforming Visions into Timeless Spaces'
) ON CONFLICT DO NOTHING;

-- ============================================
-- OPTIONAL: Add admin user (replace with your Supabase User ID)
-- Run this after creating user in Supabase Auth
-- ============================================
-- INSERT INTO public.admin_users (id, email, role)
-- VALUES ('YOUR_USER_ID_HERE', 'admin@studioarch.com', 'admin')
-- ON CONFLICT DO NOTHING;
