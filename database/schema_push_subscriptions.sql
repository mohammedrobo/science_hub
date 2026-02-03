-- Push notification subscriptions table
-- Stores browser push subscriptions for each user

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    section_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_username ON push_subscriptions(username);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_section ON push_subscriptions(section_id);

-- No RLS since we're using service role key for all operations
