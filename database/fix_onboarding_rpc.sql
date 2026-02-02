-- RPC to handle onboarding data update atomically
-- This bypasses PostgREST schema cache issues on the client side

CREATE OR REPLACE FUNCTION complete_onboarding_rpc(p_username TEXT, p_gpa NUMERIC)
RETURNS VOID AS $$
BEGIN
  -- 1. Upsert User Stats
  INSERT INTO user_stats (username, gpa_term_1, total_xp, current_rank)
  VALUES (p_username, p_gpa, 0, 'E')
  ON CONFLICT (username) 
  DO UPDATE SET 
    gpa_term_1 = p_gpa,
    updated_at = NOW();

  -- 2. Mark User as Onboarded
  UPDATE allowed_users
  SET has_onboarded = TRUE
  WHERE username = p_username;

END;
$$ LANGUAGE plpgsql;
