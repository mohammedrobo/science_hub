-- 1. Add nickname column to allowed_users if it doesn't exist
ALTER TABLE allowed_users 
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Now every Leader/Admin can set their own nickname via the "Edit Profile" button in the Guild Hall.
