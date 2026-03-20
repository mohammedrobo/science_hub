-- SQL Migration for n8n Automation Metadata Tracking
-- This table is required for the automated system to prevent duplicate lecture processing
-- It links incoming n8n/Telegram queue IDs with the final generated Supabase lesson_id

create table if not exists n8n_processed_lectures (
  id uuid default gen_random_uuid() primary key,
  queue_id text not null unique,        -- the unique Telegram message ID or derived hash ID
  lesson_id uuid references lessons(id) on delete set null,
  course_code text not null,
  lecture_title text not null,
  processed_at timestamptz default now() not null
);

-- Indexes for duplicate checking queries
create index if not exists n8n_processed_lectures_queue_id_idx on n8n_processed_lectures(queue_id);
create index if not exists n8n_processed_lectures_course_code_idx on n8n_processed_lectures(course_code);

-- Enable RLS (Automation will bypass via Service Key, but clients will need this)
alter table n8n_processed_lectures enable row level security;

-- Admin View Policy
create policy "Admins can view n8n processing history"
  on n8n_processed_lectures for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role in ('admin', 'super_admin')
    )
  );
