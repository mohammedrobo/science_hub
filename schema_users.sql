-- 1. Create the Users Table with columns matching your Python script
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  
  -- These match the column names in your python script:
  full_name TEXT NOT NULL,
  password TEXT NOT NULL,
  access_role TEXT DEFAULT 'student',
  original_group TEXT,
  original_section TEXT,

  -- Security fields
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 2. Performance Index for Login
CREATE INDEX IF NOT EXISTS idx_allowed_users_username ON allowed_users(username);

-- 3. Security (Row Level Security)
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- 4. Basic Policy (System can read users to verify login)
CREATE POLICY "Public Read for Login" ON allowed_users FOR SELECT USING (true);