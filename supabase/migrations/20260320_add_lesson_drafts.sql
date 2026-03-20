-- Migration: Add true Draft capability to the Science Hub lessons
-- Ensures all existing lessons are automatically published, while new automation records can be drafted.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
