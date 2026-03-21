import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseQuizText } from '@/lib/quiz-parser';

const SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-n8n-secret') !== SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    courseCode, courseName, lectureTitle, lectureNumber,
    instructor, youtubeUrl, pdfUrl, quizText, lectureId,
  } = await req.json();

  // Validate the Youtube URL basic format
  const validYoutubeUrl = (typeof youtubeUrl === 'string' && youtubeUrl.startsWith('http')) ? youtubeUrl : null;

  const supabase = await createClient();

  // ── Retrieve Course UUID dynamically ──
  const { data: courseData } = await supabase
    .from('courses')
    .select('id')
    .eq('code', courseCode)
    .maybeSingle();

  if (!courseData)
    return NextResponse.json({ error: `Unknown course code: ${courseCode}` }, { status: 400 });

  const courseId = courseData.id;

  // ── Duplicate guard 1: already tracked ──
  const { data: already } = await supabase
    .from('n8n_processed_lectures')
    .select('lesson_id')
    .eq('queue_id', String(lectureId))
    .maybeSingle();
  if (already)
    return NextResponse.json({ success: true, duplicate: true, lessonId: already.lesson_id });

  // ── Duplicate guard 2: same lesson already exists ──
  const { data: titleMatch } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .eq('title', lectureTitle)
    .maybeSingle();
  if (titleMatch)
    return NextResponse.json({ success: true, duplicate: true, lessonId: titleMatch.id });

  // ── Parse quiz first! Catch errors before touching the DB ──
  let questionsCount = 0;
  let parsed = null;
  if (quizText?.length > 100) {
    try { 
      parsed = parseQuizText(quizText); 
      questionsCount = parsed.questions.length;
    } catch (e) { 
      console.warn('Quiz parsing failed, continuing without quiz:', e);
      parsed = null;
      questionsCount = 0;
    }
  }

  // ── Fix falsy check ──
  const num = parseInt(lectureNumber, 10);
  const orderIndex = Number.isNaN(num) ? 999 : num;

  const rpcQuestions = parsed ? parsed.questions.map((q: any, i: number) => ({
    text: q.question,
    type: q.type,
    options: q.options || null,
    correct_answer: q.correctAnswer || null,
    order_index: i + 1,
  })) : null;

  // ── Execute RPC for atomic transaction ──
  const { data: lessonId, error: rpcError } = await supabase.rpc('ingest_lesson_data', {
    p_queue_id: String(lectureId),
    p_course_code: courseCode,
    p_lecture_title: lectureTitle,
    p_course_id: courseId,
    p_order_index: orderIndex,
    p_video_url: validYoutubeUrl,
    p_pdf_url: pdfUrl || null,
    p_instructor: instructor || null,
    p_quiz_title: `Quiz: ${lectureTitle}`,
    p_questions: rpcQuestions
  });

  if (rpcError) {
    console.error('[ingest-lecture] RPC Error:', rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true, lessonId: lessonId,
    questionsGenerated: questionsCount,
    youtubeAttached: !!youtubeUrl,
  });
}
