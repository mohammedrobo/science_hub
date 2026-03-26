#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });

const { GoogleGenerativeAI } = require('@google/generative-ai');

const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const keysRaw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const keys = keysRaw.split(',').map(k => k.trim()).filter(Boolean);

if (!keys.length) {
  console.log('No GEMINI_API_KEYS or GEMINI_API_KEY found in env.');
  process.exit(1);
}

async function testKey(apiKey, index) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: 'Reply with exactly: ok' }] }
      ],
      generationConfig: {
        maxOutputTokens: 8,
        temperature: 0,
      },
    });
    const text = result?.response?.text?.() || '';
    const ok = /ok/i.test(text);
    return { ok, text: text.trim().slice(0, 80) };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

(async () => {
  console.log(`Testing ${keys.length} Gemini key(s) with model: ${modelName}`);
  for (let i = 0; i < keys.length; i++) {
    const res = await testKey(keys[i], i);
    if (res.ok) {
      console.log(`Key ${i + 1}: OK (${res.text || 'ok'})`);
    } else {
      console.log(`Key ${i + 1}: FAIL (${res.error || 'no response'})`);
    }
  }
})();
