-- Migration: Add locationMapUrl column to projects table
-- Run this in Supabase SQL Editor to fix the schema

ALTER TABLE public.projects
ADD COLUMN locationMapUrl TEXT;

-- Add index for performance (optional)
CREATE INDEX idx_projects_locationMapUrl ON public.projects(locationMapUrl) WHERE locationMapUrl IS NOT NULL;
