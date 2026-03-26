#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '../..');
const envPath = path.join(ROOT, 'automation', '.env');

let OPENROUTER_KEY = '';
let OPENROUTER_MODEL = 'stepfun/step-3.5-flash';
let OPENROUTER_KEYS = [];

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('//')) continue;
    if (t.startsWith('OPENROUTER_API_KEY=')) OPENROUTER_KEY = t.split('=')[1].trim();
    if (t.startsWith('OPENROUTER_API_KEYS=')) {
      OPENROUTER_KEYS = t.split('=')[1].split(',').map(s => s.trim()).filter(Boolean);
    }
    if (t.startsWith('OPENROUTER_MODEL=')) OPENROUTER_MODEL = t.split('=')[1].trim();
  }
}

function httpPost(hostname, apiPath, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path: apiPath,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 0, json: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode || 0, json: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function testOpenRouter() {
  const keys = [];
  if (OPENROUTER_KEY) keys.push(OPENROUTER_KEY);
  for (const k of OPENROUTER_KEYS) if (k && !keys.includes(k)) keys.push(k);
  if (!keys.length) return [{ ok: false, reason: 'missing_openrouter_key' }];

  const results = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const res = await httpPost('openrouter.ai', '/api/v1/chat/completions', {
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://minia-science-hub.vercel.app',
      }, {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'Answer with exactly two words.' },
          { role: 'user', content: 'Say: test ok' }
        ],
        max_tokens: 32,
        temperature: 0.2,
      });
      const text = res.json?.choices?.[0]?.message?.content || '';
      results.push({ keyIndex: i + 1, ok: !!text, status: res.status, sample: text.trim().slice(0, 80) });
    } catch (e) {
      results.push({ keyIndex: i + 1, ok: false, error: e.message || String(e) });
    }
  }
  return results;
}

(async () => {
  try {
    console.log('OpenRouter:', await testOpenRouter());
  } catch (e) {
    console.log('OpenRouter:', { ok: false, error: e.message || String(e) });
  }
})();
