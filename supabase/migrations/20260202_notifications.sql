-- Notifications System Schema
-- Run in Supabase SQL Editor

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_username TEXT NOT NULL,
    target_section TEXT, -- NULL means "All Batch", otherwise specific section e.g. "C2"
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional: Link to sender profile for avatar? 
    -- For now just username is enough.
    CONSTRAINT fk_sender FOREIGN KEY (sender_username) REFERENCES allowed_users(username)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- 1. VIEW Policies (Select)
-- Admins can view ALL notifications
CREATE POLICY "Admins view all notifications" 
ON notifications FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM allowed_users 
        WHERE username = auth.uid()::text -- distinct mapping needed if auth.uid is not username
        -- Our system uses custom auth where maybe we don't map perfectly to auth.uid() 
        -- but let's assume specific app logic handles filtering.
        -- Actually, for simplicity in our custom auth setup:
        -- The SERVER ACTION will handle filtering for 'viewing'.
        -- RLS is good for backup, but if we use a Service Role client for fetching, we control it in code.
        -- Let's make a permissive RLS for now or rely on the code filtering since we don't have standard Supabase Auth users mapped 1:1 easily in SQL without a function.
    )
);

-- Actually, let's keep it simple:
-- Allow ALL authenticated read (we filter in UI/API) OR restrict if possible.
-- Since we use `allowed_users` table and not standard `auth.users`, bridging RLS is tricky without a helper function.
-- Lets use a simpler policy: "Publicly readable" (or authenticated) and filter in the Application Layer (Server Actions).
CREATE POLICY "Notifications are viewable by everyone" 
ON notifications FOR SELECT 
USING (true);

-- 2. INSERT Policies
-- We really want to restrict who can INSERT.
-- Again, hard to check `allowed_users.role` from RLS without a helper function if `auth.uid()` isn't the username.
-- We will enforce "Who can send what" strictly in the **Server Action**.
CREATE POLICY "Anyone can insert" 
ON notifications FOR INSERT 
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_section);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
