-- FIXED RLS POLICIES - SIMPLER & MORE RELIABLE
-- Run this to fix RLS issues

-- PROJECTS
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
DROP POLICY IF EXISTS "Admin can manage projects" ON public.projects;
CREATE POLICY "read_all" ON public.projects FOR SELECT USING (TRUE);
CREATE POLICY "write_authenticated" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_authenticated" ON public.projects FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.projects FOR DELETE USING (auth.role() = 'authenticated');

-- JOURNAL POSTS
ALTER TABLE public.journal_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read journal posts" ON public.journal_posts;
DROP POLICY IF EXISTS "Admin can manage journal posts" ON public.journal_posts;
CREATE POLICY "read_all" ON public.journal_posts FOR SELECT USING (TRUE);
CREATE POLICY "write_authenticated" ON public.journal_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_authenticated" ON public.journal_posts FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.journal_posts FOR DELETE USING (auth.role() = 'authenticated');

-- GALLERY FOLDERS
ALTER TABLE public.gallery_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read gallery folders" ON public.gallery_folders;
DROP POLICY IF EXISTS "Admin can manage gallery folders" ON public.gallery_folders;
CREATE POLICY "read_all" ON public.gallery_folders FOR SELECT USING (TRUE);
CREATE POLICY "write_authenticated" ON public.gallery_folders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_authenticated" ON public.gallery_folders FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.gallery_folders FOR DELETE USING (auth.role() = 'authenticated');

-- GALLERY ITEMS
ALTER TABLE public.gallery_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Admin can manage gallery items" ON public.gallery_items;
CREATE POLICY "read_all" ON public.gallery_items FOR SELECT USING (TRUE);
CREATE POLICY "write_authenticated" ON public.gallery_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_authenticated" ON public.gallery_items FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.gallery_items FOR DELETE USING (auth.role() = 'authenticated');

-- EVENT VIDEOS
ALTER TABLE public.event_videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read event videos" ON public.event_videos;
DROP POLICY IF EXISTS "Admin can manage event videos" ON public.event_videos;
CREATE POLICY "read_all" ON public.event_videos FOR SELECT USING (TRUE);
CREATE POLICY "write_authenticated" ON public.event_videos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_authenticated" ON public.event_videos FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.event_videos FOR DELETE USING (auth.role() = 'authenticated');

-- CONTACT INFO
ALTER TABLE public.contact_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read contact info" ON public.contact_info;
DROP POLICY IF EXISTS "Admin can manage contact info" ON public.contact_info;
CREATE POLICY "read_all" ON public.contact_info FOR SELECT USING (TRUE);
CREATE POLICY "write_authenticated" ON public.contact_info FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_authenticated" ON public.contact_info FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.contact_info FOR DELETE USING (auth.role() = 'authenticated');

-- CONTACT MESSAGES - Keep public INSERT, authenticated READ/DELETE
ALTER TABLE public.contact_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admin can view messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON public.contact_messages;
CREATE POLICY "insert_all" ON public.contact_messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "read_authenticated" ON public.contact_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.contact_messages FOR DELETE USING (auth.role() = 'authenticated');

-- CONTENT SETTINGS
ALTER TABLE public.content_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read content settings" ON public.content_settings;
DROP POLICY IF EXISTS "Admin can manage content settings" ON public.content_settings;
CREATE POLICY "read_all" ON public.content_settings FOR SELECT USING (TRUE);
CREATE POLICY "write_authenticated" ON public.content_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_authenticated" ON public.content_settings FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.content_settings FOR DELETE USING (auth.role() = 'authenticated');

-- ADMIN USERS
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_authenticated" ON public.admin_users;
DROP POLICY IF EXISTS "write_authenticated" ON public.admin_users;
DROP POLICY IF EXISTS "delete_authenticated" ON public.admin_users;
CREATE POLICY "read_authenticated" ON public.admin_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "write_authenticated" ON public.admin_users FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_authenticated" ON public.admin_users FOR DELETE USING (auth.role() = 'authenticated');
