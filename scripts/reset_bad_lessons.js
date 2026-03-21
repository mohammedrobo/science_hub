const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetBadLessons() {
  console.log('🔄 Finding incomplete lessons created by n8n (missing YouTube or quiz)...');
  
  // Find all lessons that don't have a video URL or a quiz_id (incomplete)
  // And that exist in the n8n_processed_lectures table (meaning n8n created them)
  const { data: processed, error: lookupError } = await supabase
    .from('n8n_processed_lectures')
    .select('id, lesson_id, lessons(id, title, video_url, quiz_id)');

  if (lookupError) {
    console.error('❌ Error finding processed lectures:', lookupError);
    return;
  }

  const incomplete = processed.filter(p => {
    if (!p.lessons) return true;
    const missingVideo = !p.lessons.video_url;
    const missingQuiz  = !p.lessons.quiz_id;
    return missingVideo || missingQuiz;
  });

  if (incomplete.length === 0) {
    console.log('✅ No incomplete n8n lessons found! You are good to go.');
    return;
  }

  console.log(`🧹 Found ${incomplete.length} incomplete lectures. Deleting and returning to queue...`);

  for (const item of incomplete) {
    const queueId = item.id;
    const lessonId = item.lesson_id;
    const title = item.lessons?.title || 'Unknown';

    console.log(`  -> Resetting: ${title} (Queue ID: ${queueId})`);

    // 1. Delete from lessons (cascades to quizzes, questions, and n8n_processed_lectures)
    if (lessonId) {
      const { error: delError } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (delError) console.error(`    ❌ Failed to delete lesson:`, delError);
    }

    // 2. Set the automation_queue status back to 'pending'
    const { error: resetError } = await supabase
      .from('automation_queue')
      .update({ status: 'pending', error: null, processed_at: null })
      .eq('id', queueId);
      
    if (resetError) {
      console.error(`    ❌ Failed to reset queue status:`, resetError);
    }
  }

  console.log(`🎉 Done! The ${incomplete.length} incomplete lectures are now back in the pending queue.`);
  console.log(`⏱️ n8n will naturally pick them up again on its next cycle and properly upload the Quiz + YouTube links!`);
}

resetBadLessons();
