-- Migration: Add pdf_parts to lessons table to support multiple PDFs per lesson
-- Added: 2026-02-21

ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS pdf_parts JSONB DEFAULT '[]'::jsonb;

-- Update existing data to migrate pdf_url to pdf_parts if needed for a clean start
-- This step safely maps legacy `pdf_url` into the array if `pdf_url` is not null
UPDATE lessons
SET pdf_parts = jsonb_build_array(
    jsonb_build_object(
        'title', 'Main Document',
        'url', pdf_url
    )
)
WHERE pdf_url IS NOT NULL AND (pdf_parts IS NULL OR jsonb_array_length(pdf_parts) = 0);
