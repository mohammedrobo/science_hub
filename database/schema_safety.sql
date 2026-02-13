-- Student Safety & Monitoring System Schema
-- Tracks sensitive user actions and manages safety reports

-- 1. Activity Logs (The "Black Box") 
-- Records critical actions: LOGIN, PROFILE_UPDATE, QUIZ_ATTEMPT, etc.
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Keep log even if user deleted? Or set null.
    username TEXT, -- Captured at time of event (in case of changes)
    action_type TEXT NOT NULL, -- e.g. 'LOGIN', 'PROFILE_PICTURE_UPDATE', 'QUIZ_SUBMIT'
    details JSONB DEFAULT '{}', -- Flexible metadata (e.g. { "quiz_id": "123", "score": 80 })
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast Admin filtering
CREATE INDEX idx_activity_logs_user ON activity_logs(username);
CREATE INDEX idx_activity_logs_action ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_date ON activity_logs(created_at DESC);

-- RLS: STRICT ADMIN ONLY
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON activity_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM allowed_users 
            WHERE username = (SELECT username FROM user_stats WHERE id = auth.uid()) 
            AND access_role = 'admin'
        )
    );

-- Service Role (Backend) can insert logs
CREATE POLICY "Service role can insert logs" ON activity_logs
    FOR INSERT
    WITH CHECK (true);

-- 2. Reports System (The "Whistleblower")
-- Allows students to report others for bullying/harassment
CREATE TABLE IF NOT EXISTS student_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_username TEXT NOT NULL,
    reported_username TEXT NOT NULL,
    reason TEXT NOT NULL, -- e.g. "Bullying", "Inappropriate Content"
    details TEXT, -- User description
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 
-- Reporter can see their own reports
-- Admin can see ALL reports
ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can create reports" ON student_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (reporter_username = (SELECT username FROM user_stats WHERE id = auth.uid()));

CREATE POLICY "Students see own reports" ON student_reports
    FOR SELECT
    TO authenticated
    USING (reporter_username = (SELECT username FROM user_stats WHERE id = auth.uid()));

CREATE POLICY "Admins see all reports" ON student_reports
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM allowed_users 
            WHERE username = (SELECT username FROM user_stats WHERE id = auth.uid()) 
            AND access_role = 'admin'
        )
    );

CREATE POLICY "Admins can update reports" ON student_reports
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM allowed_users 
            WHERE username = (SELECT username FROM user_stats WHERE id = auth.uid()) 
            AND access_role = 'admin'
        )
    );
