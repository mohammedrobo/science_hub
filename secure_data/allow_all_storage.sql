-- 🚨 NUCLEAR OPTION: ALLOW EVERYTHING 🚨
-- Only run this if the previous fix didn't work.
-- It disables ALL security checks for the 'profile-pictures' bucket.

-- 1. Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop all policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow All" ON storage.objects;

-- 3. Create a single "Allow All" policy
-- This allows ANYONE (even unauthenticated) to upload/delete files in this bucket.
-- Use this for debugging, then restrict later if needed.
CREATE POLICY "Allow All"
ON storage.objects FOR ALL
USING ( bucket_id = 'profile-pictures' )
WITH CHECK ( bucket_id = 'profile-pictures' );
