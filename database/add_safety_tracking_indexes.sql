-- Performance indexes for Safety & Tracking system
-- Run this against your Supabase database

-- ═══════════════════════════════════════════
-- Active Sessions indexes
-- ═══════════════════════════════════════════

-- Index for heartbeat queries: lookup by session_id
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id
ON active_sessions(session_id);

-- Index for stale session cleanup + live tracker
CREATE INDEX IF NOT EXISTS idx_active_sessions_active_heartbeat
ON active_sessions(is_active, last_heartbeat)
WHERE is_active = true;

-- Index for student time stats: sessions by username + date
CREATE INDEX IF NOT EXISTS idx_active_sessions_username_started
ON active_sessions(username, started_at DESC);

-- ═══════════════════════════════════════════
-- Safety Alerts indexes
-- ═══════════════════════════════════════════

-- Index for unacknowledged alerts (dashboard)
CREATE INDEX IF NOT EXISTS idx_safety_alerts_unacknowledged
ON safety_alerts(is_acknowledged, created_at DESC)
WHERE is_acknowledged = false;

-- Index for dedup check in smart alert generation
CREATE INDEX IF NOT EXISTS idx_safety_alerts_student_type_created
ON safety_alerts(student_username, alert_type, created_at DESC);

-- ═══════════════════════════════════════════
-- Admin Watchlist indexes
-- ═══════════════════════════════════════════

-- Index for watchlist lookups
CREATE INDEX IF NOT EXISTS idx_admin_watchlist_admin_student
ON admin_watchlist(admin_username, student_username);

-- ═══════════════════════════════════════════
-- Student Notes indexes
-- ═══════════════════════════════════════════

-- Index for notes by student
CREATE INDEX IF NOT EXISTS idx_student_notes_student
ON student_notes(student_username, created_at DESC);
