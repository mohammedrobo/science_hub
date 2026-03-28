-- Only creates the notification_reads table + grants (safe to re-run)

CREATE TABLE IF NOT EXISTS notification_reads (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    username TEXT NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (notification_id, username)
);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reads" ON notification_reads;
CREATE POLICY "Users can read own reads" ON notification_reads
    FOR SELECT USING (username = auth.uid()::text);

DROP POLICY IF EXISTS "Users can mark as read" ON notification_reads;
CREATE POLICY "Users can mark as read" ON notification_reads
    FOR INSERT WITH CHECK (username = auth.uid()::text);

GRANT ALL ON notification_reads TO service_role;
GRANT SELECT, INSERT ON notification_reads TO authenticated;
