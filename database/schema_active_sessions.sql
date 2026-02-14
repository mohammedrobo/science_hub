-- ═══════════════════════════════════════════════════════════════
-- Active Session Tracking — Real time-on-site measurement
-- via heartbeat pings from the client every 30 seconds.
-- ═══════════════════════════════════════════════════════════════

-- Each "active session" represents a continuous period of a user
-- having the site open and active. Heartbeats keep it alive.
CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- random ID per browser tab
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ, -- NULL while active
    duration_seconds INTEGER DEFAULT 0, -- computed on end
    current_page TEXT, -- last known page
    pages_visited TEXT[] DEFAULT '{}', -- all pages during this session
    device_info JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_active_sessions_username ON active_sessions(username);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_active_sessions_started ON active_sessions(started_at DESC);

-- Auto-close stale sessions (no heartbeat for 2+ minutes)
CREATE OR REPLACE FUNCTION close_stale_sessions()
RETURNS void AS $$
BEGIN
    UPDATE active_sessions
    SET 
        is_active = FALSE,
        ended_at = last_heartbeat,
        duration_seconds = EXTRACT(EPOCH FROM (last_heartbeat - started_at))::INTEGER
    WHERE is_active = TRUE
      AND last_heartbeat < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Daily summary view: total time per student per day
CREATE OR REPLACE VIEW student_daily_time AS
SELECT
    username,
    DATE(started_at) AS day,
    COUNT(*) AS session_count,
    SUM(COALESCE(duration_seconds, EXTRACT(EPOCH FROM (last_heartbeat - started_at))::INTEGER)) AS total_seconds,
    MIN(started_at) AS first_seen,
    MAX(COALESCE(ended_at, last_heartbeat)) AS last_seen,
    array_agg(DISTINCT unnest_pages) AS all_pages
FROM active_sessions,
LATERAL unnest(pages_visited) AS unnest_pages
GROUP BY username, DATE(started_at);

-- Weekly summary view
CREATE OR REPLACE VIEW student_weekly_time AS
SELECT
    username,
    DATE_TRUNC('week', started_at) AS week_start,
    COUNT(*) AS session_count,
    SUM(COALESCE(duration_seconds, EXTRACT(EPOCH FROM (last_heartbeat - started_at))::INTEGER)) AS total_seconds
FROM active_sessions
GROUP BY username, DATE_TRUNC('week', started_at);

-- RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON active_sessions
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Students can only read their own sessions
CREATE POLICY "Students read own sessions" ON active_sessions
    FOR SELECT USING (username = current_setting('request.jwt.claim.username', true));
