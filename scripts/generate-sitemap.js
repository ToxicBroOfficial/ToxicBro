#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const videosPath = path.join(rootDir, 'videos.json');
const channelPath = path.join(rootDir, 'channel.json');
const mainChannelUrl = 'https://www.youtube.com/@ToxicBroYT/';

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
const videos = Array.isArray(videosData.videos) ? videosData.videos : [];

const urls = [
  {
    loc: 'https://toxicbro.pages.dev/',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    loc: mainChannelUrl,
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'weekly',
    priority: '0.95',
  },
  {
    loc: 'https://toxicbro.pages.dev/#videos',
    lastmod: formatDate(videos[0]?.published),
    changefreq: 'weekly',
    priority: '0.9',
  },
  {
    loc: 'https://toxicbro.pages.dev/#about',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: 'https://toxicbro.pages.dev/#community',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: 'https://toxicbro.pages.dev/#contact',
    lastmod: formatDate(channelData.updatedAt || videosData.updatedAt),
    changefreq: 'monthly',
    priority: '0.7',
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

function inferVideoType(video) {
  const title = `${video?.title || ''} ${video?.description || ''}`.toLowerCase();
  if (video?.type === 'live' || title.includes(' live ') || title.includes('live') || title.includes('stream')) {
    return 'live';
  }
  if (video?.type === 'upcoming' || title.includes('upcoming') || title.includes('premiere')) {
    return 'upcoming';
  }
  return 'video';
}

for (const video of videos) {
  if (!video?.id) continue;
  const type = inferVideoType(video);
  urls.push({
    loc: `https://www.youtube.com/watch?v=${video.id}`,
    lastmod: formatDate(video.published),
    changefreq: type === 'live' ? 'daily' : type === 'upcoming' ? 'weekly' : 'monthly',
    priority: type === 'live' ? '0.8' : type === 'upcoming' ? '0.7' : '0.6',
  });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((url) => `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${url.lastmod}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`)
  .join('\n')}\n</urlset>\n`;

fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log(`Sitemap written with ${urls.length} URLs to ${path.relative(rootDir, sitemapPath)}`);
