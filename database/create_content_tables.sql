-- ============================================
-- CONTENT TABLES SETUP
-- Run this in Supabase SQL Editor to fix "relation does not exist" errors
-- ============================================

-- 1. Create Courses Table
create table if not exists courses (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    code text not null unique,
    description text,
    semester integer default 1,
    icon text,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Quizzes Table (referenced by lessons)
create table if not exists quizzes (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references courses(id) on delete cascade,
    title text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Lessons Table
create table if not exists lessons (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references courses(id) on delete cascade not null,
    title text not null,
    video_url text,
    pdf_url text,
    instructor text, -- For subsection grouping
    section text,    -- For subsection grouping
    quiz_id uuid references quizzes(id) on delete set null,
    order_index integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Questions Table (for quizzes)
create table if not exists questions (
    id uuid default gen_random_uuid() primary key,
    quiz_id uuid references quizzes(id) on delete cascade not null,
    type text check (type in ('mcq', 'true_false', 'fill_blank')) default 'mcq',
    text text not null,
    options jsonb, -- Array of strings
    correct_answer text not null,
    explanation text,
    order_index integer default 0
);

-- 5. Enable RLS
alter table courses enable row level security;
alter table lessons enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;

-- 6. Create Policies (Permissive for now, relying on App Logic)
create policy "Allow public read courses" on courses for select using (true);
create policy "Allow public read lessons" on lessons for select using (true);
create policy "Allow public read quizzes" on quizzes for select using (true);
create policy "Allow public read questions" on questions for select using (true);

-- Allow inserts/updates for authenticated users (or everyone if using anon key in actions)
-- Since we use Service Role in actions for mutations usually, these might not be strictly needed for mutations, 
-- but good for client-side fetching/interaction if needed.
create policy "Allow all access courses" on courses for all using (true) with check (true);
create policy "Allow all access lessons" on lessons for all using (true) with check (true);
create policy "Allow all access quizzes" on quizzes for all using (true) with check (true);
create policy "Allow all access questions" on questions for all using (true) with check (true);
