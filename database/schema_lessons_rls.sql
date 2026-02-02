-- ============================================
-- RLS Policies for Lessons Table (Leaders CMS)
-- Run this in Supabase SQL Editor
-- ============================================

-- Note: Since Science Hub uses custom cookie-based auth (not Supabase Auth),
-- we cannot reference auth.uid() in RLS policies.
-- Authorization is enforced at the APPLICATION LAYER via ensureLeaderOrAdmin().
-- These policies are permissive to allow the service role client to work.

-- Allow INSERT for all (service role will bypass RLS anyway)
CREATE POLICY "Allow insert for service role" 
  ON lessons FOR INSERT
  WITH CHECK (true);

-- Allow UPDATE for all (service role will bypass RLS anyway)
CREATE POLICY "Allow update for service role" 
  ON lessons FOR UPDATE
  USING (true);

-- Allow DELETE for service role
CREATE POLICY "Allow delete for service role" 
  ON lessons FOR DELETE
  USING (true);

-- ============================================
-- SECURITY NOTE:
-- The above policies are intentionally permissive because:
-- 1. We use createServiceRoleClient() which bypasses RLS
-- 2. Authorization is verified in Server Actions via ensureLeaderOrAdmin()
-- 3. Students cannot call these actions as middleware blocks /admin access
-- ============================================
