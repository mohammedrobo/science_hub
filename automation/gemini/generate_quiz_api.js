/**
 * Science Hub — Quiz Generator (OpenRouter + HuggingFace Fallback)
 * 
 * Pipeline: Extract PDF text → YouTube suggestion → Quiz generation
 * Primary: DeepSeek via OpenRouter
 * Fallback: DeepSeek via HuggingFace
 * If both fail for quiz: still return YouTube suggestion
 * 
 * Usage: node generate_quiz_api.js <pdfPath> <courseCode> <lectureTitle> <canUseGemini>
 * Output: JSON { success, quizText, ytQuery }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const [,, rawPdfPath, courseArgs, titleArgs, canUseGemini] = process.argv;

const pdfPath = rawPdfPath;
const course = courseArgs || 'General';
const title = titleArgs || 'Lecture';

// ── Load API keys from .env (skip comment lines) ──
const envPath = path.join(__dirname, '..', '.env');
let OPENROUTER_KEY = '';
let HUGGINGFACE_KEY = '';
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#') || t.startsWith('//')) continue;
    if (t.startsWith('OPENROUTER_API_KEY=')) OPENROUTER_KEY = t.split('=')[1].trim();
    if (t.startsWith('HUGGINGFACE_API_KEY=')) HUGGINGFACE_KEY = t.split('=')[1].trim();
  }
}

function out(data) { console.log(JSON.stringify(data)); }
function err(msg) { console.error(msg); }

// ── Extract text from PDF using pdftotext ──
function extractPdfText(filePath) {
  try {
    const text = execSync(`pdftotext "${filePath}" -`, { maxBuffer: 10 * 1024 * 1024 }).toString();
    if (text.trim().length > 50) return text.trim();
  } catch (e) {
    err(`⚠️  pdftotext failed: ${e.message}`);
  }
  // Fallback: crude binary text extraction
  try {
    const raw = fs.readFileSync(filePath, 'latin1');
    const matches = raw.match(/\(([^)]{2,})\)/g);
    if (matches) return matches.map(m => m.slice(1, -1)).join(' ').slice(0, 8000);
  } catch (e) { /* ignore */ }
  return '';
}

// ── Generic HTTPS POST helper ──
function httpPost(hostname, apiPath, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path: apiPath, method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Provider 1: OpenRouter (DeepSeek) ──
async function callOpenRouter(messages) {
  if (!OPENROUTER_KEY) throw new Error('No OpenRouter key');
  err('  🔗 Trying OpenRouter (DeepSeek)...');
  const res = await httpPost('openrouter.ai', '/api/v1/chat/completions', {
    'Authorization': `Bearer ${OPENROUTER_KEY}`,
    'HTTP-Referer': 'https://minia-science-hub.vercel.app',
  }, {
    model: 'deepseek/deepseek-chat-v3-0324',
    messages,
    max_tokens: 4096,
    temperature: 0.3,
  });
  if (res.error) throw new Error(`OpenRouter: ${res.error.message || JSON.stringify(res.error)}`);
  return res.choices?.[0]?.message?.content || '';
}

// ── Provider 2: HuggingFace (DeepSeek) ──
async function callHuggingFace(messages) {
  if (!HUGGINGFACE_KEY) throw new Error('No HuggingFace key');
  err('  🤗 Trying HuggingFace (DeepSeek)...');
  const res = await httpPost('api-inference.huggingface.co', '/models/deepseek-ai/DeepSeek-V3-0324/v1/chat/completions', {
    'Authorization': `Bearer ${HUGGINGFACE_KEY}`,
  }, {
    model: 'deepseek-ai/DeepSeek-V3-0324',
    messages,
    max_tokens: 4096,
    temperature: 0.3,
  });
  if (res.error) throw new Error(`HuggingFace: ${res.error || JSON.stringify(res)}`);
  return res.choices?.[0]?.message?.content || '';
}

// ── Smart caller: tries OpenRouter first, then HuggingFace ──
async function callAI(messages) {
  // Try OpenRouter first
  try {
    const result = await callOpenRouter(messages);
    if (result && result.length > 10) return result;
  } catch (e) {
    err(`  ❌ OpenRouter failed: ${e.message}`);
  }
  // Fallback to HuggingFace
  try {
    const result = await callHuggingFace(messages);
    if (result && result.length > 10) return result;
  } catch (e) {
    err(`  ❌ HuggingFace failed: ${e.message}`);
  }
  return null;
}

async function run() {
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    out({ success: false, quizText: '', ytQuery: '', reason: 'no_pdf' });
    return;
  }

  const sizeMB = fs.statSync(pdfPath).size / 1024 / 1024;
  if (sizeMB > 200) {
    out({ success: false, quizText: '', ytQuery: '', reason: `pdf_too_large_${sizeMB.toFixed(1)}mb` });
    return;
  }

  if (canUseGemini === 'false') {
    err('⚠️ canUseGemini=false (file > 50MB). Continuing with OpenRouter/HuggingFace anyway.');
  }

  if (!OPENROUTER_KEY && !HUGGINGFACE_KEY) {
    out({ success: false, quizText: '', ytQuery: '', reason: 'no_api_keys' });
    return;
  }

  // ── Step 0: Extract text from PDF ──
  err('📄 Extracting text from PDF...');
  const pdfText = extractPdfText(pdfPath);
  if (!pdfText || pdfText.length < 50) {
    out({ success: false, quizText: '', ytQuery: '', reason: 'pdf_text_extraction_failed' });
    return;
  }
  // Truncate to ~6000 chars to fit in context window
  const truncatedText = pdfText.slice(0, 6000);
  err(`✅ Extracted ${pdfText.length} chars (using first ${truncatedText.length})`);

  let ytQuery = '';
  let quizText = '';

  // ── Step 1: YouTube suggestion (PRIORITY - do this first!) ──
  err('🎬 Step 1: Asking AI for YouTube search suggestion...');
  const ytMessages = [
    { role: 'system', content: 'You are a helpful assistant. Output ONLY what is asked, nothing else.' },
    { role: 'user', content: `I have this university lecture content:\n\nCourse: ${course}\nLecture: ${title}\n\nHere is a snippet of the lecture content:\n${truncatedText.slice(0, 2000)}\n\nWhat is the best, concise Arabic search phrase to find an educational YouTube video that explains exactly this topic? Output ONLY the Arabic search query, absolutely nothing else.` }
  ];

  const ytResult = await callAI(ytMessages);
  if (ytResult) {
    ytQuery = ytResult.trim().replace(/^["']|["']$/g, '');
    err(`✅ YouTube query: ${ytQuery}`);
  } else {
    err('⚠️  Could not generate YouTube query from any provider');
  }

  // ── Step 2: Quiz generation ──
  err('📝 Step 2: Generating quiz...');
  const quizMessages = [
    { role: 'system', content: 'You are an expert university quiz maker. Output ONLY the quiz in plain text. No markdown, no bold, no headers, no bullet points, no dashes before options. Follow the exact format shown.' },
    { role: 'user', content: `I have this university lecture and I want you to generate a quiz based ONLY on this content.

Course: ${course}
Lecture: ${title}

Lecture content:
${truncatedText}

Generate exactly 10 Multiple Choice Questions and 10 True/False Questions.
If the content is in Arabic, write the quiz in Arabic. If English, use English.

You MUST follow this EXACT plain text format with NO deviations:

1. What is the main topic discussed in this lecture?
a) Option A text
b) Option B text
c) Option C text
d) Option D text
Answer: b

2. Which of the following is correct?
a) Option A text
b) Option B text
c) Option C text
d) Option D text
Answer: c

11. The earth revolves around the sun.
Answer: True

12. Water boils at 50 degrees Celsius.
Answer: False

CRITICAL RULES:
- Number questions 1 through 20 continuously (1-10 for MCQ, 11-20 for True/False)
- Use a) b) c) d) for MCQ options (lowercase letter followed by closing parenthesis)
- Put "Answer: " followed by the correct letter (for MCQ) or True/False on its own line after each question
- Do NOT use any markdown formatting (no **, no ##, no -, no bullets)
- Do NOT add any introduction, headers, or closing remarks
- Every question must come from the lecture content
- Mix difficulty: 40% easy, 40% medium, 20% hard
- All 4 MCQ options must be plausible` }
  ];

  const quizResult = await callAI(quizMessages);
  if (quizResult && quizResult.length > 200) {
    quizText = quizResult;
    err(`✅ Quiz generated: ${quizText.length} characters`);
  } else {
    err('⚠️  Could not generate quiz from any provider');
  }

  // ── Output result ──
  out({
    success: !!(ytQuery || quizText),
    quizText: quizText || '',
    ytQuery: ytQuery || '',
    reason: (!ytQuery && !quizText) ? 'all_providers_failed' : undefined,
  });
}

run();
