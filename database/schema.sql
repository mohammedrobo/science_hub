-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Courses Table
create table if not exists courses (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  code text not null unique, -- slug/code
  description text,
  semester int not null check (semester in (1, 2)),
  icon text,
  image_url text, -- For Course Card image
  created_at timestamptz default now()
);

-- 3. Row Level Security (RLS)
alter table courses enable row level security;
create policy "Public courses are viewable by everyone" 
  on courses for select using (true);

-- 4. Seed Data (Term 1 & Term 2)
insert into courses (name, code, semester, description) values
  -- Term 1
  ('Mathematics 1', 'M101', 1, 'Fundamental concepts of calculus and algebra.'),
  ('General Physics 1', 'P101', 1, 'Mechanics, properties of matter, and heat.'),
  ('Practical Physics & Properties of Matter', 'P103', 1, 'Laboratory experiments.'),
  ('General Chemistry 1', 'C101', 1, 'Inorganic and physical chemistry.'),
  ('Practical Analytical Chemistry 1', 'C103', 1, 'Qualitative analysis.'),
  ('General Zoology 1', 'Z101', 1, 'Animal biology and diversity.'),
  ('Physical Geology', 'G101', 1, 'Earth materials and structures.'),
  ('English Language', 'U01', 1, 'Academic English.'),
  ('Human Rights', 'U02', 1, 'Principles of human rights.'),
  ('Environmental Culture (ثقافة بيئية)', 'U03', 1, 'Ecological principles.'), -- Replaced History

  -- Term 2
  ('Mathematics 2', 'M102', 2, 'Advanced calculus.'),
  ('General Physics 2', 'P102', 2, 'Electricity and magnetism.'),
  ('Practical Physics: Electricity & Optics', 'P104', 2, 'Lab experiments.'),
  ('General Chemistry 2', 'C102', 2, 'Organic chemistry.'),
  ('Practical Organic Chemistry', 'C104', 2, 'Lab techniques.'),
  ('Historical Geology', 'G102', 2, 'Earth history.'),
  ('General Zoology 2', 'Z102', 2, 'Animal physiology.'),
  ('General Botany', 'B101', 2, 'Plant biology.'),
  ('Introduction to Computer', 'COMP101', 2, 'Computer basics.'),
  ('Societal Issues', 'SO100', 2, 'Social problems analysis.');

-- 5. Future Proofing: Grades Table
-- create table grades (
--   id uuid default uuid_generate_v4() primary key,
--   student_id uuid references auth.users(id) on delete cascade,
--   course_id uuid references courses(id) on delete cascade,
--   score decimal(5, 2) check (score >= 0 and score <= 100),
--   grade_letter text,
--   created_at timestamptz default now()
-- );
