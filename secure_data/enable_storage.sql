-- ✅ Final Setup: Profile Picture & Storage
-- Run this in Supabase SQL Editor to finish the "Mission"

-- 1. Add profile_picture_url column if it doesn't exist
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- 2. Create the Storage Bucket for Profile Pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies (Allow uploads/viewing)
-- Allow public access to view profile pictures
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-pictures' );

-- Allow authenticated users to upload their own pictures
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own pictures
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' AND
  auth.role() = 'authenticated'
);
