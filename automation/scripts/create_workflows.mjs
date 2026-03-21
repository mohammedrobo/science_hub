import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT        = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Load env from project + automation scopes (order: base -> local -> automation)
dotenv.config({ path: path.join(ROOT, '.env') });
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, 'automation', '.env') });

const N8N         = process.env.N8N_URL || process.env.N8N_BASE_URL || 'http://localhost:5678';
const AUTH        = Buffer.from(process.env.N8N_ADMIN_CREDENTIALS || 'admin:sciencehub2024').toString('base64');
const HEADERS     = { 'Content-Type':'application/json', 'Authorization':`Basic ${AUTH}` };
const WEBSITE     = process.env.WEBSITE_URL || 'http://localhost:3000';
const SECRET      = process.env.N8N_WEBHOOK_SECRET;
const YT_KEY      = process.env.YOUTUBE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SECRET) console.warn('⚠️  N8N_WEBHOOK_SECRET is missing — website ingest will reject requests.');
if (!YT_KEY) console.warn('⚠️  YOUTUBE_API_KEY is missing — YouTube search will fail.');
if (!SUPABASE_URL || !SUPABASE_KEY) console.warn('⚠️  Supabase credentials missing — queue insert will fail.');

async function api(path, body) {
  const r = await fetch(`${N8N}/rest${path}`, {
    method:'POST', headers:HEADERS, body:JSON.stringify(body),
  });
  return r.json();
}
async function activate(id) {
  await fetch(`${N8N}/rest/workflows/${id}/activate`, { method:'POST', headers:HEADERS });
}

// ═══════════════════════════════════════════
// WORKFLOW 1 — Lecture Processor (every 15 min)
// ═══════════════════════════════════════════
const processorWF = {
  name: "📚 Science Hub — Lecture Processor",
  active: true,
  nodes: [
    {
      name: "Every 15 Minutes",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [80, 300],
      parameters: { rule:{ interval:[{ field:"minutes", minutesInterval:15 }] } },
    },
    {
      name: "Pick Next from Queue",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [300, 300],
      parameters: { command:`cd "${ROOT}" && node automation/scripts/queue_manager.js next` },
    },
    {
      name: "Parse Queue",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [520, 300],
      parameters: { jsCode:`
const raw = $input.first().json.stdout || '{}';
const r = JSON.parse(raw.trim());
return [{ json: r.found ? { skip:false, ...r } : { skip:true } }];
      `},
    },
    {
      name: "Queue Empty?",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [740, 300],
      parameters: {
        conditions: { conditions:[{
          leftValue:"={{ $json.skip }}",
          rightValue:false,
          operator:{ type:"boolean", operation:"equals" }
        }]}
      },
    },
    {
      name: "Generate Quiz (OpenRouter AI)",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [960, 180],
      parameters: { jsCode:`
// FIXED: Removed executeCommand Command Injection vulnerability. Using spawnSync directly with arguments array.
const cp = require('child_process');
const lec = $('Parse Queue').first().json.lecture;
if (!lec.primary_pdf_path || lec.primary_pdf_path === 'null') {
  return [{ json: { stdout: '{"success":false,"reason":"no_file"}' } }];
}
try {
  const rs = cp.spawnSync('node', [
    'automation/gemini/generate_quiz_api.js', 
    lec.primary_pdf_path, 
    lec.course_name, 
    lec.lecture_title, 
    lec.can_use_gemini
  ], { cwd: '${ROOT}', encoding: 'utf8', timeout: 200000 });
  
  return [{ json: { stdout: rs.stdout || '{"success":false,"reason":"playwright_crash"}' } }];
} catch(e) {
  return [{ json: { stdout: '{"success":false,"reason":"playwright_crash"}' } }];
}
      `},
    },
    {
      name: "Parse Quiz",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1180, 180],
      parameters: { jsCode:`
const raw = ($input.first().json.stdout || '').trim();
let quiz = { success:false, quizText:'', ytQuery:'' };
try { quiz = JSON.parse(raw); } catch(e) {}
const lec = $('Parse Queue').first().json.lecture;

return [{ json:{ ...lec, quizText:quiz.quizText||'', quizOk:quiz.success, geminiQuery: quiz.ytQuery||'' } }];
      `},
    },
    {
      name: "Search YouTube",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1400, 180],
      parameters: {
        method:"GET",
        url:"https://www.googleapis.com/youtube/v3/search",
        sendQuery:true,
        queryParameters:{ parameters:[
          { name:"part", value:"snippet" },
          { name:"q", value:`={{ $('Parse Quiz').first().json.geminiQuery || ($('Parse Queue').first().json.lecture.lecture_title + ' شرح ' + ($('Parse Queue').first().json.lecture.course_name_ar || $('Parse Queue').first().json.lecture.course_name || '')) }}` },
          { name:"type", value:"video" },
          { name:"relevanceLanguage", value:"ar" },
          { name:"maxResults", value:"5" },
          { name:"key", value:YT_KEY },
        ]},
      },
    },
    {
      name: "Pick Best Video",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1620, 180],
      parameters: { jsCode:`
const lec   = $('Parse Quiz').first().json;
const items = ($input.first().json.items || []);
let url   = lec.youtube_url || null;
let ytTitle = '';
if (!url) {
  const best = items.find(i => i.id?.videoId);
  if (best) {
    url     = 'https://www.youtube.com/watch?v=' + best.id.videoId;
    ytTitle = best.snippet?.title || '';
  }
}
return [{ json:{ ...lec, youtubeUrl:url, youtubeTitle:ytTitle } }];
      `},
    },
    {
      name: "Create Lesson on Website",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1840, 180],
      parameters: {
        method:"POST",
        url:`${WEBSITE}/api/n8n/ingest-lecture`,
        sendHeaders:true,
        headerParameters:{ parameters:[
          { name:"x-n8n-secret", value:SECRET },
          { name:"Content-Type", value:"application/json" },
        ]},
        sendBody:true, contentType:"json",
        options: { allowUnauthorizedCerts: true, ignoreResponseCode: true },
        body:{
          courseCode:    "={{ $('Pick Best Video').first().json.course_code }}",
          courseName:    "={{ $('Pick Best Video').first().json.course_name }}",
          lectureTitle:  "={{ $('Pick Best Video').first().json.lecture_title }}",
          lectureNumber: "={{ $('Pick Best Video').first().json.lecture_number }}",
          instructor:    "={{ $('Pick Best Video').first().json.instructor }}",
          youtubeUrl:    "={{ $('Pick Best Video').first().json.youtubeUrl }}",
          quizText:      "={{ $('Pick Best Video').first().json.quizText }}",
          lectureId:     "={{ $('Pick Best Video').first().json.id }}",
        },
      },
    },
    {
      name: "Check Website Success",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [2060, 180],
      parameters: {
        conditions: { conditions:[{
          leftValue:"={{ $json.success }}",
          rightValue:true,
          operator:{ type:"boolean", operation:"equals" }
        }]}
      },
    },
    {
      name: "Mark Done",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [2280, 80],
      parameters: {
        command:`cd "${ROOT}" && node automation/scripts/queue_manager.js done "={{ $('Pick Best Video').first().json.id }}"`,
      },
    },
    {
      name: "Mark Failed",
      type: "n8n-nodes-base.executeCommand",
      typeVersion: 1,
      position: [2280, 280],
      parameters: {
        command:`cd "${ROOT}" && node automation/scripts/queue_manager.js fail "={{ $('Pick Best Video').first().json.id }}" "website_api_error"`,
      },
    },
  ],
  connections: {
    "Every 15 Minutes":               { main:[[{ node:"Pick Next from Queue",           type:"main", index:0 }]] },
    "Pick Next from Queue":           { main:[[{ node:"Parse Queue",                    type:"main", index:0 }]] },
    "Parse Queue":                    { main:[[{ node:"Queue Empty?",                   type:"main", index:0 }]] },
    "Queue Empty?":                   { main:[[{ node:"Generate Quiz (OpenRouter AI)", type:"main", index:0 }],[]] },
    "Generate Quiz (OpenRouter AI)": { main:[[{ node:"Parse Quiz",                     type:"main", index:0 }]] },
    "Parse Quiz":                     { main:[[{ node:"Search YouTube",                 type:"main", index:0 }]] },
    "Search YouTube":                 { main:[[{ node:"Pick Best Video",                type:"main", index:0 }]] },
    "Pick Best Video":                { main:[[{ node:"Create Lesson on Website",       type:"main", index:0 }]] },
    "Create Lesson on Website":       { main:[[{ node:"Check Website Success",          type:"main", index:0 }]] },
    "Check Website Success":          { main:[
      [{ node:"Mark Done",   type:"main", index:0 }],
      [{ node:"Mark Failed", type:"main", index:0 }]
    ] },
  },
};

// ═══════════════════════════════════════════
// WORKFLOW 2 — Website Upload Webhook
// ═══════════════════════════════════════════
const uploadWF = {
  name: "📤 Science Hub — Upload Webhook",
  active: true,
  nodes: [
    {
      name: "Receive Upload",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [80, 300],
      parameters: { httpMethod:"POST", path:"website-upload", responseMode:"responseNode" },
      webhookId: "website-upload",
    },
    {
      name: "Validate + Save PDF",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [300, 300],
      parameters: { jsCode:`
const secret = $input.first().json.headers?.['x-n8n-secret'];
if (secret !== ${JSON.stringify(SECRET)}) throw new Error('Unauthorized');

const body = $input.first().json.body;
const { fileName, pdfUrl, courseCode, courseName, courseNameAr,
        instructor, lectureNumber, lectureTitle } = body;
if (!pdfUrl || !courseCode) throw new Error('Missing fields');

const fs     = require('fs');
const path   = require('path');
const subdir = courseCode.toLowerCase().replace(/[^a-z0-9]/g,'');
const dir    = path.join('${ROOT}','automation','downloads',subdir);
fs.mkdirSync(dir, { recursive:true });

// SECURITY: Sanitize fileName to prevent Path Traversal
const safeName = path.basename(fileName || ('upload_'+Date.now()+'.pdf'));
const dest   = path.join(dir, safeName);

// SECURITY: Prevent SSRF by validating URL protocol and hostname
const parsedUrl = new URL(pdfUrl);
const blockedIps = /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^169\.254\./;
if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname === 'localhost' || blockedIps.test(parsedUrl.hostname)) {
  throw new Error('Invalid or blocked URL provided for download');
}

const https = require('https');
await new Promise((resolve, reject) => {
  https.get(parsedUrl, (res) => {
    if (res.statusCode !== 200) return reject(new Error('Download HTTP status ' + res.statusCode));
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => { file.close(); resolve(); });
  }).on('error', reject);
});

const sizeMB   = fs.statSync(dest).size / 1024 / 1024;
const canGemini = sizeMB <= 50.0;

return [{ json:{ ...body, pdfPath:dest, canGemini, saved:true } }];
      `},
    },
    {
      name: "Add to Queue (Supabase)",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [520, 300],
      parameters: { jsCode:`
const b = $input.first().json;
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('${SUPABASE_URL}', '${SUPABASE_KEY}');

const entry = {
  status:       'pending',
  source:       'website_upload',
  course_code:  b.courseCode,
  course_name:  b.courseName || b.courseCode,
  course_name_ar: b.courseNameAr || '',
  instructor:   b.instructor || null,
  lecture_number: parseInt(b.lectureNumber) || Date.now(),
  lecture_title: b.lectureTitle || (b.courseCode + ' Upload'),
  primary_pdf_path: b.pdfPath,
  primary_pdf_type: 'upload',
  can_use_gemini: b.canGemini,
  youtube_url:  null,
  youtube_from_telegram: false,
  telegram_msg_ids: [],
  added_at:     new Date().toISOString()
};

const { data, error } = await supabase.from('automation_queue').insert(entry).select('id').single();
if (error) throw new Error('Database Error: ' + error.message);

// Fetch remaining position approximation
const { count } = await supabase.from('automation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');

return [{ json:{ success:true, queueId: data.id, position: count } }];
      `},
    },
    {
      name: "Respond",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [740, 300],
      parameters: {
        respondWith:"json",
        responseBody: '={"success":true,"message":"Added to queue. Will be processed in ~{{ Math.ceil($json.position * 15) }} minutes.","position":{{ $json.position }}}',
      },
    },
  ],
  connections: {
    "Receive Upload":    { main:[[{ node:"Validate + Save PDF", type:"main", index:0 }]] },
    "Validate + Save PDF":{ main:[[{ node:"Add to Queue (Supabase)",       type:"main", index:0 }]] },
    "Add to Queue (Supabase)":      { main:[[{ node:"Respond",             type:"main", index:0 }]] },
  },
};

const w1 = await api('/workflows', processorWF);
await activate(w1.id);
console.log(`✅ Processor workflow created — ID: ${w1.id}`);

const w2 = await api('/workflows', uploadWF);
await activate(w2.id);
console.log(`✅ Upload webhook created  — ID: ${w2.id}`);

console.log('\\n🎉 Done. Open http://localhost:5678 to see your workflows.');
console.warn('\\n⚠️  IMPORTANT: For the Upload Webhook to work, you MUST set the environment variable');
console.warn('   NODE_FUNCTION_ALLOW_BUILTIN=fs,path,crypto,child_process,https');
console.warn('   on your n8n server container. Otherwise, the custom code nodes will fail.');
