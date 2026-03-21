/**
 * Run ONCE: node automation/gemini/setup_sessions.js
 * Opens a browser for each Google account. You log in manually.
 * Saves session state so generate_quiz.js can run headlessly.
 */
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const fs   = require('fs');
const path = require('path');
const rl   = require('readline');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
  const sessionFile = path.join(DIR, `session_${idx}.json`);

  if (fs.existsSync(sessionFile)) {
    console.log(`✅ Account ${idx+1}/${accounts.length} (${email}) already saved. Skipping...`);
    return;
  }

  console.log(`\n=======================================================`);
  console.log(`🔐 Account ${idx+1}/${accounts.length}: ${email}`);
  console.log(`${'='.repeat(55)}`);

  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 300,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  await page.goto('https://stackoverflow.com/users/login');

  console.log(`\n=======================================================`);
  console.log('🔴 IMPORTANT WORKAROUND 🔴');
  console.log('Google has flagged your local IP for automated requests, so its main login page is blocked.');
  console.log(`However, we can bypass this by logging in through a highly-trusted third-party website!`);
  console.log(`1. On the StackOverflow page that just opened, click the button: "Log in with Google".`);
  console.log(`2. Log in using your email: ${email}`);
  console.log(`3. Wait until StackOverflow successfully loads your profile (or asks you to finish signing up).`);
  console.log(`Once you are fully logged into StackOverflow via Google, hit ENTER here!`);
  
  await ask('\n✅ Press ENTER once StackOverflow is logged in: ');

  const state = await context.storageState();
  fs.writeFileSync(sessionFile, JSON.stringify({
    email, index: idx,
    savedAt: new Date().toISOString(),
    storageState: state,
  }, null, 2));

  await context.storageState({ path: sessionFile });
  await browser.close();

  console.log(`\n🎉 Success! Session securely saved for ${email}.`);
  console.log(`⚠️ To prevent Google from detecting rapid automatic logins, this script will close now to completely clear its memory.`);
  console.log(`➡️  Please press UP ARROW and run the exact same command again to log into the next account!`);
  process.exit(0);
}

(async () => {
  for (let i = 0; i < accounts.length; i++) {
    await setup(accounts[i], i);
  }
  console.log('\n✅ All sessions saved!');
})();
