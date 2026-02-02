-- Create Lessons Table
create table if not exists lessons (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  video_url text, -- Nullable
  pdf_url text,   -- Nullable
  quiz_id text,   -- Nullable (Quiz UUID or URL)
  order_index int default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table lessons enable row level security;
create policy "Public lessons are viewable by everyone" 
  on lessons for select using (true);

-- Indexes for performance
create index lessons_course_id_idx on lessons(course_id);
create index lessons_order_index_idx on lessons(order_index);
