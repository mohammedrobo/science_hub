-- Add Term 1 GPA column to user_stats
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS gpa_term_1 NUMERIC(3, 2);

-- Add onboarding flag to allowed_users to track if they've seen the welcome message
ALTER TABLE allowed_users
ADD COLUMN IF NOT EXISTS has_onboarded BOOLEAN DEFAULT FALSE;

-- Update RLS to allow users to update their own stats (for onboarding)
-- (Existing policies might already cover this, but being explicit is good)
