-- 🚨 FORCE FIX STORAGE 🚨
-- Run this replacing the previous script

-- 1. Ensure the bucket exists and is PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO UPDATE
SET public = true; -- Force it to be public!

-- 2. DROP existing policies to avoid conflicts (clean slate)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;

-- 3. Re-create Policies

-- Allow EVERYONE to view images (needed for profile page)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-pictures' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their files (optional but good)
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' AND
  auth.role() = 'authenticated'
);
