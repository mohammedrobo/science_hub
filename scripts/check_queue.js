const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('automation_queue')
    .select('id, lecture_title, status, error, primary_pdf_path, youtube_url, added_at, source')
    .order('added_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Recent Queue Items:');
    data.forEach(x => console.log(x));
  }
}
run();
