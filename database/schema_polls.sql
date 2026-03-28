-- ============================================
-- Announcements Upgrade: Polls, Pins, Types, Reads
-- Run this in Supabase SQL Editor
-- ============================================

-- ─── 1. Add new columns to existing notifications table ──────────────────────

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'announcement',
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS category TEXT;

-- Index for pinned-first sorting
CREATE INDEX IF NOT EXISTS idx_notifications_pinned ON notifications(is_pinned DESC, created_at DESC);

-- ─── 2. Polls table (1:1 with a notification) ──────────────────────────────

CREATE TABLE IF NOT EXISTS notification_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    allow_multiple BOOLEAN DEFAULT FALSE,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_poll_per_notification UNIQUE (notification_id)
);

CREATE INDEX IF NOT EXISTS idx_polls_notification ON notification_polls(notification_id);

-- ─── 3. Poll votes table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES notification_polls(id) ON DELETE CASCADE,
    voter_username TEXT NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
    selected_option INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_vote_per_option UNIQUE (poll_id, voter_username, selected_option)
);

CREATE INDEX IF NOT EXISTS idx_votes_poll ON notification_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON notification_poll_votes(voter_username);

-- ─── 4. Notification reads (lightweight read tracking) ─────────────────────

CREATE TABLE IF NOT EXISTS notification_reads (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    username TEXT NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (notification_id, username)
);

-- ─── 5. RLS Policies ──────────────────────────────────────────────────────

-- Polls: everyone can read, only admins/leaders can create
ALTER TABLE notification_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read polls" ON notification_polls
    FOR SELECT USING (true);

CREATE POLICY "Admins and leaders can create polls" ON notification_polls
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM allowed_users
            WHERE username = auth.uid()::text
            AND access_role IN ('admin', 'super_admin', 'leader', 'doctor')
        )
    );

-- Votes: users can read all votes, insert/delete their own
ALTER TABLE notification_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes" ON notification_poll_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can vote" ON notification_poll_votes
    FOR INSERT WITH CHECK (voter_username = auth.uid()::text);

CREATE POLICY "Users can remove own votes" ON notification_poll_votes
    FOR DELETE USING (voter_username = auth.uid()::text);

-- Reads: users can see/create their own read receipts
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reads" ON notification_reads
    FOR SELECT USING (username = auth.uid()::text);

CREATE POLICY "Users can mark as read" ON notification_reads
    FOR INSERT WITH CHECK (username = auth.uid()::text);

-- ─── 6. Grants ─────────────────────────────────────────────────────────────

GRANT ALL ON notification_polls TO service_role;
GRANT ALL ON notification_poll_votes TO service_role;
GRANT ALL ON notification_reads TO service_role;

GRANT SELECT ON notification_polls TO authenticated;
GRANT SELECT, INSERT ON notification_poll_votes TO authenticated;
GRANT SELECT, INSERT ON notification_reads TO authenticated;
GRANT DELETE ON notification_poll_votes TO authenticated;
