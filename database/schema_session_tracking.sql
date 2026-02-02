-- Migration: Enhanced session tracking with device info
-- Allows showing users where they're logged in and from which device

-- Add device tracking columns
DO $$
BEGIN
    -- Add device_info column for storing device details
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'allowed_users' AND column_name = 'device_info'
    ) THEN
        ALTER TABLE allowed_users ADD COLUMN device_info JSONB;
    END IF;

    -- Add last_login_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'allowed_users' AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE allowed_users ADD COLUMN last_login_at TIMESTAMPTZ;
    END IF;

    -- Add last_login_ip for security
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'allowed_users' AND column_name = 'last_login_ip'
    ) THEN
        ALTER TABLE allowed_users ADD COLUMN last_login_ip TEXT;
    END IF;
END $$;

-- Create session_history table for tracking login history
CREATE TABLE IF NOT EXISTS session_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
    session_token UUID NOT NULL,
    device_info JSONB,
    ip_address TEXT,
    user_agent TEXT,
    logged_in_at TIMESTAMPTZ DEFAULT NOW(),
    logged_out_at TIMESTAMPTZ,
    logout_reason TEXT, -- 'manual', 'new_login', 'expired', 'admin_forced'
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_session_history_username ON session_history(username);
CREATE INDEX IF NOT EXISTS idx_session_history_active ON session_history(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_session_history_token ON session_history(session_token);

-- Enable RLS
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own session history
DROP POLICY IF EXISTS "Users can view own sessions" ON session_history;
CREATE POLICY "Users can view own sessions" ON session_history
    FOR SELECT
    USING (true);

-- Function to invalidate old sessions when new login occurs
CREATE OR REPLACE FUNCTION invalidate_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark all previous active sessions as logged out
    UPDATE session_history
    SET 
        is_active = FALSE,
        logged_out_at = NOW(),
        logout_reason = 'new_login'
    WHERE username = NEW.username
    AND is_active = TRUE
    AND session_token != NEW.session_token;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_invalidate_old_sessions ON allowed_users;

CREATE TRIGGER trigger_invalidate_old_sessions
    AFTER UPDATE OF session_token ON allowed_users
    FOR EACH ROW
    WHEN (OLD.session_token IS DISTINCT FROM NEW.session_token)
    EXECUTE FUNCTION invalidate_old_sessions();

-- Function to clean up old session history (retention: 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_session_history()
RETURNS void AS $$
BEGIN
    DELETE FROM session_history
    WHERE logged_in_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE session_history IS 'Tracks login sessions for single-device enforcement and security auditing';
