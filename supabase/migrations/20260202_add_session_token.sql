-- Migration: Add session_token for single session enforcement
-- Run this in your Supabase SQL Editor or apply via migration

-- Add session_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'allowed_users' AND column_name = 'session_token'
    ) THEN
        ALTER TABLE allowed_users ADD COLUMN session_token uuid;
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
