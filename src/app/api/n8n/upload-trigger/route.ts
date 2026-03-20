import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const N8N_URL = process.env.N8N_WEBHOOK_URL;
const SECRET  = process.env.N8N_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !['admin','super_admin'].includes(session.role))
    return NextResponse.json({ error:'Unauthorized' }, { status:401 });

  const fd          = await req.formData();
  const file        = fd.get('pdf') as File;
  const courseCode  = fd.get('courseCode') as string;
  const instructor  = fd.get('instructor') as string || '';
  const lecNumRaw   = fd.get('lectureNumber') as string || '0';
  const parsedNum   = parseInt(lecNumRaw, 10);
  const lecNum      = Number.isNaN(parsedNum) ? 999 : parsedNum;
  const lecTitle    = fd.get('lectureTitle') as string || '';

  if (!file || file.type !== 'application/pdf')
    return NextResponse.json({ error:'PDF required' }, { status:400 });

  if (!N8N_URL) {
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL is not configured.' }, { status: 500 });
  }

  const supabase = await createClient();

  // Dynamically fetch Course Details
  const { data: courseData } = await supabase
    .from('courses')
    .select('name, name_ar')
    .eq('code', courseCode)
    .maybeSingle();

  // Upload PDF to Supabase Storage to avoid Vercel memory limits and n8n payload limits
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const storagePath = `${courseCode.toLowerCase()}/${timestamp}_${safeName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('automation_uploads')
    .upload(storagePath, file, { contentType: 'application/pdf' });

  if (uploadError) {
    console.error('Upload Error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
  }

  // Generate a signed URL for n8n to download the file securely (valid for 7 days)
  const { data: signedData, error: signError } = await supabase.storage
    .from('automation_uploads')
    .createSignedUrl(storagePath, 604800);

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }

  // Add a 10-second timeout to the fetch request so the website doesn't hang if local n8n is offline
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-n8n-secret': SECRET || '' },
      signal: controller.signal,
      body: JSON.stringify({
        fileName:      safeName,
        pdfUrl:        signedData.signedUrl,
        courseCode,
        courseName:    courseData?.name || courseCode,
        courseNameAr:  courseData?.name_ar || '',
        instructor,
        lectureNumber: lecNum,
        lectureTitle:  lecTitle || `${courseData?.name || courseCode} — Lecture ${lecNum}`,
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) return NextResponse.json({ error:'n8n error' }, { status:500 });
    const data = await res.json();
    return NextResponse.json({ success:true, message:data.message, position:data.position });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Local automation server is offline or unreachable.' }, { status: 504 });
    }
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Failed to trigger n8n webhook.' }, { status: 500 });
  }
}
