-- Performance indexes for Science Hub
-- Run this against your Supabase database

-- Index for session token lookups (every authenticated request)
CREATE INDEX IF NOT EXISTS idx_allowed_users_session_token
ON allowed_users(session_token)
WHERE session_token IS NOT NULL;

-- Composite index for user progress queries (profile, course progress)
CREATE INDEX IF NOT EXISTS idx_user_progress_user_type
ON user_progress(username, content_type);

-- Index for user progress completion lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_user_status
ON user_progress(username, status);

-- Index for activity logs by user (safety dashboard)
CREATE INDEX IF NOT EXISTS idx_activity_logs_username_created
ON activity_logs(username, created_at DESC);

-- Index for activity logs date range queries (chart data)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created
ON activity_logs(created_at DESC);

-- Index for student reports status filtering
CREATE INDEX IF NOT EXISTS idx_student_reports_status
ON student_reports(status)
WHERE status = 'pending';
