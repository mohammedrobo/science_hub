-- Add profile picture URL column to user_stats table
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
