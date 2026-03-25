#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DOWNLOADS_DIR = path.join(ROOT, 'automation', 'downloads');

function extractPdfText(filePath) {
  try {
    const text = execSync(`pdftotext "${filePath}" -`, { maxBuffer: 10 * 1024 * 1024 }).toString();
    if (text.trim().length > 50) return text.trim();
  } catch (e) {
    return '';
  }
  try {
    const raw = fs.readFileSync(filePath, 'latin1');
    const matches = raw.match(/\(([^)]{2,})\)/g);
    if (matches) return matches.map(m => m.slice(1, -1)).join(' ').slice(0, 8000);
  } catch (e) {
    return '';
  }
  return '';
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

function findPdfs(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) out.push(p);
    }
  }
  return out.sort();
}

function fmtPct(x) {
  return (x * 100).toFixed(1) + '%';
}

function main() {
  const pdfs = findPdfs(DOWNLOADS_DIR);
  if (!pdfs.length) {
    console.log('No PDFs found under automation/downloads');
    return;
  }

  const results = [];
  for (const filePath of pdfs) {
    const base = filePath.replace(/\.[^/.]+$/, '');
    const txtPath = `${base}.txt`;
    const hasTxt = fs.existsSync(txtPath);
    let text = '';
    let source = 'pdf';

    if (hasTxt) {
      try {
        text = fs.readFileSync(txtPath, 'utf-8').replace(/^\uFEFF/, '').trim();
        source = 'txt';
      } catch {
        text = '';
      }
    }
    if (!text) {
      text = extractPdfText(filePath);
      source = 'pdf';
    }

    const stats = getTextQualityStats(text);
    const low = isLowQualityText(text);

    results.push({
      filePath,
      hasTxt,
      source,
      len: stats.len,
      alphaRatio: stats.alphaRatio,
      low,
    });
  }

  const lowList = results.filter(r => r.low && r.source === 'pdf');
  const okList = results.filter(r => !r.low || r.source === 'txt');

  console.log(`Total PDFs: ${results.length}`);
  console.log(`OK (txt or good pdf text): ${okList.length}`);
  console.log(`LOW QUALITY (needs txt): ${lowList.length}`);
  console.log('');

  if (lowList.length) {
    console.log('LOW QUALITY PDFs (recommend creating .txt):');
    for (const r of lowList) {
      console.log(`- ${path.relative(ROOT, r.filePath)} | len=${r.len} | alpha=${fmtPct(r.alphaRatio)}`);
    }
  } else {
    console.log('No low-quality PDFs detected.');
  }
}

main();
