#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const videosPath = path.join(rootDir, 'videos.json');
const channelPath = path.join(rootDir, 'channel.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatDate(dateString) {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  return new Date(dateString).toISOString().slice(0, 10);
}

const videosData = readJson(videosPath) || { videos: [] };
const channelData = readJson(channelPath) || { stats: {} };

const urls = [
  {
    loc: 'https://toxicbro.pages.dev/',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    loc: 'https://toxicbro.pages.dev/pages/about.html',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: 'https://toxicbro.pages.dev/pages/biography.html',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: 'https://toxicbro.pages.dev/pages/achievements.html',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    loc: 'https://toxicbro.pages.dev/pages/contact.html',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'monthly',
    priority: '0.7',
  },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((url) => `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${url.lastmod}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`)
  .join('\n')}\n</urlset>\n`;

fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log(`Sitemap written with ${urls.length} URLs to ${path.relative(rootDir, sitemapPath)}`);
