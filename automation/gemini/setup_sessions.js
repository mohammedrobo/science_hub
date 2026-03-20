/**
 * Run ONCE: node automation/gemini/setup_sessions.js
 * Opens a browser for each Google account. You log in manually.
 * Saves session state so generate_quiz.js can run headlessly.
 */
const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');
const rl   = require('readline');

const DIR = path.join('automation', 'gemini', 'sessions');
fs.mkdirSync(DIR, { recursive: true });

const accounts = (process.env.GEMINI_ACCOUNTS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

if (!accounts.length) {
  console.error('Set GEMINI_ACCOUNTS in automation/.env');
  process.exit(1);
}

function ask(q) {
  return new Promise(res => {
    const r = rl.createInterface({ input: process.stdin, output: process.stdout });
    r.question(q, ans => { r.close(); res(ans); });
  });
}

async function setup(email, idx) {
  const file = path.join(DIR, `account_${idx}.json`);
  if (fs.existsSync(file)) {
    console.log(`⏭️  Account ${idx+1} (${email}) — already saved`);
    return;
  }
  console.log(`\n${'='.repeat(55)}`);
  console.log(`🔐 Account ${idx+1}/${accounts.length}: ${email}`);
  console.log(`${'='.repeat(55)}`);

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page    = await context.newPage();
  await page.goto('https://aistudio.google.com');

  console.log('👀 Browser opened. Log into Google with:', email);
  await ask('Press ENTER once you are fully logged into AI Studio: ');

  const state = await context.storageState();
  fs.writeFileSync(file, JSON.stringify({
    email, index: idx,
    savedAt: new Date().toISOString(),
    storageState: state,
  }, null, 2));

  console.log(`✅ Session saved for ${email}`);
  await browser.close();
}

(async () => {
  for (let i = 0; i < accounts.length; i++) {
    await setup(accounts[i], i);
  }
  console.log('\n✅ All sessions saved!');
})();
