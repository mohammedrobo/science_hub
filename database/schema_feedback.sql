-- Feedback and bug reports table
-- Users can submit problems and ideas

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    section TEXT,
    type TEXT NOT NULL CHECK (type IN ('bug', 'idea', 'question', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    page_url TEXT,
    user_agent TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'in-progress', 'resolved', 'wont-fix')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_username ON feedback(username);
