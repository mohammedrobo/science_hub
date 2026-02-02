-- Add instructor and section columns to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS instructor text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS section text;

-- Optional: Add comments
COMMENT ON COLUMN lessons.instructor IS 'ID of the instructor (e.g. essam, wagida) for filtering';
COMMENT ON COLUMN lessons.section IS 'ID of the section (e.g. physical, organic) for filtering';
