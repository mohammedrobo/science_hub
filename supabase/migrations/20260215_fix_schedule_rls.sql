-- Fix Schedule RLS Policies
-- The original migration only had SELECT policies.
-- The service role client bypasses RLS, but these policies are good practice
-- and prevent issues if the client configuration changes.

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Service role can insert schedule entries" ON schedule_entries;
DROP POLICY IF EXISTS "Service role can update schedule entries" ON schedule_entries;
DROP POLICY IF EXISTS "Service role can delete schedule entries" ON schedule_entries;
DROP POLICY IF EXISTS "Sections are viewable by everyone" ON sections;
DROP POLICY IF EXISTS "Schedule entries are viewable by everyone" ON schedule_entries;

-- Ensure RLS is enabled
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

-- Re-create SELECT policies
CREATE POLICY "Sections are viewable by everyone" 
    ON sections FOR SELECT USING (true);

CREATE POLICY "Schedule entries are viewable by everyone" 
    ON schedule_entries FOR SELECT USING (true);

-- Allow all operations for service role (used by server actions)
-- These use permissive policies that match the service role's auth context
CREATE POLICY "Service role can insert schedule entries"
    ON schedule_entries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update schedule entries"
    ON schedule_entries FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can delete schedule entries"
    ON schedule_entries FOR DELETE
    USING (true);

-- Also ensure sections table is not missing
INSERT INTO sections (id, name, group_letter, group_number) VALUES
    ('A1', 'Section A1', 'A', 1), ('A2', 'Section A2', 'A', 2),
    ('A3', 'Section A3', 'A', 3), ('A4', 'Section A4', 'A', 4),
    ('B1', 'Section B1', 'B', 1), ('B2', 'Section B2', 'B', 2),
    ('B3', 'Section B3', 'B', 3), ('B4', 'Section B4', 'B', 4),
    ('C1', 'Section C1', 'C', 1), ('C2', 'Section C2', 'C', 2),
    ('C3', 'Section C3', 'C', 3), ('C4', 'Section C4', 'C', 4),
    ('D1', 'Section D1', 'D', 1), ('D2', 'Section D2', 'D', 2),
    ('D3', 'Section D3', 'D', 3), ('D4', 'Section D4', 'D', 4)
ON CONFLICT (id) DO NOTHING;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
