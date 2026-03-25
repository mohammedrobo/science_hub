/**
 * Science Hub — Quiz Generator (OpenRouter + HuggingFace Fallback)
 * 
 * Pipeline: Extract PDF text → YouTube suggestion → Quiz generation
 * Primary: DeepSeek via OpenRouter
 * Fallback: DeepSeek via HuggingFace
 * If both fail for quiz: still return YouTube suggestion
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
let HUGGINGFACE_KEY = '';
let YOUTUBE_KEY = '';
let YOUTUBE_REGION = 'EG';
let YOUTUBE_LANG = 'ar';
let YOUTUBE_REGION_FALLBACKS = '';
let OPENROUTER_MODEL = 'deepseek/deepseek-r1';
let HUGGINGFACE_MODEL = 'deepseek-ai/DeepSeek-R1';
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
    if (t.startsWith('HUGGINGFACE_API_KEY=')) HUGGINGFACE_KEY = t.split('=')[1].trim();
    if (t.startsWith('YOUTUBE_API_KEY=')) YOUTUBE_KEY = t.split('=')[1].trim();
    if (t.startsWith('YOUTUBE_REGION=')) YOUTUBE_REGION = t.split('=')[1].trim();
    if (t.startsWith('YOUTUBE_LANG=')) YOUTUBE_LANG = t.split('=')[1].trim();
    if (t.startsWith('YOUTUBE_REGION_FALLBACKS=')) YOUTUBE_REGION_FALLBACKS = t.split('=')[1].trim();
    if (t.startsWith('OPENROUTER_MODEL=')) OPENROUTER_MODEL = t.split('=')[1].trim();
    if (t.startsWith('HUGGINGFACE_MODEL=')) HUGGINGFACE_MODEL = t.split('=')[1].trim();
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
YOUTUBE_REGION_FALLBACKS = String(process.env.YOUTUBE_REGION_FALLBACKS || YOUTUBE_REGION_FALLBACKS || '').trim();

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

function stripToFirstQuestion(text) {
  if (!text) return text;
  const idx = text.search(/^\s*1\.\s+/m);
  if (idx >= 0) return text.slice(idx).trim();
  return text.trim();
}

function normalizeQuizFormat(text) {
  if (!text) return text;
  let t = String(text);
  // Normalize question numbering to "1. "
  t = t.replace(/^\s*Q\s*(\d+)\s*[:\).\-]\s+/gmi, '$1. ');
  t = t.replace(/^\s*(\d+)\s*[\)\-:]\s+/gm, '$1. ');
  // Normalize options to "a) "
  t = t.replace(/^\s*([ABCD])\s*[\)\.\-:]\s+/gm, (_m, p1) => `${String(p1).toLowerCase()}) `);
  return t.trim();
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
  err('  🔗 Trying OpenRouter (DeepSeek R1)...');
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

// ── Provider 2: HuggingFace (DeepSeek) ──
async function callHuggingFace(messages, opts = {}) {
  if (!HUGGINGFACE_KEY) throw new Error('No HuggingFace key');
  err('  🤗 Trying HuggingFace (DeepSeek R1)...');
  const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.3;
  const max_tokens = typeof opts.max_tokens === 'number' ? opts.max_tokens : 4096;
  const res = await httpPost('api-inference.huggingface.co', `/models/${HUGGINGFACE_MODEL}/v1/chat/completions`, {
    'Authorization': `Bearer ${HUGGINGFACE_KEY}`,
  }, {
    model: HUGGINGFACE_MODEL,
    messages,
    max_tokens,
    temperature,
  });
  if (res.error) throw new Error(`HuggingFace: ${res.error || JSON.stringify(res)}`);
  return res.choices?.[0]?.message?.content || '';
}

// ── Smart caller: tries OpenRouter first, then HuggingFace ──
async function callAI(messages, opts = {}) {
  // Try OpenRouter keys (rotate on failure)
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
  // Fallback to HuggingFace
  try {
    const result = await callHuggingFace(messages, opts);
    if (result && result.length > 10) return result;
  } catch (e) {
    err(`  ❌ HuggingFace failed: ${e.message}`);
  }
  return null;
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeQuery(q) {
  return String(q || '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureQueries(queries, title, course) {
  const out = [];
  const add = (query) => {
    const q = normalizeQuery(query);
    if (!q) return;
    if (out.some(x => x.query === q)) return;
    out.push({ title: '', query: q });
  };
  for (const q of queries || []) add(q?.query || q);
  const base = normalizeQuery(`${title} شرح ${course}`.trim());
  add(base);
  add(`${title} محاضرة ${course}`);
  add(`${title} شرح مبسط ${course}`);
  return out.slice(0, 3).map((q, i) => ({ title: `Option ${i + 1}`, query: q.query }));
}

function parseYtQueries(ytResult, title, course) {
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
      const fallback = normalizeQuery(`${title} شرح ${course}`.trim());
      if (fallback) out.push({ title: 'Part 1', query: fallback });
    }
    return out.slice(0, 7).map((q, i) => ({
      title: q.title || `Part ${i + 1}`,
      query: q.query,
    }));
  }

  if (ytQueries.length === 0) {
    const fallback = normalizeQuery(`${title} شرح ${course}`.trim());
    if (fallback) ytQueries = [{ title: '', query: fallback }];
  }

  return ensureQueries(ytQueries, title, course);
}

async function ytSearch(query) {
  if (!YOUTUBE_KEY || !query) return null;
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

  const doSearch = (regionCode) => {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '8',
      safeSearch: 'moderate',
      videoDuration: 'medium',
      videoEmbeddable: 'true',
      q,
      key: YOUTUBE_KEY,
    });
    if (hasArabic && YOUTUBE_LANG) params.set('relevanceLanguage', YOUTUBE_LANG);
    if (regionCode) params.set('regionCode', regionCode);

    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (d) => { data += d.toString(); });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  };

  let last = null;
  for (const regionCode of candidates) {
    const data = await doSearch(regionCode);
    last = data || last;
    if (data?.items?.length) return data;
  }
  return last;
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
  if (!isPdf) {
    // Non-PDF assets (images, etc.) — skip quiz, but try YouTube query from title
    if (OPENROUTER_KEY || HUGGINGFACE_KEY) {
      try {
        const ytMessages = [
          { role: 'system', content: 'You are a helpful assistant. Output ONLY valid JSON. No markdown, no commentary.' },
          { role: 'user', content: `Context: First-year students in the Faculty of Science in Egypt.\nGoal: Find educational Arabic YouTube explanations suitable for first-year science students.\n\nCourse: ${course}\nLecture: ${title}\n\n` +
            (forceSingleTopic
              ? `This lecture MUST be treated as a SINGLE topic.\nReturn exactly THREE alternative Arabic YouTube search queries.\nReturn JSON: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"},{\"title\":\"Option 3\",\"query\":\"...\"}]}\n`
              : `Decide if the lecture covers MULTIPLE distinct topics or a SINGLE coherent topic.\nIf SINGLE: return exactly THREE alternatives (options).\nIf MULTI: return ONE query per topic (no options), MAX 7 topics.\nReturn JSON in ONE of these forms:\n- Single: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"},{\"title\":\"Option 3\",\"query\":\"...\"}]}\n- Multi: {\"mode\":\"multi\",\"queries\":[{\"title\":\"Part 1\",\"query\":\"...\"},{\"title\":\"Part 2\",\"query\":\"...\"}]}\n`) +
            `Queries MUST be Arabic and for educational explanations (شرح/محاضرة). Avoid music, shorts, memes, gaming, or entertainment.\n` +
            `Output ONLY valid JSON, nothing else.` }
        ];
        const ytResult = await callAI(ytMessages, { temperature: 0.25, max_tokens: 512 });
        let ytQueries = parseYtQueries(ytResult, title, course);
        if (forceSingleTopic) ytQueries = ensureQueries(ytQueries, title, course);
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

  if (!OPENROUTER_KEY && !HUGGINGFACE_KEY) {
    out({ success: false, quizText: '', ytQuery: '', reason: 'no_api_keys' });
    return;
  }

  // ── Step 0: Extract text from PDF ──
  err('📄 Extracting text from PDF...');
  let pdfText = '';
  const sidecarText = readSidecarText(pdfPath);
  if (sidecarText && sidecarText.length > 50) {
    pdfText = sidecarText;
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
    if (OPENROUTER_KEY || HUGGINGFACE_KEY) {
      try {
        const ytMessages = [
          { role: 'system', content: 'You are a helpful assistant. Output ONLY valid JSON. No markdown, no commentary.' },
          { role: 'user', content: `Context: First-year students in the Faculty of Science in Egypt.\nGoal: Find educational Arabic YouTube explanations suitable for first-year science students.\n\nCourse: ${course}\nLecture: ${title}\n\n` +
            (forceSingleTopic
              ? `This lecture MUST be treated as a SINGLE topic.\nReturn exactly THREE alternative Arabic YouTube search queries.\nReturn JSON: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"},{\"title\":\"Option 3\",\"query\":\"...\"}]}\n`
              : `Decide if the lecture covers MULTIPLE distinct topics or a SINGLE coherent topic.\nIf SINGLE: return exactly THREE alternatives (options).\nIf MULTI: return ONE query per topic (no options), MAX 7 topics.\nReturn JSON in ONE of these forms:\n- Single: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"},{\"title\":\"Option 3\",\"query\":\"...\"}]}\n- Multi: {\"mode\":\"multi\",\"queries\":[{\"title\":\"Part 1\",\"query\":\"...\"},{\"title\":\"Part 2\",\"query\":\"...\"}]}\n`) +
            `Queries MUST be Arabic and for educational explanations (شرح/محاضرة). Avoid music, shorts, memes, gaming, or entertainment.\n` +
            `Output ONLY valid JSON, nothing else.` }
        ];
        const ytResult = await callAI(ytMessages, { temperature: 0.25, max_tokens: 512 });
        ytQueries = parseYtQueries(ytResult, title, course);
        if (forceSingleTopic) ytQueries = ensureQueries(ytQueries, title, course);
      } catch (e) { /* ignore */ }
    }
    if (!ytQueries.length) ytQueries = ensureQueries([], title, course);
    const youtubeParts = await buildYoutubeParts(ytQueries);
    const ytQuery = ytQueries[0]?.query || '';
    out({ success: !!(ytQuery || youtubeParts.length), quizText: '', ytQuery, youtubeParts, reason: 'pdf_text_extraction_failed' });
    return;
  }
  const contextText = buildContext(pdfText, 12000);
  err(`✅ Extracted ${pdfText.length} chars (context size ${contextText.length})`);

  let ytQuery = '';
  let quizText = '';
  const lowQualityText = isLowQualityText(pdfText);
  // ── Step 1: YouTube suggestion(s) ──
  err('🎬 Step 1: Asking AI for YouTube search suggestion(s)...');

  const ytMessages = [
    { role: 'system', content: 'You are a helpful assistant. Output ONLY valid JSON. No markdown, no commentary.' },
    { role: 'user', content: `Context: First-year students in the Faculty of Science in Egypt.\nGoal: Find educational Arabic YouTube explanations suitable for first-year science students.\n\nCourse: ${course}\nLecture: ${title}\n\nContent snippet:\n${contextText.slice(0, 2500)}\n\n` +
      (forceSingleTopic
        ? `This lecture MUST be treated as a SINGLE topic.\nReturn exactly THREE alternative Arabic YouTube search queries.\nReturn JSON: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"},{\"title\":\"Option 3\",\"query\":\"...\"}]}\n`
        : `Decide if the lecture covers MULTIPLE distinct topics or a SINGLE coherent topic.\nIf SINGLE: return exactly THREE alternatives (options).\nIf MULTI: return ONE query per topic (no options), MAX 7 topics.\nReturn JSON in ONE of these forms:\n- Single: {\"mode\":\"single\",\"queries\":[{\"title\":\"Option 1\",\"query\":\"...\"},{\"title\":\"Option 2\",\"query\":\"...\"},{\"title\":\"Option 3\",\"query\":\"...\"}]}\n- Multi: {\"mode\":\"multi\",\"queries\":[{\"title\":\"Part 1\",\"query\":\"...\"},{\"title\":\"Part 2\",\"query\":\"...\"}]}\n`) +
      `Queries MUST be Arabic and for educational explanations (شرح/محاضرة). Avoid music, shorts, memes, gaming, or entertainment.\n` +
      `Output ONLY valid JSON, nothing else.`
    }
  ];

  const ytResult = await callAI(ytMessages, { temperature: 0.25, max_tokens: 512 });
  let ytQueries = parseYtQueries(ytResult, title, course);
  if (forceSingleTopic) ytQueries = ensureQueries(ytQueries, title, course);

  ytQuery = ytQueries[0]?.query || '';
  if (ytQuery) err(`✅ YouTube query: ${ytQuery}`);

  // ── Optional: search YouTube for each query ──
  const youtubeParts = await buildYoutubeParts(ytQueries);

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

  // ── Step 2: Quiz generation ──
  err('📝 Step 2: Generating quiz...');
  const mcqCount = isPractical ? 5 : 10;
  const tfCount = isPractical ? 5 : 10;
  const totalCount = mcqCount + tfCount;

  const evalQuiz = (text) => {
    if (!text || text.length < 200) return { ok: false, qCount: 0, badSignals: true };
    const matches = text.match(/^\s*(?:Q\s*)?(\d+)\s*[\.\)\-:]\s+/gmi) || [];
    const qCount = matches.length;
    const badSignals = /(course code|lecture number|content appears|unreadable|encrypted|file format|pdf)/i.test(text);
    const minCount = Math.max(isPractical ? 6 : 12, Math.floor(totalCount * 0.7));
    return { ok: qCount >= minCount && !badSignals, qCount, badSignals, minCount };
  };
  const quizMessages = [
    { role: 'system', content: 'You are a university professor in the Faculty of Science (Egypt). Output ONLY the quiz in plain text. No markdown, no bold, no headers, no bullet points, no dashes before options. Follow the exact format shown. If content is insufficient, output an empty response. Output in ENGLISH ONLY. Do not include any Arabic words or letters.' },
    { role: 'user', content: `You are preparing an exam-style quiz for FIRST-YEAR students in the Faculty of Science (Egypt).\nGenerate the quiz based ONLY on this lecture content.\nIMPORTANT: Output in ENGLISH ONLY. Do NOT include any Arabic words or letters.

Course: ${course}
Lecture: ${title}

Lecture content:
${contextText}

Generate exactly ${mcqCount} Multiple Choice Questions and ${tfCount} True/False Questions.

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

${mcqCount + 1}. The earth revolves around the sun.
Answer: True

${mcqCount + 2}. Water boils at 50 degrees Celsius.
Answer: False

CRITICAL RULES:
- Number questions 1 through ${totalCount} continuously (1-${mcqCount} for MCQ, ${mcqCount + 1}-${totalCount} for True/False)
- Use a) b) c) d) for MCQ options (lowercase letter followed by closing parenthesis)
- Put "Answer: " followed by the correct letter (for MCQ) or True/False on its own line after each question
- Do NOT use any markdown formatting (no **, no ##, no -, no bullets)
- Do NOT add any introduction, headers, or closing remarks
- Every question must come from the lecture content
- Do NOT use "Q1", "Question 1", bullets, or numbered lists other than "1." "2." etc.
- Do NOT include explanations or extra text beyond the required format
- Avoid meta questions about the course code, lecture number, file format, or that the content is unreadable/encoded
- Each question must include at least one concrete term or concept from the lecture (not generic filler)
- Mix difficulty: 40% easy, 40% medium, 20% hard
- All 4 MCQ options must be plausible` }
  ];

  let quizResult = await callAI(quizMessages, { temperature: 0.15, max_tokens: 4096 });
  quizResult = normalizeQuizFormat(stripToFirstQuestion(quizResult));
  let quizEval = evalQuiz(quizResult);

  if (!quizEval.ok) {
    err('🔁 Retrying quiz with stricter instructions...');
    const retryMessages = [
      quizMessages[0],
      {
        role: 'user',
        content: `${quizMessages[1].content}\n\nIMPORTANT: Output MUST begin with \"1.\" and contain exactly ${totalCount} numbered questions (1-${totalCount}). If you cannot do this, output an empty response.`,
      },
    ];
    quizResult = await callAI(retryMessages, { temperature: 0.1, max_tokens: 4096 });
    quizResult = normalizeQuizFormat(stripToFirstQuestion(quizResult));
    quizEval = evalQuiz(quizResult);
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
