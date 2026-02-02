-- 🔧 FIX MISSING COLUMN
-- Run this in Supabase SQL Editor

ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Verify it exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_stats';
