-- Notifications System Schema
-- Run this in Supabase SQL Editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_username TEXT NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
    target_section TEXT, -- NULL means "all sections"
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_section ON notifications(target_section);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read notifications for their section or global ones
CREATE POLICY "Users can read relevant notifications" ON notifications
    FOR SELECT USING (
        target_section IS NULL 
        OR target_section = (
            SELECT UPPER(SUBSTRING(username FROM 3 FOR 2)) 
            FROM allowed_users 
            WHERE username = auth.uid()::text
        )
        OR EXISTS (SELECT 1 FROM allowed_users WHERE username = auth.uid()::text AND access_role IN ('admin', 'leader'))
    );

-- Policy: Admins and Leaders can insert
CREATE POLICY "Leaders and admins can send notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM allowed_users 
            WHERE username = auth.uid()::text 
            AND access_role IN ('admin', 'leader')
        )
    );

-- Policy: Sender or admin can delete
CREATE POLICY "Sender or admin can delete notifications" ON notifications
    FOR DELETE USING (
        sender_username = auth.uid()::text 
        OR EXISTS (
            SELECT 1 FROM allowed_users 
            WHERE username = auth.uid()::text 
            AND access_role = 'admin'
        )
    );

-- Grant access to service role
GRANT ALL ON notifications TO service_role;
GRANT SELECT, INSERT, DELETE ON notifications TO authenticated;
