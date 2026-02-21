-- Add video_parts JSONB column to lessons table
-- Stores multiple video links as: [{ "title": "Part 1", "url": "https://youtu.be/..." }, ...]

ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS video_parts JSONB DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN lessons.video_parts IS 'Array of video parts: [{ title: string, url: string }]. Used for multi-part video lessons with sidebar playlist.';
