/**
 * Science Hub — Quiz Generator (OpenRouter only)
 * 
 * Pipeline: Extract PDF text → YouTube suggestion → Quiz generation
 * Primary: DeepSeek via OpenRouter
 * If it fails for quiz: still return YouTube suggestion
 * 
 * Usage (positional):
 *   node generate_quiz_api.js <pdfPath> <courseCode> <lectureTitle>
 * Usage (flags):
 *   node generate_quiz_api.js --json --primary_pdf_path <pdfPath> --course_code <courseCode> --lecture_title <lectureTitle>
 * Output: JSON { success, quizText, ytQuery }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

const argv = process.argv.slice(2);
let rawPdfPath = '';
let courseArgs = '';
let titleArgs = '';

if (argv.length && !argv[0].startsWith('--')) {
  // Positional mode
  [rawPdfPath, courseArgs, titleArgs] = argv;
} else {
  // Flag mode
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') continue;
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    const val = (next && !next.startsWith('--')) ? next : '';
    if (val && next && !next.startsWith('--')) i++;
    switch (key) {
      case 'primary_pdf_path':
        rawPdfPath = val;
        break;
      case 'course_code':
        courseArgs = val;
        break;
      case 'lecture_title':
        titleArgs = val;
        break;
      default:
        break;
    }
  }
}

const pdfPath = rawPdfPath;
const course = courseArgs || 'General';
const title = titleArgs || 'Lecture';

// ── Load API keys from .env (skip comment lines) ──
const envPath = path.join(__dirname, '..', '.env');
let OPENROUTER_KEY = '';
let OPENROUTER_KEYS = [];
const OPENROUTER_OVERRIDE = process.env.OPENROUTER_API_KEY_OVERRIDE || '';
let YOUTUBE_KEY = '';
let YOUTUBE_KEYS = [];
let YOUTUBE_REGION = 'EG';
let YOUTUBE_LANG = 'ar';
let YOUTUBE_REGION_FALLBACKS = '';
let OPENROUTER_MODEL = 'stepfun/step-3.5-flash';
let YT_MAX_TOKENS = 256;
let QUIZ_MCQ_COUNT = 10;
let QUIZ_TF_COUNT = 10;
let QUIZ_MAX_TOKENS = 1800;
let QUIZ_MCQ_MAX_TOKENS = 1200;
let QUIZ_TF_MAX_TOKENS = 600;
let QUIZ_RETRY_MAX_TOKENS = 1200;
let OCR_ENABLED = '1';
let OCR_LANGS = 'ara+eng';
let OCR_TIMEOUT_MS = 900000;
let OCR_MAX_PAGES = 25;
let OCR_DPI = 400;
let OCR_PSM = 3;
let OCR_OEM = 1;
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#') || t.startsWith('//')) continue;
    if (t.startsWith('OPENROUTER_API_KEY=')) OPENROUTER_KEY = t.split('=')[1].trim();
    if (t.startsWith('OPENROUTER_API_KEYS=')) {
      OPENROUTER_KEYS = t.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
    }
    if (t.startsWith('YOUTUBE_API_KEY=')) YOUTUBE_KEY = t.split('=')[1].trim().replace(/^"|"$/g, '');
    if (t.startsWith('YOUTUBE_API_KEYS=')) {
      YOUTUBE_KEYS = t.split('=')[1]
        .split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
    }
    if (t.startsWith('YOUTUBE_REGION=')) YOUTUBE_REGION = t.split('=')[1].trim();
    if (t.startsWith('YOUTUBE_LANG=')) YOUTUBE_LANG = t.split('=')[1].trim();
    if (t.startsWith('YOUTUBE_REGION_FALLBACKS=')) YOUTUBE_REGION_FALLBACKS = t.split('=')[1].trim();
    if (t.startsWith('OPENROUTER_MODEL=')) OPENROUTER_MODEL = t.split('=')[1].trim();
    if (t.startsWith('YT_MAX_TOKENS=')) YT_MAX_TOKENS = Number(t.split('=')[1].trim() || 256);
    if (t.startsWith('QUIZ_MCQ_COUNT=')) QUIZ_MCQ_COUNT = Number(t.split('=')[1].trim() || 10);
    if (t.startsWith('QUIZ_TF_COUNT=')) QUIZ_TF_COUNT = Number(t.split('=')[1].trim() || 10);
    if (t.startsWith('QUIZ_MAX_TOKENS=')) QUIZ_MAX_TOKENS = Number(t.split('=')[1].trim() || 1800);
    if (t.startsWith('QUIZ_MCQ_MAX_TOKENS=')) QUIZ_MCQ_MAX_TOKENS = Number(t.split('=')[1].trim() || 1200);
    if (t.startsWith('QUIZ_TF_MAX_TOKENS=')) QUIZ_TF_MAX_TOKENS = Number(t.split('=')[1].trim() || 600);
    if (t.startsWith('QUIZ_RETRY_MAX_TOKENS=')) QUIZ_RETRY_MAX_TOKENS = Number(t.split('=')[1].trim() || 1200);
    if (t.startsWith('OCR_ENABLED=')) OCR_ENABLED = t.split('=')[1].trim();
    if (t.startsWith('OCR_LANGS=')) OCR_LANGS = t.split('=')[1].trim();
    if (t.startsWith('OCR_TIMEOUT_MS=')) OCR_TIMEOUT_MS = Number(t.split('=')[1].trim() || 600000);
    if (t.startsWith('OCR_MAX_PAGES=')) OCR_MAX_PAGES = Number(t.split('=')[1].trim() || 12);
    if (t.startsWith('OCR_DPI=')) OCR_DPI = Number(t.split('=')[1].trim() || 200);
    if (t.startsWith('OCR_PSM=')) OCR_PSM = Number(t.split('=')[1].trim() || 6);
    if (t.startsWith('OCR_OEM=')) OCR_OEM = Number(t.split('=')[1].trim() || 1);
  }
}
OCR_ENABLED = String(process.env.OCR_ENABLED || OCR_ENABLED).trim();
OCR_LANGS = String(process.env.OCR_LANGS || OCR_LANGS).trim() || 'ara+eng';
OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || OCR_TIMEOUT_MS || 600000);
OCR_MAX_PAGES = Number(process.env.OCR_MAX_PAGES || OCR_MAX_PAGES || 12);
OCR_DPI = Number(process.env.OCR_DPI || OCR_DPI || 200);
OCR_PSM = Number(process.env.OCR_PSM || OCR_PSM || 6);
OCR_OEM = Number(process.env.OCR_OEM || OCR_OEM || 1);
YT_MAX_TOKENS = Number(process.env.YT_MAX_TOKENS || YT_MAX_TOKENS || 256);
QUIZ_MCQ_COUNT = Number(process.env.QUIZ_MCQ_COUNT || QUIZ_MCQ_COUNT || 10);
QUIZ_TF_COUNT = Number(process.env.QUIZ_TF_COUNT || QUIZ_TF_COUNT || 10);
QUIZ_MAX_TOKENS = Number(process.env.QUIZ_MAX_TOKENS || QUIZ_MAX_TOKENS || 1800);
QUIZ_MCQ_MAX_TOKENS = Number(process.env.QUIZ_MCQ_MAX_TOKENS || QUIZ_MCQ_MAX_TOKENS || 1200);
QUIZ_TF_MAX_TOKENS = Number(process.env.QUIZ_TF_MAX_TOKENS || QUIZ_TF_MAX_TOKENS || 600);
QUIZ_RETRY_MAX_TOKENS = Number(process.env.QUIZ_RETRY_MAX_TOKENS || QUIZ_RETRY_MAX_TOKENS || 1200);
YOUTUBE_REGION_FALLBACKS = String(process.env.YOUTUBE_REGION_FALLBACKS || YOUTUBE_REGION_FALLBACKS || '').trim();
if (process.env.YOUTUBE_API_KEY && !YOUTUBE_KEY) {
  YOUTUBE_KEY = String(process.env.YOUTUBE_API_KEY).trim().replace(/^"|"$/g, '');
}
if (process.env.YOUTUBE_API_KEYS) {
  const extra = String(process.env.YOUTUBE_API_KEYS)
    .split(',')
    .map(s => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
  YOUTUBE_KEYS = [...YOUTUBE_KEYS, ...extra];
}

function getYouTubeKeys() {
  const keys = [];
  if (YOUTUBE_KEY) keys.push(YOUTUBE_KEY);
  if (YOUTUBE_KEYS && YOUTUBE_KEYS.length) {
    for (const k of YOUTUBE_KEYS) if (k) keys.push(k);
  }
  return [...new Set(keys.filter(Boolean))];
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

function readSidecarText(filePath) {
  try {
    const base = filePath.replace(/\.[^/.]+$/, '');
    const txtPath = `${base}.txt`;
    if (!fs.existsSync(txtPath)) return null;
    const raw = fs.readFileSync(txtPath, 'utf-8');
    const cleaned = raw.replace(/^\uFEFF/, '').trim();
    return cleaned || null;
  } catch (e) {
    err(`⚠️  sidecar .txt read failed: ${e.message}`);
    return null;
  }
}

function hasCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isLowQualityText(text) {
  if (!text) return true;
  const alphaCount = (text.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
  const alphaRatio = alphaCount / Math.max(text.length, 1);
  return (text.length < 400) || (alphaRatio < 0.12);
}

function getTextQualityStats(text) {
  if (!text) return { len: 0, alphaRatio: 0 };
  const alphaCount = (text.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
  const alphaRatio = alphaCount / Math.max(text.length, 1);
  return { len: text.length, alphaRatio };
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildContext(text, maxChars = 9000) {
  const clean = normalizeText(text);
  if (clean.length <= maxChars) return clean;
  const sliceLen = Math.floor(maxChars / 3);
  const head = clean.slice(0, sliceLen);
  const midStart = Math.max(0, Math.floor((clean.length - sliceLen) / 2));
  const mid = clean.slice(midStart, midStart + sliceLen);
  const tail = clean.slice(Math.max(0, clean.length - sliceLen));
  return `${head}\n...\n${mid}\n...\n${tail}`;
}

function getSubjectLabel(courseCode) {
  const code = String(courseCode || '').toUpperCase();
  switch (code) {
    case 'B101': return 'Botany';
    case 'C102': return 'Chemistry';
    case 'C104': return 'Chemistry Practical';
    case 'COMP101': return 'Computer Science';
    case 'G102': return 'Geology';
    case 'M102': return 'Mathematics';
    case 'P102': return 'Physics';
    case 'P104': return 'Physics Practical';
    case 'Z102': return 'Zoology';
    default: return 'Science';
  }
}

function getSubjectLabelArabic(courseCode) {
  const code = String(courseCode || '').toUpperCase();
  switch (code) {
    case 'B101': return 'علم النبات';
    case 'C102': return 'الكيمياء العامة';
    case 'C104': return 'الكيمياء العملية';
    case 'COMP101': return 'علوم الحاسب';
    case 'G102': return 'الجيولوجيا';
    case 'M102': return 'الرياضيات';
    case 'P102': return 'الفيزياء العامة';
    case 'P104': return 'فيزياء عملية';
    case 'Z102': return 'علم الحيوان';
    default: return 'العلوم';
  }
}

function normalizeQuizFormat(text) {
  if (!text) return text;
  let t = stripCodeFences(String(text));
  // Normalize question numbering to "1. "
  t = t.replace(/^\s*Q\s*(\d+)\s*[:\).\-]\s*/gmi, '$1. ');
  t = t.replace(/^\s*(\d+)\s*[\)\-:]\s*/gm, '$1. ');
  // Normalize options to "a) "
  t = t.replace(/^\s*([ABCD])\s*[\)\.\-:]\s*/gm, (_m, p1) => `${String(p1).toLowerCase()}) `);
  return t.trim();
}

function splitQuizBlocks(text) {
  if (!text) return [];
  const lines = String(text).trim().split(/\r?\n/);
  const blocks = [];
  let current = [];
  const qStart = /^\s*(?:Q\s*)?\d+\s*[\.\)\-:]\s+/i;
  for (const line of lines) {
    if (qStart.test(line) && current.length) {
      blocks.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join('\n').trim());
  return blocks.filter(Boolean);
}

function renumberBlocks(blocks, startIndex = 1) {
  let idx = startIndex;
  return blocks.map((b) =>
    b.replace(/^\s*(?:Q\s*)?\d+\s*[\.\)\-:]\s+/i, () => `${idx++}. `).trim()
  );
}

function runOcr(filePath) {
  if (String(OCR_ENABLED).toLowerCase() === '0') return null;
  if (!hasCommand('ocrmypdf')) {
    err('⚠️  ocrmypdf not installed. Falling back to pdftoppm + tesseract...');
    return runOcrWithTesseract(filePath);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocrpdf-'));
  const outPdf = path.join(tmpDir, 'ocr.pdf');
  const sidecar = path.join(tmpDir, 'ocr.txt');

  err('🧠 OCR: running ocrmypdf...');
  const result = spawnSync('ocrmypdf', [
    '--skip-text',
    '--force-ocr',
    '--sidecar', sidecar,
    '--rotate-pages',
    '--deskew',
    '--remove-background',
    '--clean',
    '--no-tesseract-downsample-large-images',
    '--oversample', String(OCR_DPI || 200),
    '--tesseract-pagesegmode', String(OCR_PSM || 6),
    '--tesseract-oem', String(OCR_OEM || 1),
    '-l', OCR_LANGS,
    filePath,
    outPdf,
  ], {
    encoding: 'utf-8',
    timeout: OCR_TIMEOUT_MS || 600000,
  });

  if (result.error) {
    err(`⚠️  OCR failed: ${result.error.message}`);
    return null;
  }
  if (result.status !== 0) {
    err(`⚠️  OCR exited with code ${result.status}`);
    if (result.stderr) err(result.stderr.slice(0, 500));
    return null;
  }

  let text = '';
  if (fs.existsSync(sidecar)) {
    try { text = fs.readFileSync(sidecar, 'utf-8'); } catch { /* ignore */ }
  }
  if (!text || text.trim().length < 50) {
    text = extractPdfText(outPdf);
  }

  return { text: text || '', ocrPdfPath: outPdf };
}

function runOcrWithTesseract(filePath) {
  if (!hasCommand('pdftoppm') || !hasCommand('tesseract')) {
    err('⚠️  OCR fallback skipped: pdftoppm or tesseract not installed.');
    return null;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocrtess-'));
  const prefix = path.join(tmpDir, 'page');
  const maxPages = Math.max(1, Math.min(Number(OCR_MAX_PAGES || 12), 40));
  const dpi = Math.max(100, Math.min(Number(OCR_DPI || 200), 300));

  err(`🧠 OCR fallback: rendering first ${maxPages} pages at ${dpi} DPI...`);
  const render = spawnSync('pdftoppm', [
    '-f', '1',
    '-l', String(maxPages),
    '-r', String(dpi),
    '-png',
    filePath,
    prefix,
  ], { encoding: 'utf-8', timeout: OCR_TIMEOUT_MS || 600000 });

  if (render.error || render.status !== 0) {
    err(`⚠️  pdftoppm failed: ${render.error ? render.error.message : `exit ${render.status}`}`);
    return null;
  }

  const images = fs.readdirSync(tmpDir)
    .filter(f => f.startsWith('page-') && f.endsWith('.png'))
    .map(f => path.join(tmpDir, f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (!images.length) return null;

  let text = '';
  for (const img of images) {
    const ocr = spawnSync('tesseract', [
      img,
      'stdout',
      '-l', OCR_LANGS,
      '--dpi', String(dpi),
      '--psm', String(OCR_PSM || 6),
      '--oem', String(OCR_OEM || 1),
    ], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: OCR_TIMEOUT_MS || 600000 });

    if (ocr.error || ocr.status !== 0) continue;
    if (ocr.stdout) text += `\n${ocr.stdout}`;
  }

  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  return { text: text.trim() || '' };
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
function getOpenRouterKeys() {
  const keys = [];
  if (OPENROUTER_OVERRIDE) keys.push(OPENROUTER_OVERRIDE);
  if (OPENROUTER_KEY) keys.push(OPENROUTER_KEY);
  if (OPENROUTER_KEYS && OPENROUTER_KEYS.length) {
    for (const k of OPENROUTER_KEYS) {
      if (k) keys.push(k);
    }
  }
  return [...new Set(keys.filter(Boolean))];
}

function hashString(value) {
  const str = String(value || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function orderKeysBySeed(keys, seed) {
  if (!keys.length) return [];
  const idx = hashString(seed) % keys.length;
  return keys.slice(idx).concat(keys.slice(0, idx));
}

async function callOpenRouterWithKey(apiKey, messages, opts = {}) {
  if (!apiKey) throw new Error('No OpenRouter key');
  err(`  🔗 Trying OpenRouter (${OPENROUTER_MODEL})...`);
  const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.3;
  const max_tokens = typeof opts.max_tokens === 'number' ? opts.max_tokens : 4096;
  const res = await httpPost('openrouter.ai', '/api/v1/chat/completions', {
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://minia-science-hub.vercel.app',
  }, {
    model: OPENROUTER_MODEL,
    messages,
    max_tokens,
    temperature,
  });
  if (res.error) throw new Error(`OpenRouter: ${res.error.message || JSON.stringify(res.error)}`);
  return res.choices?.[0]?.message?.content || '';
}

// ── Smart caller: OpenRouter only ──
async function callAI(messages, opts = {}) {
  const baseKeys = getOpenRouterKeys();
  const keys = OPENROUTER_OVERRIDE
    ? baseKeys
    : orderKeysBySeed(baseKeys, `${pdfPath}|${course}|${title}`);
  for (const key of keys) {
    try {
      const result = await callOpenRouterWithKey(key, messages, opts);
      if (result && result.length > 10) return result;
    } catch (e) {
      err(`  ❌ OpenRouter failed: ${e.message}`);
    }
  }
  return null;
}

function stripCodeFences(text) {
  if (!text) return text;
  const t = String(text).trim();
  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();
  return t;
}

function extractJsonSubstring(text) {
  if (!text) return null;
  const t = stripCodeFences(text);
  const firstObj = t.indexOf('{');
  const firstArr = t.indexOf('[');
  let start = -1;
  if (firstObj >= 0 && firstArr >= 0) start = Math.min(firstObj, firstArr);
  else start = Math.max(firstObj, firstArr);
  if (start < 0) return null;
  const endObj = t.lastIndexOf('}');
  const endArr = t.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  if (end <= start) return null;
  return t.slice(start, end + 1);
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(stripCodeFences(text));
  } catch {
    try {
      const sub = extractJsonSubstring(text);
      if (sub) return JSON.parse(sub);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeQuery(q) {
  return stripCodeFences(String(q || ''))
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text, max = 4) {
  if (!text) return [];
  const stop = new Set([
    'the','and','for','with','that','this','from','into','onto','over','under','about','between','within','without','while','where','when',
    'your','their','there','these','those','also','more','most','such','using','use','used','than','then','them','been','being','were','was',
    'lecture','lectures','lesson','lessons','chapter','chapters','introduction','intro','notes','slide','slides','pdf','course','courses',
    'faculty','university','department','college','science','first','year','students','student','general',
    'محاضرة','محاضرات','درس','دروس','مقدمة','ملاحظات','شريحة','شرائح','ملخص','كتاب','كورسات','كورس',
    'جامعة','كلية','قسم','علوم','أولى','اولى','طلاب','طالب','عام','عامه','محاضره'
  ]);
  const tokens = String(text)
    .toLowerCase()
    .match(/[a-z\u0600-\u06FF]{3,}/g) || [];
  const freq = new Map();
  for (const tok of tokens) {
    if (stop.has(tok)) continue;
    if (tok.length > 24) continue;
    freq.set(tok, (freq.get(tok) || 0) + 1);
  }
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
  return sorted.slice(0, max);
}

function isGenericQuery(q) {
  const t = String(q || '').toLowerCase();
  if (!t) return true;
  if (/(محاضرة|lecture|lec)\s*\d+/.test(t)) return true;
  if (/\b(b101|c102|p102|m102|comp101|z102|g102|p104|c104)\b/i.test(t)) return true;
  if (/علوم\s*اولى|علوم\s*أولى|first\s*year|science\s*students?/i.test(t)) return true;
  if (/محاضرة\s*عامة|شرح\s*عام|general\s*lecture|intro\s*lecture/i.test(t)) return true;
  return false;
}

function cleanLectureTitle(title) {
  let t = String(title || '').trim();
  t = t.replace(/(?:lecture|lec|محاضرة)\s*\d+/gi, '');
  t = t.replace(/\b(b101|c102|p102|m102|comp101|z102|g102|p104|c104)\b/gi, '');
  t = t.replace(/[^\p{L}\p{N}\s]+/gu, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function buildTopicFromKeywords(keywords) {
  if (!keywords || !keywords.length) return '';
  const uniq = [...new Set(keywords)].filter(Boolean);
  return uniq.slice(0, 3).join(' ');
}

function ensureQueries(queries, title, course, keywords = [], subjectAr = '') {
  const out = [];
  const add = (query) => {
    const q = normalizeQuery(query);
    if (!q) return;
    if (isGenericQuery(q)) return;
    if (out.some(x => x.query === q)) return;
    out.push({ title: '', query: q });
  };
  for (const q of queries || []) add(q?.query || q);
  const topic = buildTopicFromKeywords(keywords);
  const safeTitle = cleanLectureTitle(title);
  const base = normalizeQuery(topic
    ? `${topic} شرح`
    : (safeTitle ? `${safeTitle} شرح ${subjectAr}`.trim() : `شرح ${subjectAr}`.trim())
  );
  add(base);
  add(topic ? `${topic} محاضرة` : (safeTitle ? `${safeTitle} محاضرة ${subjectAr}` : `محاضرة ${subjectAr}`));
  add(topic ? `${topic} شرح مبسط` : (safeTitle ? `${safeTitle} شرح مبسط ${subjectAr}` : `شرح مبسط ${subjectAr}`));
  if (!out.length && subjectAr) add(`شرح ${subjectAr}`);
  return out.slice(0, 2).map((q, i) => ({ title: `Option ${i + 1}`, query: q.query }));
}

function parseYtQueries(ytResult, title, course, keywords = [], subjectAr = '') {
  const parsed = safeJsonParse(ytResult);
  let ytQueries = [];
  let mode = '';

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (typeof parsed.mode === 'string') mode = parsed.mode.toLowerCase().trim();
    if (Array.isArray(parsed.queries)) {
      ytQueries = parsed.queries
        .map(x => ({ title: normalizeQuery(x.title || ''), query: normalizeQuery(x.query || '') }))
        .filter(x => x.query);
    } else if (parsed.query) {
      ytQueries = [{ title: normalizeQuery(parsed.title || ''), query: normalizeQuery(parsed.query) }];
    }
  } else if (Array.isArray(parsed)) {
    ytQueries = parsed
      .map(x => ({ title: normalizeQuery(x.title || ''), query: normalizeQuery(x.query || '') }))
      .filter(x => x.query);
  } else if (ytResult) {
    const q = normalizeQuery(ytResult);
    if (q) ytQueries = [{ title: '', query: q }];
  }

  if (!mode) {
    const titleText = ytQueries.map(q => q.title).join(' ').toLowerCase();
    if (/topic|محور|موضوع/.test(titleText)) mode = 'multi';
    else if (ytQueries.length > 3) mode = 'multi';
  }

  if (mode === 'multi') {
    const out = [];
    for (const q of ytQueries) {
      const query = normalizeQuery(q.query);
      if (!query) continue;
      if (out.some(x => x.query === query)) continue;
      out.push({ title: normalizeQuery(q.title || ''), query });
    }
    if (!out.length) {
      const fallback = normalizeQuery(`${cleanLectureTitle(title)} شرح ${subjectAr}`.trim());
      if (fallback) out.push({ title: 'Part 1', query: fallback });
    }
    return out.slice(0, 7).map((q, i) => ({
      title: q.title || `Part ${i + 1}`,
      query: q.query,
    }));
  }

  if (ytQueries.length === 0 || isGenericQuery(ytQueries[0]?.query)) {
    const fallback = normalizeQuery(`${cleanLectureTitle(title)} شرح ${subjectAr}`.trim());
    if (fallback) ytQueries = [{ title: '', query: fallback }];
  }

  return ensureQueries(ytQueries, title, course, keywords, subjectAr);
}

function isQuotaError(errJson) {
  try {
    const reasons = errJson?.error?.errors?.map(e => e.reason) || [];
    return reasons.some(r =>
      r === 'quotaExceeded' ||
      r === 'dailyLimitExceeded' ||
      r === 'userRateLimitExceeded' ||
      r === 'rateLimitExceeded'
    );
  } catch {
    return false;
  }
}

function extractYouTubeError(errJson) {
  try {
    const err = errJson?.error;
    const reason = err?.errors?.[0]?.reason || '';
    const message = err?.message || '';
    return { reason, message };
  } catch {
    return { reason: '', message: '' };
  }
}

async function ytSearchWithKey(query, apiKey) {
  if (!apiKey || !query) return null;
  const q = normalizeQuery(query);
  if (!q) return null;
  const hasArabic = /[\u0600-\u06FF]/.test(q);
  const regions = [];
  if (YOUTUBE_REGION) regions.push(YOUTUBE_REGION);
  if (YOUTUBE_REGION_FALLBACKS) {
    for (const r of YOUTUBE_REGION_FALLBACKS.split(',')) {
      const t = r.trim();
      if (t) regions.push(t);
    }
  }
  const regionList = [...new Set(regions.filter(Boolean))];
  const candidates = regionList.length ? regionList : [null];

  const doSearch = (regionCode, relaxed = false) => {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '8',
      safeSearch: 'moderate',
      q,
      key: apiKey,
    });
    if (!relaxed) {
      params.set('videoDuration', 'medium');
      params.set('videoEmbeddable', 'true');
    }
    if (hasArabic && YOUTUBE_LANG) params.set('relevanceLanguage', YOUTUBE_LANG);
    if (regionCode) params.set('regionCode', regionCode);

    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (d) => { data += d.toString(); });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, json: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, json: null });
          }
        });
      }).on('error', () => resolve(null));
    });
  };

  for (const regionCode of candidates) {
    const data = await doSearch(regionCode, false);
    if (data?.json?.items?.length) return data.json;
    if (data?.json && isQuotaError(data.json)) return { _quotaExceeded: true };
    if (data?.json?.error) return { _error: extractYouTubeError(data.json) };
  }
  // Relaxed pass: drop duration/embeddable filters
  for (const regionCode of candidates) {
    const data = await doSearch(regionCode, true);
    if (data?.json?.items?.length) return data.json;
    if (data?.json && isQuotaError(data.json)) return { _quotaExceeded: true };
    if (data?.json?.error) return { _error: extractYouTubeError(data.json) };
  }
  return null;
}

async function ytSearch(query) {
  const keys = getYouTubeKeys();
  if (!keys.length || !query) {
    err('⚠️  YouTube API key(s) missing.');
    return null;
  }
  for (const key of keys) {
    const data = await ytSearchWithKey(query, key);
    if (data && data._quotaExceeded) {
      err('⚠️  YouTube quota exceeded for one key. Trying next key...');
      continue;
    }
    if (data && data._error) {
      const r = data._error.reason || 'unknown';
      const m = data._error.message || '';
      err(`⚠️  YouTube API error (${r}): ${m}`);
      continue;
    }
    if (data?.items?.length) return data;
  }
  return null;
}

function pickBestVideo(items, query) {
  if (!items || !items.length) return null;
  const tokens = normalizeQuery(query)
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06FF]+/i)
    .filter(t => t.length >= 3);
  const queryHasArabic = /[\u0600-\u06FF]/.test(query || '');

  const scoreText = (text) => {
    const t = (text || '').toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (t.includes(tok)) score += 2;
    }
    if (/(شرح|محاضرة|lecture|tutorial|explanation)/i.test(t)) score += 3;
    if (/(shorts|music|song|lyrics|meme|gaming|clip|mix)/i.test(t)) score -= 5;
    if (queryHasArabic) {
      if (/[\u0600-\u06FF]/.test(t)) score += 3;
      else score -= 2;
    }
    return score;
  };

  let best = null;
  let bestScore = -999;
  for (const it of items) {
    if (!it?.id?.videoId) continue;
    const title = it.snippet?.title || '';
    const desc = it.snippet?.description || '';
    const score = scoreText(title) + 0.5 * scoreText(desc);
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  if (!best) return null;
  if (bestScore < 2) return null;
  return {
    url: `https://www.youtube.com/watch?v=${best.id.videoId}`,
    title: best.snippet?.title || '',
  };
}

async function buildYoutubeParts(ytQueries) {
  const youtubeParts = [];
  for (const q of ytQueries || []) {
    const search = await ytSearch(q.query);
    const best = pickBestVideo(search?.items || [], q.query);
    if (best?.url) {
      youtubeParts.push({
        title: q.title || best.title || q.query,
        url: best.url,
      });
    }
  }
  return youtubeParts;
}

async function run() {
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    out({ success: false, quizText: '', ytQuery: '', reason: 'no_pdf' });
    return;
  }

  const isPdf = String(pdfPath).toLowerCase().endsWith('.pdf');
  const isPractical = /^(P104|C104)$/i.test(course) || /practical/i.test(course);
  const isCompSci = /^COMP101$/i.test(course) || /computer\s*science/i.test(course);
  const forceSingleTopic = isPractical || isCompSci;
  const subjectLabel = getSubjectLabel(course);
  const subjectLabelAr = getSubjectLabelArabic(course);
  if (!isPdf) {
    // Non-PDF assets (images, etc.) — skip quiz, but try YouTube query from title
    if (getOpenRouterKeys().length) {
      try {
        const ytMessages = [
          { role: 'system', content: `You are a helpful assistant and professor of ${subjectLabel}. Output ONLY valid JSON. Do NOT wrap in code fences. No markdown, no commentary.` },
          { role: 'user', content: `Context: First-year students in the Faculty of Science in Egypt.\nGoal: Find educational Arabic YouTube explanations suitable for first-year science students.\n\nCourse: ${course}\nLecture: ${title}\nSubject (Arabic): ${subjectLabelAr}\n\n` +
            (forceSingleTopic
              ? `This lecture MUST be treated as a SINGLE topic.\nReturn exactly TWO alternative Arabic YouTube search queries.\nReturn JSON: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"}]}\n`
              : `Decide if the lecture covers MULTIPLE distinct topics or a SINGLE coherent topic.\nIf the topics can reasonably be explained in ONE YouTube lecture by a professor, treat it as SINGLE.\nIf it would be taught as multiple videos, treat it as MULTI.\nIf SINGLE: return exactly TWO alternatives (options).\nIf MULTI: return ONE query per topic (no options), MAX 7 topics.\nReturn JSON in ONE of these forms:\n- Single: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"}]}\n- Multi: {\"mode\":\"multi\",\"queries\":[{\"title\":\"Part 1\",\"query\":\"...\"},{\"title\":\"Part 2\",\"query\":\"...\"}]}\n`) +
            `STRICT RULES:\n` +
            `- Queries MUST be Arabic and for educational explanations (شرح/محاضرة).\n` +
            `- NEVER mention PDF/file/format/stream/object/endobj/xref/document or any file-format terms.\n` +
            `- If the title is generic, use the subject name.\n` +
            `- Avoid music, shorts, memes, gaming, or entertainment.\n` +
            `STRICT RESPONSE FORMAT (MUST FOLLOW EXACTLY):\n` +
            `- Return ONE JSON object only. No code fences, no markdown, no commentary.\n` +
            `- JSON must start with { and end with }.\n` +
            `- Use double quotes for ALL keys and strings.\n` +
            `- Do NOT include any extra keys or text outside the JSON.\n` +
            `- If unsure, still choose SINGLE and provide two options.\n` +
            `Output ONLY valid JSON, nothing else.` }
        ];
        const ytResult = await callAI(ytMessages, { temperature: 0.25, max_tokens: 1024 });
        let ytQueries = parseYtQueries(ytResult, title, course, [], subjectLabelAr);
        if (forceSingleTopic) ytQueries = ensureQueries(ytQueries, title, course, [], subjectLabelAr);
        const youtubeParts = await buildYoutubeParts(ytQueries);
        const ytQuery = ytQueries[0]?.query || '';
        out({ success: !!(ytQuery || youtubeParts.length), quizText: '', ytQuery, youtubeParts, reason: 'not_pdf' });
        return;
      } catch (e) {
        out({ success: false, quizText: '', ytQuery: '', reason: 'not_pdf' });
        return;
      }
    }
    out({ success: false, quizText: '', ytQuery: '', reason: 'not_pdf' });
    return;
  }

  const sizeMB = fs.statSync(pdfPath).size / 1024 / 1024;
  if (sizeMB > 200) {
    out({ success: false, quizText: '', ytQuery: '', reason: `pdf_too_large_${sizeMB.toFixed(1)}mb` });
    return;
  }

  if (!getOpenRouterKeys().length) {
    out({ success: false, quizText: '', ytQuery: '', reason: 'no_openrouter_keys' });
    return;
  }

  // ── Step 0: Extract text from PDF ──
  err('📄 Extracting text from PDF...');
  let pdfText = '';
  let sidecarUsed = false;
  const sidecarText = readSidecarText(pdfPath);
  if (sidecarText && sidecarText.length > 50) {
    pdfText = sidecarText;
    sidecarUsed = true;
    err('✅ Using sidecar .txt transcription.');
  } else {
    pdfText = extractPdfText(pdfPath);
  }
  if (!pdfText || pdfText.length < 50 || isLowQualityText(pdfText)) {
    const ocrResult = runOcr(pdfPath);
    if (ocrResult && ocrResult.text && ocrResult.text.length > 50) {
      pdfText = ocrResult.text.trim();
      err('✅ OCR succeeded and improved text quality.');
    }
  }

  if (!pdfText || pdfText.length < 50) {
    // Try to get a YouTube query from title only
    let ytQueries = [];
    if (getOpenRouterKeys().length) {
      try {
        const ytMessages = [
          { role: 'system', content: `You are a helpful assistant and professor of ${subjectLabel}. Output ONLY valid JSON. Do NOT wrap in code fences. No markdown, no commentary.` },
          { role: 'user', content: `Context: First-year students in the Faculty of Science in Egypt.\nGoal: Find educational Arabic YouTube explanations suitable for first-year science students.\n\nCourse: ${course}\nLecture: ${title}\nSubject (Arabic): ${subjectLabelAr}\n\n` +
            (forceSingleTopic
              ? `This lecture MUST be treated as a SINGLE topic.\nReturn exactly TWO alternative Arabic YouTube search queries.\nReturn JSON: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"}]}\n`
              : `Decide if the lecture covers MULTIPLE distinct topics or a SINGLE coherent topic.\nIf the topics can reasonably be explained in ONE YouTube lecture by a professor, treat it as SINGLE.\nIf it would be taught as multiple videos, treat it as MULTI.\nIf SINGLE: return exactly TWO alternatives (options).\nIf MULTI: return ONE query per topic (no options), MAX 7 topics.\nReturn JSON in ONE of these forms:\n- Single: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"}]}\n- Multi: {\"mode\":\"multi\",\"queries\":[{\"title\":\"Part 1\",\"query\":\"...\"},{\"title\":\"Part 2\",\"query\":\"...\"}]}\n`) +
            `STRICT RULES:\n` +
            `- Queries MUST be Arabic and for educational explanations (شرح/محاضرة).\n` +
            `- NEVER mention PDF/file/format/stream/object/endobj/xref/document or any file-format terms.\n` +
            `- If the title is generic, use the subject name.\n` +
            `- Avoid music, shorts, memes, gaming, or entertainment.\n` +
            `STRICT RESPONSE FORMAT (MUST FOLLOW EXACTLY):\n` +
            `- Return ONE JSON object only. No code fences, no markdown, no commentary.\n` +
            `- JSON must start with { and end with }.\n` +
            `- Use double quotes for ALL keys and strings.\n` +
            `- Do NOT include any extra keys or text outside the JSON.\n` +
            `- If unsure, still choose SINGLE and provide two options.\n` +
            `Output ONLY valid JSON, nothing else.` }
        ];
        const ytResult = await callAI(ytMessages, { temperature: 0.25, max_tokens: 1024 });
        ytQueries = parseYtQueries(ytResult, title, course, [], subjectLabelAr);
        if (forceSingleTopic) ytQueries = ensureQueries(ytQueries, title, course, [], subjectLabelAr);
      } catch (e) { /* ignore */ }
    }
    if (!ytQueries.length) ytQueries = ensureQueries([], title, course, [], subjectLabelAr);
    const youtubeParts = await buildYoutubeParts(ytQueries);
    const ytQuery = ytQueries[0]?.query || '';
    out({ success: !!(ytQuery || youtubeParts.length), quizText: '', ytQuery, youtubeParts, reason: 'pdf_text_extraction_failed' });
    return;
  }
  const contextText = buildContext(pdfText, 12000);
  err(`✅ Extracted ${pdfText.length} chars (context size ${contextText.length})`);

  let ytQuery = '';
  let quizText = '';
  // If a sidecar .txt exists, trust it even if "low quality"
  const lowQualityText = sidecarUsed ? false : isLowQualityText(pdfText);
  // ── Step 1: YouTube suggestion(s) ──
  const skipYouTube = /^C104$/i.test(course);
  if (skipYouTube) {
    err('🎬 Step 1: Skipping YouTube generation for C104 (Practical Chemistry).');
  }
  err('🎬 Step 1: Asking AI for YouTube search suggestion(s)...');

  const keywords = extractKeywords(contextText, 3);
  let ytQueries = [];
  let youtubeParts = [];
  if (!skipYouTube) {
    const ytMessages = [
      { role: 'system', content: `You are a helpful assistant and professor of ${subjectLabel}. Output ONLY valid JSON. Do NOT wrap in code fences. No markdown, no commentary.` },
      { role: 'user', content: `Context: First-year students in the Faculty of Science in Egypt.\nGoal: Find educational Arabic YouTube explanations suitable for first-year science students.\n\nCourse: ${course}\nLecture: ${title}\nSubject: ${subjectLabel}\nSubject (Arabic): ${subjectLabelAr}\n\nLecture content:\n${contextText}\n\n` +
        (forceSingleTopic
          ? `This lecture MUST be treated as a SINGLE topic.\nReturn exactly TWO alternative Arabic YouTube search queries.\nReturn JSON: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"}]}\n`
          : `Decide if the lecture covers MULTIPLE distinct topics or a SINGLE coherent topic.\nIf the topics can reasonably be explained in ONE YouTube lecture by a professor, treat it as SINGLE.\nIf it would be taught as multiple videos, treat it as MULTI.\nIf SINGLE: return exactly TWO alternatives (options).\nIf MULTI: return ONE query per topic (no options), MAX 7 topics.\nReturn JSON in ONE of these forms:\n- Single: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"}]}\n- Multi: {\"mode\":\"multi\",\"queries\":[{\"title\":\"Part 1\",\"query\":\"...\"},{\"title\":\"Part 2\",\"query\":\"...\"}]}\n`) +
      `STRICT RULES:\n` +
      `- Queries MUST be Arabic and for educational explanations (شرح/محاضرة).\n` +
      `- NEVER mention PDF/file/format/stream/object/endobj/xref/document or any file-format terms.\n` +
      `- Use the lecture content to make the query specific to the topic.\n` +
      `- Avoid music, shorts, memes, gaming, or entertainment.\n` +
      `STRICT RESPONSE FORMAT (MUST FOLLOW EXACTLY):\n` +
      `- Return ONE JSON object only. No code fences, no markdown, no commentary.\n` +
      `- JSON must start with { and end with }.\n` +
      `- Use double quotes for ALL keys and strings.\n` +
      `- Do NOT include any extra keys or text outside the JSON.\n` +
      `- If unsure, still choose SINGLE and provide two options.\n` +
      `Output ONLY valid JSON, nothing else.`
    }
  ];

    const ytResult = await callAI(ytMessages, { temperature: 0.25, max_tokens: YT_MAX_TOKENS });
    ytQueries = parseYtQueries(ytResult, title, course, keywords, subjectLabelAr);
    if (forceSingleTopic) ytQueries = ensureQueries(ytQueries, title, course, keywords, subjectLabelAr);
    // No simple fallback call; rely on strict JSON output + ensureQueries fallback.

    ytQuery = ytQueries[0]?.query || '';
    if (ytQuery) err(`✅ YouTube query: ${ytQuery}`);

    // ── Optional: search YouTube for each query ──
    youtubeParts = await buildYoutubeParts(ytQueries);
  }

  if (lowQualityText) {
    const stats = getTextQualityStats(pdfText);
    err(`⚠️  Low-quality PDF text (len=${stats.len}, alphaRatio=${stats.alphaRatio.toFixed(2)}). Skipping quiz generation.`);
    out({
      success: !!ytQuery,
      quizText: '',
      ytQuery: ytQuery || '',
      youtubeParts,
      reason: 'low_quality_text',
    });
    return;
  }

  // ── Step 2: Quiz generation (single call) ──
  err('📝 Step 2: Generating quiz...');
  const mcqCount = isPractical ? 5 : QUIZ_MCQ_COUNT;
  const tfCount = isPractical ? 5 : QUIZ_TF_COUNT;
  const totalCount = mcqCount + tfCount;

  const evalQuizWithTotal = (text, expectedTotal, minFloor) => {
    if (!text || text.length < 200) return { ok: false, qCount: 0, badSignals: true, minCount: 0 };
    const numbered = text.match(/^\s*(?:Q\s*)?(\d+)\s*[\.\)\-:]/gmi) || [];
    const answers = text.match(/^\s*Answer\s*:\s*(?:[abcd]|true|false)\s*$/gmi) || [];
    const qCount = Math.max(numbered.length, answers.length);
    const badSignals = /(course code|lecture number|content appears|unreadable|encrypted|file format|pdf)/i.test(text);
    const floor = typeof minFloor === 'number' ? minFloor : (isPractical ? 6 : 10);
    const minCount = Math.max(floor, Math.floor(expectedTotal * 0.5));
    return { ok: qCount >= minCount && !badSignals, qCount, badSignals, minCount };
  };

  const systemLine = `You are a university professor of ${subjectLabel} in the Faculty of Science (Egypt). Output ONLY the quiz in plain text. No markdown, no bold, no headers, no bullet points, no dashes before options. Follow the exact format shown. If content is insufficient, output an empty response. Output in ENGLISH ONLY. Do not include any Arabic words or letters.`;
  const quizContext = contextText;

  const quizMessages = [
    { role: 'system', content: systemLine },
    { role: 'user', content: `You are preparing an exam-style quiz for FIRST-YEAR students in the Faculty of Science (Egypt).\nYou are the professor for this subject: ${subjectLabel}.\nGenerate the quiz based ONLY on this lecture content.\nIMPORTANT: Output in ENGLISH ONLY. Do NOT include any Arabic words or letters.\n\nCourse: ${course}\nLecture: ${title}\nSubject: ${subjectLabel}\n\nLecture content:\n${quizContext}\n\nGenerate exactly ${mcqCount} Multiple Choice Questions and ${tfCount} True/False Questions.\n\nYou MUST follow this EXACT plain text format with NO deviations:\n\n1. What is the main topic discussed in this lecture?\na) Option A text\nb) Option B text\nc) Option C text\nd) Option D text\nAnswer: b\n\n2. Which of the following is correct?\na) Option A text\nb) Option B text\nc) Option C text\nd) Option D text\nAnswer: c\n\n${mcqCount + 1}. The earth revolves around the sun.\nAnswer: True\n\n${mcqCount + 2}. Water boils at 50 degrees Celsius.\nAnswer: False\n\nCRITICAL RULES:\n- Number questions 1 through ${totalCount} continuously (1-${mcqCount} for MCQ, ${mcqCount + 1}-${totalCount} for True/False)\n- Use a) b) c) d) for MCQ options (lowercase letter followed by closing parenthesis)\n- Put \"Answer: \" followed by the correct letter (for MCQ) or True/False on its own line after each question\n- Do NOT use any markdown formatting (no **, no ##, no -, no bullets)\n- Do NOT add any introduction, headers, or closing remarks\n- Every question must come from the lecture content\n- Do NOT use \"Q1\", \"Question 1\", bullets, or numbered lists other than \"1.\" \"2.\" etc.\n- Do NOT include explanations or extra text beyond the required format\n- Avoid meta questions about the course code, lecture number, file format, or that the content is unreadable/encoded\n- Each question must include at least one concrete term or concept from the lecture (not generic filler)\n- Mix difficulty: 40% easy, 40% medium, 20% hard\n- All 4 MCQ options must be plausible` }
  ];

  let quizResult = await callAI(quizMessages, { temperature: 0.2, max_tokens: QUIZ_MAX_TOKENS });
  quizResult = normalizeQuizFormat(quizResult);
  let quizEval = evalQuizWithTotal(quizResult, totalCount, isPractical ? 6 : 8);

  if (!quizEval.ok) {
    err('🔁 Retrying quiz with stricter instructions...');
    const retryMessages = [
      quizMessages[0],
      {
        role: 'user',
        content: `${quizMessages[1].content}\n\nIMPORTANT: Output MUST begin with \"1.\" and contain exactly ${totalCount} numbered questions (1-${totalCount}). If you cannot do this, output an empty response.`,
      },
    ];
    quizResult = await callAI(retryMessages, { temperature: 0.15, max_tokens: QUIZ_RETRY_MAX_TOKENS });
    quizResult = normalizeQuizFormat(quizResult);
    quizEval = evalQuizWithTotal(quizResult, totalCount, isPractical ? 6 : 8);
  }

  if (!quizEval.ok) {
    err('🔁 Final attempt with reduced question count (10 total)...');
    const reducedMcq = 5;
    const reducedTf = 5;
    const reducedTotal = reducedMcq + reducedTf;
    const reducedMessages = [
      quizMessages[0],
      {
        role: 'user',
        content: `You are preparing an exam-style quiz for FIRST-YEAR students in the Faculty of Science (Egypt).\nYou are the professor for this subject: ${subjectLabel}.\nGenerate the quiz based ONLY on this lecture content.\nIMPORTANT: Output in ENGLISH ONLY. Do NOT include any Arabic words or letters.\n\nCourse: ${course}\nLecture: ${title}\nSubject: ${subjectLabel}\n\nLecture content:\n${quizContext}\n\nGenerate exactly ${reducedMcq} Multiple Choice Questions and ${reducedTf} True/False Questions.\n\nYou MUST follow this EXACT plain text format with NO deviations:\n\n1. What is the main topic discussed in this lecture?\na) Option A text\nb) Option B text\nc) Option C text\nd) Option D text\nAnswer: b\n\n2. Which of the following is correct?\na) Option A text\nb) Option B text\nc) Option C text\nd) Option D text\nAnswer: c\n\n${reducedMcq + 1}. The earth revolves around the sun.\nAnswer: True\n\n${reducedMcq + 2}. Water boils at 50 degrees Celsius.\nAnswer: False\n\nCRITICAL RULES:\n- Number questions 1 through ${reducedTotal} continuously (1-${reducedMcq} for MCQ, ${reducedMcq + 1}-${reducedTotal} for True/False)\n- Use a) b) c) d) for MCQ options (lowercase letter followed by closing parenthesis)\n- Put \"Answer: \" followed by the correct letter (for MCQ) or True/False on its own line after each question\n- Do NOT use any markdown formatting (no **, no ##, no -, no bullets)\n- Do NOT add any introduction, headers, or closing remarks\n- Every question must come from the lecture content\n- Do NOT use \"Q1\", \"Question 1\", bullets, or numbered lists other than \"1.\" \"2.\" etc.\n- Do NOT include explanations or extra text beyond the required format\n- Avoid meta questions about the course code, lecture number, file format, or that the content is unreadable/encoded\n- Each question must include at least one concrete term or concept from the lecture (not generic filler)\n- Mix difficulty: 40% easy, 40% medium, 20% hard\n- All 4 MCQ options must be plausible`,
      },
    ];
    quizResult = await callAI(reducedMessages, { temperature: 0.15, max_tokens: QUIZ_RETRY_MAX_TOKENS });
    quizResult = normalizeQuizFormat(quizResult);
    quizEval = evalQuizWithTotal(quizResult, reducedTotal, 10);
  }

  if (quizEval.ok) {
    quizText = quizResult;
    err(`✅ Quiz generated: ${quizText.length} characters`);
  } else {
    err('⚠️  Could not generate a high-quality quiz.');
  }

  // ── Output result ──
  out({
    success: !!(ytQuery || quizText || (youtubeParts && youtubeParts.length > 0)),
    quizText: quizText || '',
    ytQuery: ytQuery || '',
    youtubeParts,
    reason: (!ytQuery && !quizText) ? 'all_providers_failed' : undefined,
  });
}

run();
