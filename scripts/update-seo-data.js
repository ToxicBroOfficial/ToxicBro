#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const channelPath = path.join(rootDir, 'channel.json');
const indexPath = path.join(rootDir, 'index.html');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

const channelData = readJson(channelPath) || { stats: {} };
const stats = channelData.stats || {};
const subs = stats.subscriberCount || '0';
const views = stats.viewCount || '0';
const videos = stats.videoCount || '0';

const current = fs.readFileSync(indexPath, 'utf8');
const updated = current
  .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="Official website of ToxicBro, a Bangladeshi gaming creator and YouTuber. Explore gameplay videos, creator achievements, biography, and the ToxicArmy community."`)
  .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="Official website of ToxicBro, a Bangladeshi gaming creator and YouTuber. Explore gameplay videos, creator achievements, biography, and the ToxicArmy community."`)
  .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="Official website of ToxicBro, a Bangladeshi gaming creator and YouTuber. Explore gameplay videos, creator achievements, biography, and the ToxicArmy community."`)
  .replace(/"subscriberCount": "[^"]*"/, `"subscriberCount": "${subs}"`)
  .replace(/"viewCount": "[^"]*"/, `"viewCount": "${views}"`)
  .replace(/"videoCount": "[^"]*"/, `"videoCount": "${videos}"`);

writeFile(indexPath, updated);
console.log('Updated SEO metadata and homepage data references from channel stats.');
