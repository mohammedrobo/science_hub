-- ============================================
-- Storage Bucket Setup for PDF Uploads
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create a public bucket for PDFs
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do nothing;

-- 2. Allow public access to read PDFs
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'pdfs' );

-- 3. Allow authenticated users (Leaders/Admins) to upload
-- Note: 'authenticated' role corresponds to Supabase Auth.
-- Since we use custom auth, the SERVER ACTION usually handles the upload via Service Role for bypassing RLS,
-- OR we can allow 'anon' uploads if we trust the client (risky).
-- BETTER APPROACH: We'll use the Client Side upload relying on the 'anon' key 
-- and allow INSERT for everyone (since public) OR restrict via RLS if possible.
-- Given our custom auth, the middleware protects the page, so only leaders access the upload page.
-- We can allow uploads from 'anon' (browser client) but maybe restrict file type?
-- For simplicity in this v1, we allow anyone to insert into 'pdfs'.
-- Ideally, you'd use a Signed Upload URL from server, but Standard Upload is easier.

create policy "Allow Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'pdfs' );

-- 4. Allow updates/deletes? Maybe not for now.
