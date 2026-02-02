-- Security Logs Table for Audit Trail
-- Run this migration in Supabase SQL Editor

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    username TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    metadata JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_username ON security_logs(username);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address);

-- Enable RLS
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view security logs
CREATE POLICY "Admins can view security logs" ON security_logs
    FOR SELECT
    USING (true);  -- Server-side access only via service role

-- Policy: Only service role can insert (bypasses RLS)
CREATE POLICY "Service role can insert logs" ON security_logs
    FOR INSERT
    WITH CHECK (true);

-- Create a function to auto-cleanup old logs (retention: 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM security_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- If pg_cron is enabled:
-- SELECT cron.schedule('cleanup-security-logs', '0 3 * * *', 'SELECT cleanup_old_security_logs()');

-- Create a view for quick security dashboard stats
CREATE OR REPLACE VIEW security_stats_24h AS
SELECT
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_type = 'LOGIN_FAILED') as login_failures,
    COUNT(*) FILTER (WHERE event_type = 'RATE_LIMIT_EXCEEDED') as rate_limit_hits,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_events,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT username) as unique_users
FROM security_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Grant select on view
GRANT SELECT ON security_stats_24h TO authenticated;

COMMENT ON TABLE security_logs IS 'Audit trail for security events including logins, failures, and admin actions';
