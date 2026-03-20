require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const MAX_RETRY = 3;

async function main() {
  const [,,cmd,a1,a2] = process.argv;

  switch(cmd) {
    case 'next': {
      // Pick next pending atomically via RPC to prevent race conditions
      const { data: pending, error } = await supabase.rpc('get_next_pending_lecture');
        
      if (error) throw error;

      if (!pending || pending.length === 0) {
        console.log(JSON.stringify({ found: false, remaining: 0 }));
        return;
      }

      let next = pending[0];

      // Filter local
      if (next.primary_pdf_path && !fs.existsSync(next.primary_pdf_path)) {
        // File missing? Fail it instead of just nullifying the path which creates child_process errors.
        await supabase.from('automation_queue').update({
           status: 'failed', error: 'File missing locally', primary_pdf_path: null, can_use_gemini: false 
        }).eq('id', next.id);
        console.log(JSON.stringify({ found: false, remaining: 0 }));
        return;
      }

      if (!next.primary_pdf_path && !next.youtube_url) {
        // Ghost item
        await supabase.from('automation_queue').update({
           status: 'failed', error: 'No PDF and no YouTube URL'
        }).eq('id', next.id);
        console.log(JSON.stringify({ found: false, remaining: 0 }));
        return;
      }

      const { count } = await supabase.from('automation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const rem = count || 0;

      console.log(JSON.stringify({ found: true, lecture: next, remaining: rem }));
      break;
    }

    case 'done': {
      await supabase.from('automation_queue').update({
        status: 'done', processed_at: new Date().toISOString(), error: null
      }).eq('id', a1);
      console.log(JSON.stringify({ success: true }));
      break;
    }

    case 'fail': {
      const { data: item } = await supabase.from('automation_queue').select('retry_count').eq('id', a1).single();
      if (item) {
        const retries = (item.retry_count || 0) + 1;
        const status = retries >= MAX_RETRY ? 'failed' : 'pending';
        await supabase.from('automation_queue').update({
          status, error: a2 || 'unknown', retry_count: retries
        }).eq('id', a1);
        console.log(JSON.stringify({ success: true, retries, status }));
      }
      break;
    }

    case 'reset': {
      await supabase.from('automation_queue').update({
        status: 'pending', retry_count: 0, error: null, started_at: null
      }).eq('id', a1);
      console.log(JSON.stringify({ success: true }));
      break;
    }

    case 'status': {
      const { data } = await supabase.from('automation_queue').select('status, course_code');
      if (!data) return;
      
      const byStatus = data.reduce((a,x) => { a[x.status]=(a[x.status]||0)+1; return a; }, {});
      const byCourse = data.reduce((a,x) => {
        if(!a[x.course_code]) a[x.course_code]={ pending:0, done:0, failed:0, total:0 };
        a[x.course_code][x.status] = (a[x.course_code][x.status]||0)+1;
        a[x.course_code].total++;
        return a;
      }, {});
      
      const p = byStatus.pending || 0;
      console.log(JSON.stringify({
        total: data.length, byStatus, byCourse,
        estimatedHours: +(p*15/60).toFixed(1),
      }, null, 2));
      break;
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
