import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const PORT = Number(process.env.LOCAL_QUIZ_PORT || 8787);
const SECRET = process.env.LOCAL_QUIZ_SECRET || '';
const TIMEOUT_MS = Number(process.env.LOCAL_QUIZ_TIMEOUT_MS || 300000);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function runQuizGenerator(payload) {
  return new Promise((resolve, reject) => {
    // generate_quiz_api.js expects positional args:
    // node generate_quiz_api.js <pdfPath> <courseCode> <lectureTitle> <canUseGemini>
    const args = [
      path.join(repoRoot, 'automation/gemini/generate_quiz_api.js'),
      String(payload.primary_pdf_path || ''),
      String(payload.course_code || ''),
      String(payload.lecture_title || ''),
    ];

    const child = spawn('node', args, { cwd: repoRoot });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const err = new Error(`generator exited with code ${code}`);
        err.stderr = stderr;
        err.stdout = stdout;
        return reject(err);
      }
      try {
        const parsed = JSON.parse(stdout.trim() || '{}');
        return resolve(parsed);
      } catch (e) {
        const err = new Error('failed to parse generator output');
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/generate') {
    return sendJson(res, 404, { error: 'not_found' });
  }

  if (SECRET) {
    const got = req.headers['x-local-secret'];
    if (got !== SECRET) return sendJson(res, 401, { error: 'unauthorized' });
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk.toString(); });
  req.on('end', async () => {
    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      return sendJson(res, 400, { error: 'invalid_json' });
    }

    const cleanedPdfPath = String(payload.primary_pdf_path || '')
      .replace(/[\r\n]+/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
      .trim();

    if (!cleanedPdfPath || !payload.course_code || !payload.lecture_title) {
      return sendJson(res, 400, {
        error: 'missing_fields',
        required: ['primary_pdf_path', 'course_code', 'lecture_title'],
      });
    }

    try {
      const result = await runQuizGenerator({
        ...payload,
        primary_pdf_path: cleanedPdfPath,
      });
      return sendJson(res, 200, {
        success: !!(result.quizText || result.ytQuery),
        quizText: result.quizText || '',
        ytQuery: result.ytQuery || '',
        reason: result.reason || null,
        meta: result.meta || null,
        path: cleanedPdfPath,
      });
    } catch (e) {
      return sendJson(res, 500, {
        error: 'generator_failed',
        message: e.message,
        stderr: e.stderr || '',
        path: cleanedPdfPath,
      });
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local quiz server listening on http://127.0.0.1:${PORT}`);
});
