-- Gamification System V2 (Hard Mode)
-- Updates rank thresholds and XP logic for Semester 2

-- 1. Update Rank Calculation Function
CREATE OR REPLACE FUNCTION update_user_rank(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_xp INTEGER;
  v_new_rank TEXT;
BEGIN
  SELECT total_xp INTO v_xp FROM user_stats WHERE username = p_username;
  
  -- Solo Leveling Hard Mode Thresholds
  -- Assumes average user gets ~200 XP per quiz
  -- ~10 subjects * 12 lectures = 120 quizzes
  -- Max potential XP ~24,000 per semester
  
  v_new_rank := CASE
    WHEN v_xp >= 50000 THEN 'SSS'  -- God Tier (Requires ~2 semesters of perfect play)
    WHEN v_xp >= 25000 THEN 'SS'   -- National Level (End of Year 1 Goal)
    WHEN v_xp >= 12000 THEN 'S'    -- Guild Master Level (Semester 2 Goal)
    WHEN v_xp >= 6000  THEN 'A'    -- Elite Hunter (Mid-Semester 2)
    WHEN v_xp >= 3000  THEN 'B'    -- Veteran (Semester 1 Complete)
    WHEN v_xp >= 1500  THEN 'C'    -- Experienced
    WHEN v_xp >= 500   THEN 'D'    -- Rookie
    ELSE 'E'                       -- Civilian
  END;
  
  UPDATE user_stats
  SET current_rank = v_new_rank, updated_at = NOW()
  WHERE username = p_username;
  
  RETURN v_new_rank;
END;
$$ LANGUAGE plpgsql;

-- 2. Enhanced XP Award Function (Percentage-Based)
CREATE OR REPLACE FUNCTION award_xp(p_username TEXT, p_content_id TEXT, p_score INTEGER, p_max_score INTEGER, p_content_type TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_xp_to_award INTEGER;
  v_percentage INTEGER;
BEGIN
  -- Base XP just for completion (watching video)
  IF p_content_type = 'lesson' THEN
    v_xp_to_award := 50; -- Flat 50 XP for watching a lesson
  
  ELSIF p_content_type = 'quiz' THEN
    -- Calculate Percentage
    -- Avoid division by zero
    IF p_max_score > 0 THEN
      v_percentage := (p_score::FLOAT / p_max_score::FLOAT * 100)::INTEGER;
    ELSE
      v_percentage := 0;
    END IF;

    -- Performance Based Logic (Exponential Reward)
    -- Formula: Base (20) + (Percentage * 2.5)
    -- This rewards high percentages significantly more.
    -- Ex: 60%  (9/15)  -> 20 + 150 = 170 XP
    -- Ex: 100% (15/15) -> 20 + 250 = 270 XP
    -- Ex: 40%  (6/15)  -> 20 + 100 = 120 XP
    
    v_xp_to_award := 20 + (v_percentage * 2.5)::INTEGER;
    
    -- Perfect Score Bonus
    IF v_percentage = 100 THEN
      v_xp_to_award := v_xp_to_award + 100; -- Extra 100 XP bonus for perfection (Total ~370 XP)
    END IF;
  ELSE
    v_xp_to_award := 10;
  END IF;

  -- Update total XP
  UPDATE user_stats
  SET total_xp = total_xp + v_xp_to_award, updated_at = NOW()
  WHERE username = p_username;
  
  -- Update rank
  PERFORM update_user_rank(p_username);
  
  RETURN v_xp_to_award;
END;
$$ LANGUAGE plpgsql;
