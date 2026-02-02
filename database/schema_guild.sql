-- ============================================
-- Guild System Schema (Quests & Chat)
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create Guild Quests Table
create table if not exists guild_quests (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  assigned_to text, -- username (optional)
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_by text,
  created_at timestamptz default now()
);

-- 2. Create Guild Messages Table
create table if not exists guild_messages (
  id uuid default uuid_generate_v4() primary key,
  sender_username text not null,
  content text not null,
  created_at timestamptz default now()
);

-- 3. Enable RLS (Permissive for App-Layer Auth)
alter table guild_quests enable row level security;
alter table guild_messages enable row level security;

-- Quests Policies
create policy "Allow access to guild_quests for authenticated users"
  on guild_quests for all
  using (true)
  with check (true);

-- Messages Policies
create policy "Allow access to guild_messages for authenticated users"
  on guild_messages for all
  using (true)
  with check (true);

-- 4. Enable Realtime (This usually requires dashboard toggle, but we can try setting replica identity)
-- Note: You MUST enable Realtime in the Supabase Dashboard for these tables:
-- Dashboard -> Database -> Replication -> Click table -> Toggle "Insert/Update/Delete"

-- Indexes
create index guild_quests_status_idx on guild_quests(status);
create index guild_messages_created_at_idx on guild_messages(created_at desc);
