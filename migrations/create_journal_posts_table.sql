-- Migration: Create journal_posts table for Supabase
-- Run this in Supabase SQL Editor

CREATE TABLE public.journal_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  excerpt TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.journal_posts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read journal posts"
ON public.journal_posts
FOR SELECT
TO PUBLIC
USING (TRUE);

-- Admin can manage
CREATE POLICY "Admin can manage journal posts"
ON public.journal_posts
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users WHERE role IN ('admin', 'editor')
  )
);

-- Create indexes for performance
CREATE INDEX idx_journal_posts_created_at ON public.journal_posts(created_at DESC);
CREATE INDEX idx_journal_posts_category ON public.journal_posts(category);

-- Insert default journal posts (optional)
INSERT INTO public.journal_posts (title, date, excerpt, category)
VALUES
  ('The Future of Sustainable Luxury Architecture', 'June 2024', 'Exploring how cutting-edge sustainable practices are reshaping the landscape of luxury architecture without compromising on aesthetic excellence.', 'Sustainability'),
  ('Materiality in Modern Design: A Deep Dive', 'May 2024', 'Understanding how the choice of materials can elevate a space from functional to extraordinary, and the artistry behind material selection.', 'Design'),
  ('Light as Architecture: Creating Spaces Through Illumination', 'April 2024', 'Discover how we leverage light—both natural and artificial—as a fundamental design element to transform architectural spaces.', 'Design'),
  ('Case Study: The Obsidian Villa''s Journey', 'March 2024', 'Behind the scenes of one of our most ambitious projects. From conceptualization to completion, exploring the challenges and triumphs.', 'Projects')
ON CONFLICT DO NOTHING;
