-- Migration: Rename existing 'admin' role to 'super_admin'
-- This is needed because the codebase now uses 'super_admin' for full admin 
-- and 'admin' for a new limited admin role.
-- 
-- Run this BEFORE deploying the new code, or immediately after.
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Update all existing admin users to super_admin
UPDATE allowed_users 
SET access_role = 'super_admin' 
WHERE access_role = 'admin';

-- Step 2: Verify the migration
SELECT username, full_name, access_role 
FROM allowed_users 
WHERE access_role IN ('admin', 'super_admin')
ORDER BY access_role, username;

-- Step 3: Update the check constraint to allow the new role values
-- (Only needed if there's a CHECK constraint on access_role)
-- ALTER TABLE allowed_users DROP CONSTRAINT IF EXISTS allowed_users_access_role_check;
-- ALTER TABLE allowed_users ADD CONSTRAINT allowed_users_access_role_check 
--   CHECK (access_role IN ('student', 'leader', 'admin', 'super_admin'));
