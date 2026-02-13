-- Fix missing resolved_at in student_reports
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_reports' AND column_name = 'resolved_at') THEN 
        ALTER TABLE student_reports ADD COLUMN resolved_at TIMESTAMPTZ; 
    END IF; 
END $$;

-- Create admin_watchlist table for pinning students
CREATE TABLE IF NOT EXISTS admin_watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_username TEXT NOT NULL,
    student_username TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_username, student_username)
);

-- Enable RLS
ALTER TABLE admin_watchlist ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_watchlist_admin ON admin_watchlist(admin_username);

-- RLS Policy: Only admins can view/manage watchlist
CREATE POLICY "Admins can manage watchlist" ON admin_watchlist
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM allowed_users 
            WHERE username = (SELECT username FROM user_stats WHERE id = auth.uid()) 
            AND access_role = 'admin'
        )
    );
