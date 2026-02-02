-- Create Quiz and Questions Tables
-- Run this in Supabase SQL Editor after schema.sql and schema_lessons.sql

-- Quizzes Table
create table if not exists quizzes (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz default now()
);

-- Questions Table
create table if not exists questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references quizzes(id) on delete cascade,
  type text not null check (type in ('mcq', 'true_false', 'fill_blank')),
  text text not null,
  options text[],  -- Array of options for MCQ
  correct_answer text not null,
  explanation text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table quizzes enable row level security;
alter table questions enable row level security;

-- Public read access
create policy "Public quizzes are viewable by everyone" 
  on quizzes for select using (true);
create policy "Public questions are viewable by everyone" 
  on questions for select using (true);

-- Indexes
create index quizzes_course_id_idx on quizzes(course_id);
create index quizzes_lesson_id_idx on quizzes(lesson_id);
create index questions_quiz_id_idx on questions(quiz_id);
create index questions_order_index_idx on questions(order_index);
