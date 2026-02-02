-- Drop and recreate the allowed_users table for the new structure
DROP TABLE IF EXISTS allowed_users;

CREATE TABLE allowed_users (
  username TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  password TEXT NOT NULL,  -- Plain password for initial login
  access_role TEXT DEFAULT 'student',
  original_group TEXT,     -- e.g., "A", "B", "C", "D"
  original_section TEXT,   -- e.g., "A1", "A2", "B1"
  is_first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to bypass RLS (for server actions)
CREATE POLICY "Service role can do everything" ON allowed_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_allowed_users_section ON allowed_users(original_section);
CREATE INDEX idx_allowed_users_group ON allowed_users(original_group);
