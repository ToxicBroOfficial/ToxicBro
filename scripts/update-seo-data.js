#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const channelPath = path.join(rootDir, 'channel.json');
const indexPath = path.join(rootDir, 'index.html');
const achievementsPath = path.join(rootDir, 'achievements.html');
const siteDescription = 'Official website of ToxicBro, a Bangladeshi gaming creator and YouTuber. Explore gameplay videos, creator achievements, biography, and the ToxicArmy community.';

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function replaceOrThrow(content, pattern, replacement, label) {
  if (!pattern.test(content)) {
    throw new Error(`Could not update ${label}; expected pattern was not found.`);
  }
  return content.replace(pattern, replacement);
}

function toStatNumber(value, label) {
  const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label} value in channel.json.`);
  }
  return parsed;
}

const channelData = readJson(channelPath) || { stats: {} };
const stats = channelData.stats || {};
const subs = toStatNumber(stats.subscriberCount, 'subscriberCount');
const views = toStatNumber(stats.viewCount, 'viewCount');
const videos = toStatNumber(stats.videoCount, 'videoCount');

let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = replaceOrThrow(indexHtml, /<meta name="description" content="[^"]*"/, `<meta name="description" content="${siteDescription}"`, 'homepage meta description');
indexHtml = replaceOrThrow(indexHtml, /<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${siteDescription}"`, 'homepage Open Graph description');
indexHtml = replaceOrThrow(indexHtml, /<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${siteDescription}"`, 'homepage Twitter description');
indexHtml = replaceOrThrow(
  indexHtml,
  /const DEFAULT_FALLBACK_STATS = \{ subscribers: \d+, views: \d+, videos: \d+ \};/,
  `const DEFAULT_FALLBACK_STATS = { subscribers: ${subs}, views: ${views}, videos: ${videos} };`,
  'homepage fallback stats'
);

let achievementsHtml = fs.readFileSync(achievementsPath, 'utf8');
achievementsHtml = replaceOrThrow(
  achievementsHtml,
  /const fallbackCount = \d+;/,
  `const fallbackCount = ${subs};`,
  'achievements fallback subscriber count'
);

writeFile(indexPath, indexHtml);
writeFile(achievementsPath, achievementsHtml);
console.log(`Updated daily cached fallback stats: ${subs} subscribers, ${views} views, ${videos} videos.`);
