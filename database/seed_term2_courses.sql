-- Insert Term 2 courses (skip any that already exist via ON CONFLICT)
-- Run this against your Supabase SQL Editor

INSERT INTO courses (name, code, semester, description, icon) VALUES
  ('Mathematics 2', 'M102', 2, 'Advanced calculus and integration techniques.', 'calculator'),
  ('General Physics 2', 'P102', 2, 'Electricity, magnetism, and modern physics.', 'zap'),
  ('Practical Physics: Electricity & Optics', 'P104', 2, 'Lab experiments in electricity, magnetism, and optics.', 'lightbulb'),
  ('General Chemistry 2', 'C102', 2, 'Organic chemistry fundamentals.', 'flask-conical'),
  ('Practical Organic Chemistry', 'C104', 2, 'Lab techniques in organic chemistry.', 'test-tube'),
  ('Historical Geology', 'G102', 2, 'History of the Earth and life evolution.', 'hourglass'),
  ('General Zoology 2', 'Z102', 2, 'Advanced animal physiology and anatomy.', 'bug'),
  ('General Botany', 'B101', 2, 'Plant biology, structure, and classification.', 'flower'),
  ('Introduction to Computer', 'COMP101', 2, 'Basics of computer science and usage.', 'monitor'),
  ('Societal Issues', 'SO100', 2, 'Contemporary social problems and analysis.', 'users')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- Verify all term 2 courses exist
SELECT id, code, name, icon FROM courses WHERE semester = 2 ORDER BY code;
