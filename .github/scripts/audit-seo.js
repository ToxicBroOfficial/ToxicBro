const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results.push(...findHtmlFiles(full));
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

function extractHead(content) {
  const m = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : '';
}

function checkMeta(head, file) {
  const missing = [];
  const checks = [
    {name:'title', re: /<title[^>]*>[^<]+<\/title>/i},
    {name:'description', re: /<meta[^>]+name=["']description["'][^>]*>/i},
    {name:'canonical', re: /<link[^>]+rel=["']canonical["'][^>]*>/i},
    {name:'robots', re: /<meta[^>]+name=["']robots["'][^>]*>/i},
    {name:'og', re: /<meta[^>]+property=["']og:[^"']+["'][^>]*>/i},
    {name:'twitter', re: /<meta[^>]+name=["']twitter:[^"']+["'][^>]*>/i},
  ];
  checks.forEach(c => { if (!c.re.test(head)) missing.push(c.name); });
  return missing;
}

function extractJsonLd(content) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/ig;
  const matches = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

function validateJsonLd(block, file) {
  try {
    JSON.parse(block);
    return null;
  } catch (err) {
    return err.message;
  }
}

// Run from repository root (two levels up from .github/scripts)
const root = path.resolve(__dirname, '..', '..');
const files = findHtmlFiles(root);
if (files.length === 0) {
  console.error('No HTML files found');
  process.exit(2);
}

let totalIssues = 0;
console.log('Auditing HTML files for SEO and JSON-LD...');
files.forEach(f => {
  const rel = path.relative(root, f);
  // Skip Google verification files which intentionally contain only the verification token
  const base = path.basename(f);
  if (/^google.*\.html$/i.test(base)) {
    console.log('\n---');
    console.log('File:', rel);
    console.log('  Skipping Google verification file');
    return;
  }
  const content = fs.readFileSync(f, 'utf8');
  const head = extractHead(content);
  const missing = checkMeta(head, f);
  const jsonLdBlocks = extractJsonLd(content);

  console.log('\n---');
  console.log('File:', rel);
  if (missing.length) {
    totalIssues += missing.length;
    console.log('  Missing meta sections:', missing.join(', '));
  } else {
    console.log('  Core meta tags: OK');
  }

  if (jsonLdBlocks.length === 0) {
    console.log('  JSON-LD: none found');
  } else {
    jsonLdBlocks.forEach((b, i) => {
      const err = validateJsonLd(b, f);
      if (err) {
        totalIssues++;
        console.log(`  JSON-LD block ${i+1}: INVALID -> ${err}`);
      } else {
        console.log(`  JSON-LD block ${i+1}: OK`);
      }
    });
  }
});

console.log('\nAudit complete. Total issues found:', totalIssues);
process.exit(totalIssues > 0 ? 1 : 0);
