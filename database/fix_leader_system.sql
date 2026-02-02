-- ============================================
-- LEADER SYSTEM STARTUP SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- 1. Create Guild Tables (if not exist)
create table if not exists guild_quests (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    status text check (status in ('pending', 'in_progress', 'completed')) default 'pending',
    assigned_to text,
    created_by text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists guild_messages (
    id uuid default gen_random_uuid() primary key,
    sender_username text not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Realtime for Guild Tables
alter publication supabase_realtime add table guild_quests;
alter publication supabase_realtime add table guild_messages;

-- 3. Enable RLS (and allow access)
alter table guild_quests enable row level security;
alter table guild_messages enable row level security;

-- Permissive policies (application handles auth)
create policy "Enable all access for quests" on guild_quests for all using (true) with check (true);
create policy "Enable all access for messages" on guild_messages for all using (true) with check (true);

-- 4. Create Indexes
create index if not exists idx_guild_quests_status on guild_quests(status);
create index if not exists idx_guild_quests_assigned_to on guild_quests(assigned_to);
create index if not exists idx_guild_messages_created_at on guild_messages(created_at desc);

-- 5. Storage Setup for PDFs
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do nothing;

create policy "Public Access PDF" on storage.objects for select using ( bucket_id = 'pdfs' );
create policy "Allow Uploads PDF" on storage.objects for insert with check ( bucket_id = 'pdfs' );

-- 6. Helper for Lessons RLS (if needed)
alter table lessons enable row level security;
create policy "Enable all access for lessons" on lessons for all using (true) with check (true);
