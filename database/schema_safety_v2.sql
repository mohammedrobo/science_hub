-- ═══════════════════════════════════════════════════════════════
-- Safety System V2 — Advanced Student Intelligence & Monitoring
-- Run AFTER schema_safety.sql (extends existing tables)
-- ═══════════════════════════════════════════════════════════════

-- 1. Student Notes — Admin observations per student
CREATE TABLE IF NOT EXISTS student_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_username TEXT NOT NULL,
    student_username TEXT NOT NULL,
    note TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'behavioral', 'academic', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_username);
CREATE INDEX IF NOT EXISTS idx_student_notes_admin ON student_notes(admin_username);
CREATE INDEX IF NOT EXISTS idx_student_notes_date ON student_notes(created_at DESC);

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can CRUD notes
CREATE POLICY "Admins manage notes" ON student_notes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM allowed_users
            WHERE username = admin_username
            AND access_role = 'admin'
        )
    );

-- Service role bypass for server actions
CREATE POLICY "Service role full access to notes" ON student_notes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Safety Alerts — Auto-generated smart alerts
CREATE TABLE IF NOT EXISTS safety_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_username TEXT,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'inactive_student',      -- No login for 7+ days
        'failed_logins',         -- 3+ failed logins in 1 hour
        'activity_drop',         -- >50% activity decrease week-over-week
        'unusual_hours',         -- Login at unusual hours (2-5 AM)
        'high_risk_score',       -- Risk score exceeded threshold
        'new_report',            -- New student report submitted
        'system'                 -- System-level alerts
    )),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_alerts_student ON safety_alerts(student_username);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_type ON safety_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_ack ON safety_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_date ON safety_alerts(created_at DESC);

ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to alerts" ON safety_alerts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Add resolved_at to student_reports if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_reports' AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE student_reports ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. Useful views for analytics

-- Daily activity summary per student (last 30 days)
CREATE OR REPLACE VIEW student_daily_activity AS
SELECT
    username,
    DATE(created_at) as activity_date,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE action_type = 'LOGIN') as logins,
    COUNT(*) FILTER (WHERE action_type = 'LOGIN_FAILED') as failed_logins,
    COUNT(*) FILTER (WHERE action_type = 'PAGE_VIEW') as page_views,
    COUNT(*) FILTER (WHERE action_type = 'QUIZ_SUBMIT') as quizzes,
    COUNT(*) FILTER (WHERE action_type = 'LESSON_VIEW') as lessons_viewed,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as session_minutes
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY username, DATE(created_at);

-- Hourly activity heatmap (for all students or filterable)
CREATE OR REPLACE VIEW activity_heatmap AS
SELECT
    username,
    EXTRACT(DOW FROM created_at)::int as day_of_week,  -- 0=Sunday
    EXTRACT(HOUR FROM created_at)::int as hour_of_day,
    COUNT(*) as action_count
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY username, EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at);

-- Student engagement summary
CREATE OR REPLACE VIEW student_engagement_summary AS
SELECT
    u.username,
    u.full_name,
    u.original_section,
    u.original_group,
    u.access_role,
    u.last_login_at,
    u.created_at as joined_at,
    COALESCE(stats.total_xp, 0) as total_xp,
    COALESCE(stats.current_rank, 'Unranked') as current_rank,
    -- Activity metrics (last 30 days)
    COALESCE(activity.total_actions, 0) as total_actions_30d,
    COALESCE(activity.login_days, 0) as active_days_30d,
    COALESCE(activity.total_logins, 0) as total_logins_30d,
    COALESCE(activity.total_quizzes, 0) as quizzes_30d,
    COALESCE(activity.total_lessons, 0) as lessons_30d,
    COALESCE(activity.failed_logins, 0) as failed_logins_30d,
    activity.last_activity,
    -- Reports
    COALESCE(reports.report_count, 0) as report_count,
    COALESCE(reports.open_reports, 0) as open_reports
FROM allowed_users u
LEFT JOIN user_stats stats ON stats.username = u.username
LEFT JOIN (
    SELECT
        username,
        COUNT(*) as total_actions,
        COUNT(DISTINCT DATE(created_at)) as login_days,
        COUNT(*) FILTER (WHERE action_type = 'LOGIN') as total_logins,
        COUNT(*) FILTER (WHERE action_type = 'QUIZ_SUBMIT') as total_quizzes,
        COUNT(*) FILTER (WHERE action_type = 'LESSON_VIEW') as total_lessons,
        COUNT(*) FILTER (WHERE action_type = 'LOGIN_FAILED') as failed_logins,
        MAX(created_at) as last_activity
    FROM activity_logs
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY username
) activity ON activity.username = u.username
LEFT JOIN (
    SELECT
        reported_username as username,
        COUNT(*) as report_count,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'REVIEWED')) as open_reports
    FROM student_reports
    GROUP BY reported_username
) reports ON reports.username = u.username
WHERE u.access_role = 'student';
