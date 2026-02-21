-- Migration: Add video_parts JSONB column to lessons table
-- Stores multiple video links as: [{ "title": "Part 1", "url": "https://youtu.be/..." }, ...]
-- Run this in your Supabase SQL Editor or apply via migration

-- Add video_parts column if it doesn't exist
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS video_parts JSONB DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN lessons.video_parts IS 'Array of video parts: [{ title: string, url: string }]. Used for multi-part video lessons with sidebar playlist.';

-- Notify PostgREST to reload schema cache (fixes "could not find column" error)
NOTIFY pgrst, 'reload schema';
