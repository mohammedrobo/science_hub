-- Gamification System Schema (Solo Leveling Style)
-- Run this after schema_users.sql

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;

-- 1. User Stats Table (Tracks overall progress and rank)
CREATE TABLE user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_rank TEXT DEFAULT 'E',  -- Ranks: E, D, C, B, A, S, SS, SSS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Progress Table (Tracks individual content completion)
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL REFERENCES allowed_users(username) ON DELETE CASCADE,
  content_id TEXT NOT NULL,  -- ID of the lesson/quiz
  content_type TEXT NOT NULL,  -- 'lesson' or 'quiz'
  status TEXT DEFAULT 'in_progress',  -- 'in_progress', 'completed'
  score INTEGER,  -- For quizzes (percentage 0-100)
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(username, content_id)  -- One progress entry per user per content
);

-- Create indexes for performance
CREATE INDEX idx_user_stats_username ON user_stats(username);
CREATE INDEX idx_user_progress_username ON user_progress(username);
CREATE INDEX idx_user_progress_content ON user_progress(content_id);

-- Enable RLS (Row Level Security)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own data
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert/update stats" ON user_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can insert/update progress" ON user_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-create user_stats when a new user is created
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (username, total_xp, current_rank)
  VALUES (NEW.username, 0, 'E')
  ON CONFLICT (username) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create user_stats
CREATE TRIGGER trigger_create_user_stats
  AFTER INSERT ON allowed_users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats();

-- Function to update rank based on XP
CREATE OR REPLACE FUNCTION update_user_rank(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_xp INTEGER;
  v_new_rank TEXT;
BEGIN
  SELECT total_xp INTO v_xp FROM user_stats WHERE username = p_username;
  
  -- Rank thresholds (Solo Leveling style)
  v_new_rank := CASE
    WHEN v_xp >= 10000 THEN 'SSS'
    WHEN v_xp >= 7500 THEN 'SS'
    WHEN v_xp >= 5000 THEN 'S'
    WHEN v_xp >= 3000 THEN 'A'
    WHEN v_xp >= 1500 THEN 'B'
    WHEN v_xp >= 750 THEN 'C'
    WHEN v_xp >= 300 THEN 'D'
    ELSE 'E'
  END;
  
  UPDATE user_stats
  SET current_rank = v_new_rank, updated_at = NOW()
  WHERE username = p_username;
  
  RETURN v_new_rank;
END;
$$ LANGUAGE plpgsql;

-- Helper function to award XP
CREATE OR REPLACE FUNCTION award_xp(p_username TEXT, p_content_id TEXT, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Update total XP
  UPDATE user_stats
  SET total_xp = total_xp + p_xp, updated_at = NOW()
  WHERE username = p_username;
  
  -- Update rank
  PERFORM update_user_rank(p_username);
END;
$$ LANGUAGE plpgsql;
