-- Migration: Add leader onboarding tracking
-- Adds has_leader_onboarded column to allowed_users table
-- and creates the RPC for completing leader onboarding

-- Add column for tracking leader tutorial completion
ALTER TABLE allowed_users 
ADD COLUMN IF NOT EXISTS has_leader_onboarded BOOLEAN DEFAULT FALSE;

-- Create RPC function to complete leader onboarding
CREATE OR REPLACE FUNCTION complete_leader_onboarding_rpc(p_username TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE allowed_users
    SET has_leader_onboarded = TRUE
    WHERE username = p_username
    AND access_role IN ('leader', 'admin', 'super_admin');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or not a leader: %', p_username;
    END IF;
END;
$$;

-- Create RPC function to reset leader onboarding (for replay)
CREATE OR REPLACE FUNCTION reset_leader_onboarding_rpc(p_username TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE allowed_users
    SET has_leader_onboarded = FALSE
    WHERE username = p_username
    AND access_role IN ('leader', 'admin', 'super_admin');
END;
$$;

-- Index for quick lookup during middleware checks
CREATE INDEX IF NOT EXISTS idx_allowed_users_leader_onboarding 
ON allowed_users(username, has_leader_onboarded) 
WHERE access_role IN ('leader', 'admin', 'super_admin');
