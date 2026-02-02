-- Schedule System Database Schema
-- Run in Supabase SQL Editor

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY, -- e.g., "A1", "B2", "C3", "D4"
    name TEXT NOT NULL,
    group_letter TEXT NOT NULL, -- A, B, C, D
    group_number INTEGER NOT NULL, -- 1, 2, 3, 4
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule entries table
CREATE TABLE IF NOT EXISTS schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL, -- sunday, monday, tuesday, wednesday, thursday
    slot_order INTEGER NOT NULL, -- 1, 2, 3, 4, 5, 6 (time slot order)
    subject TEXT NOT NULL, -- Physics, Chemistry, etc.
    class_type TEXT NOT NULL, -- Lecture, Practical, Tutorial
    room TEXT,
    time_start TEXT, -- e.g., "8:00"
    time_end TEXT, -- e.g., "10:00"
    raw_text TEXT, -- Original Arabic text
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_schedule_section_day ON schedule_entries(section_id, day_of_week);

-- RLS Policies
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read sections
CREATE POLICY "Sections are viewable by everyone" ON sections FOR SELECT USING (true);

-- Anyone can read schedule entries
CREATE POLICY "Schedule entries are viewable by everyone" ON schedule_entries FOR SELECT USING (true);

-- Leaders can update schedule entries for their section
-- (This requires checking against allowed_users, will be done via server action for now)

-- Insert section data
INSERT INTO sections (id, name, group_letter, group_number) VALUES
    ('A1', 'Section A1', 'A', 1),
    ('A2', 'Section A2', 'A', 2),
    ('A3', 'Section A3', 'A', 3),
    ('A4', 'Section A4', 'A', 4),
    ('B1', 'Section B1', 'B', 1),
    ('B2', 'Section B2', 'B', 2),
    ('B3', 'Section B3', 'B', 3),
    ('B4', 'Section B4', 'B', 4),
    ('C1', 'Section C1', 'C', 1),
    ('C2', 'Section C2', 'C', 2),
    ('C3', 'Section C3', 'C', 3),
    ('C4', 'Section C4', 'C', 4),
    ('D1', 'Section D1', 'D', 1),
    ('D2', 'Section D2', 'D', 2),
    ('D3', 'Section D3', 'D', 3),
    ('D4', 'Section D4', 'D', 4)
ON CONFLICT (id) DO NOTHING;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
