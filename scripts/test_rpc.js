const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Testing RPC call...');
  const { data, error } = await supabase.rpc('ingest_lesson_data', {
    p_queue_id: 'test-123',
    p_course_code: 'TEST101',
    p_lecture_title: 'Test Lecture',
    p_course_id: '00000000-0000-0000-0000-000000000000', // Need valid UUID but it will probably fail before this due to signature mismatch
    p_order_index: 1,
    p_video_url: 'http://youtube.com/watch?v=123',
    p_pdf_url: 'http://example.com/file.pdf',
    p_instructor: 'Test Instructor',
    p_quiz_title: 'Quiz: Test Lecture',
    p_questions: null
  });
    
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
