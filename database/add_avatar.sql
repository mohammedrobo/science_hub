-- Add avatar_url to allowed_users table if it doesn't exist
ALTER TABLE allowed_users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create a storage bucket for avatars if needed
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Safely create policies
DO $$
BEGIN
    -- Policy for Public Read Access to Avatars
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Public Access Avatars'
    ) THEN
        CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    -- Policy for Upload Access (Authenticated users)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Allow Avatar Uploads'
    ) THEN
        CREATE POLICY "Allow Avatar Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
    END IF;
END $$;
