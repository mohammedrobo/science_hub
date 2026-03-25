#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '../..');
const DOWNLOADS = path.join(ROOT, 'automation', 'downloads');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COURSE_MAP = {
  botany: 'B101',
  chemistry: 'C102',
  chemistry_practical: 'C104',
  computer_science: 'COMP101',
  geology: 'G102',
  math: 'M102',
  physics: 'P102',
  physics_practical: 'P104',
  zoology: 'Z102'
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.toLowerCase().endsWith('.pdf')) out.push(full);
  }
  return out;
}

function baseName(filePath) {
  return path.basename(filePath, path.extname(filePath)).replace(/\s+/g, ' ').trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const reset = process.argv.includes('--reset');

  if (!fs.existsSync(DOWNLOADS)) {
    console.error('Downloads folder not found:', DOWNLOADS);
    process.exit(1);
  }

  const files = walk(DOWNLOADS);
  if (files.length === 0) {
    console.log('No PDF files found.');
    return;
  }

  if (reset && !dryRun) {
    const { error: resetError } = await supabase.from('automation_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (resetError) throw resetError;
    console.log('Cleared automation_queue (reset).');
  }

  let existing = new Set();
  if (!force) {
    const { data: existingRows, error } = await supabase
      .from('automation_queue')
      .select('primary_pdf_path');
    if (error) throw error;
    existing = new Set((existingRows || []).map(r => r.primary_pdf_path));
  }

  const toInsert = [];
  for (const file of files) {
    if (!force && existing.has(file)) continue;

    const rel = path.relative(DOWNLOADS, file).split(path.sep);
    const topFolder = (rel[0] || '').toLowerCase();
    const courseCode = COURSE_MAP[topFolder];
    if (!courseCode) continue;

    toInsert.push({
      status: 'pending',
      source: 'local_seed',
      course_code: courseCode,
      course_name: courseCode,
      course_name_ar: '',
      instructor: null,
      lecture_number: null,
      lecture_title: baseName(file) || courseCode,
      primary_pdf_path: file,
      primary_pdf_type: 'local',
      can_use_gemini: true,
      youtube_url: null,
      youtube_from_telegram: false,
      telegram_msg_ids: [],
      added_at: new Date().toISOString(),
    });
  }

  if (toInsert.length === 0) {
    console.log('No new files to insert.');
    return;
  }

  if (dryRun) {
    console.log(`Dry run: would insert ${toInsert.length} rows.${reset ? ' (reset requested)' : ''}`);
    return;
  }

  const { error: insertError } = await supabase.from('automation_queue').insert(toInsert);
  if (insertError) throw insertError;

  console.log(`Inserted ${toInsert.length} new rows into automation_queue.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
