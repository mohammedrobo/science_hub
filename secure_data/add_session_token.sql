-- Add session_token to allowed_users to track active sessions
alter table allowed_users
add column if not exists session_token uuid;
