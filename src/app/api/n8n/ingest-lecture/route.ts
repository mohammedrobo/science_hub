import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseQuizText } from '@/lib/quiz-parser';

const SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-n8n-secret') !== SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try {
    const raw = await req.text();
    if (raw && raw.trim().length > 0) {
      try {
        body = JSON.parse(raw);
      } catch {
        // Fallback for urlencoded/plain text bodies
        body = Object.fromEntries(new URLSearchParams(raw));
      }
    } else {
      body = {};
    }
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Normalize keys (trim whitespace/invisible chars)
  if (body && typeof body === 'object') {
    const normalized: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      const trimmed = String(k).replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim();
      if (!(trimmed in normalized)) normalized[trimmed] = v;
    }
    body = { ...body, ...normalized };
  }
  const courseCode    = body.courseCode ?? body.course_code ?? body.coursecode;
  const courseName    = body.courseName ?? body.course_name ?? body.coursename;
  const lectureTitle  = body.lectureTitle ?? body.lecture_title ?? body.lecturetitle;
  const lectureNumber = body.lectureNumber ?? body.lecture_number ?? body.lecture_no ?? body.lectureNo;
  const instructor    = body.instructor ?? body.instructor_name ?? body.professor ?? body.doctor ?? body.teacher;
  const rawYoutubeUrl = body.youtubeUrl ?? body.youtube_url ?? body.youtube ?? body.videoUrl ?? body.video_url ?? body.video;
  const pdfUrl        = body.pdfUrl ?? body.pdf_url ?? body.pdf;
  const quizText      = body.quizText ?? body.quiz_text ?? body.quiz;
  const lectureId     = body.lectureId ?? body.lecture_id ?? body.queue_id ?? body.id;

  console.log('[ingest-lecture] Webhook received:', JSON.stringify({ courseCode, lectureTitle, youtubeUrl: rawYoutubeUrl, hasQuiz: !!quizText, pdfUrl }));
  try {
    const fs = require('fs');
    const path = require('path');
    const logPath = process.env.N8N_DEBUG_LOG_PATH || path.join('/tmp', 'debug_webhook.log');
    fs.appendFileSync(logPath, JSON.stringify(body, null, 2) + '\n\n');
  } catch (e) {
    // Ignore log write failures in serverless environments
  }

  // Normalize YouTube URL or ID
  const normalizeYoutubeUrl = (input: unknown): string | null => {
    if (typeof input !== 'string') return null;
    let v = input.trim();
    if (!v) return null;
    // If it's a bare video ID
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return `https://www.youtube.com/watch?v=${v}`;
    // Add scheme if missing but looks like YouTube
    if (!/^https?:\/\//i.test(v) && (/^(www\.)?youtube\.com/i.test(v) || /^youtu\.be/i.test(v))) {
      v = 'https://' + v.replace(/^www\./i, '');
    }
    if (/^https?:\/\//i.test(v)) return v;
    return null;
  };

  const validYoutubeUrl = normalizeYoutubeUrl(rawYoutubeUrl);

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

  const rpcQuestions = parsed ? parsed.questions.map((q: any, i: number) => {
    let corrAns = null;
    if (q.type === 'mcq') {
       if (q.options && q.options.length > q.correctAnswerIndex && q.correctAnswerIndex >= 0) {
           corrAns = q.options[q.correctAnswerIndex];
       } else if (q.correctAnswerIndex >= 0) {
           corrAns = String.fromCharCode(97 + q.correctAnswerIndex);
       }
    } else {
       corrAns = q.correctAnswerIndex === 0 ? 'True' : 'False';
    }
    
    return {
      text: q.text,
      type: q.type,
      options: q.options || null,
      correct_answer: corrAns,
      order_index: i + 1,
    };
  }) : null;

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
    youtubeAttached: !!validYoutubeUrl,
  });
}
