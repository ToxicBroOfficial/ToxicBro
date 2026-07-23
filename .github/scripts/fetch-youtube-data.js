#!/usr/bin/env node
/**
 * ToxicBro YouTube Data Fetcher - OPTIMIZED
 * Runs via GitHub Actions hourly
 * 
 * Smart update strategy:
 * - ALWAYS: Fetch channel stats (subscribers, views, video count)
 * - CHECK: Use YouTube RSS feed to detect new videos (free, lightweight)
 * - IF NEW VIDEO: Fetch full video details and update videos.json
 * - IF ONLY STATS: Update channel.json only (no unnecessary commits)
 * 
 * Goals: Minimize API usage, commits, and Cloudflare deployments
 */

const fs = require('fs');
const path = require('path');

// Using Node.js built-in fetch (v18+)
const fetch = globalThis.fetch;

const CHANNEL_ID = 'UCXG8sste5hX3P26gWayrlkg';
const MAX_RESULTS = 50;
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const SITE_BASE_URL = 'https://toxicbro.me';

// Paths to output files
const VIDEOS_FILE = path.join(__dirname, '../../videos.json');
const CHANNEL_FILE = path.join(__dirname, '../../channel.json');
const SITEMAP_FILE = path.join(__dirname, '../../sitemap.xml');
const STATE_FILE = path.join(__dirname, '../../.github/scripts/state.json');

// API keys from GitHub Secrets
const API_KEY = process.env.YOUTUBE_API_KEY;
const API_KEY_FALLBACK = process.env.YOUTUBE_API_KEY_FALLBACK;

if (!API_KEY && !API_KEY_FALLBACK) {
  console.error('âŒ ERROR: YOUTUBE_API_KEY or YOUTUBE_API_KEY_FALLBACK not set in GitHub Secrets');
  process.exit(1);
}

console.log('ðŸš€ Starting Optimized YouTube Data Fetch...');
console.log(`â° Timestamp: ${new Date().toISOString()}`);
console.log('ðŸ“Š Update Strategy: Smart detection for stats + new videos only\n');

/**
 * Load previous state to detect new videos
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return state;
    }
  } catch (err) {
    console.warn(`âš ï¸  Could not load state: ${err.message}`);
  }
  return { lastVideoId: null, lastUpdate: null };
}

/**
 * Save state for next check
 */
function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error(`âŒ Could not save state: ${err.message}`);
  }
}

function generateSitemap() {
  try {
    const videosData = loadJsonFile(path.join(__dirname, '../../videos.json')) || { videos: [] };
    const channelData = loadJsonFile(path.join(__dirname, '../../channel.json')) || { stats: {}, updatedAt: new Date().toISOString() };
    const lastmod = formatDate(channelData.updatedAt || videosData.updatedAt);

    const urls = [
      {
        loc: `${SITE_BASE_URL}/`,
        lastmod,
        changefreq: 'weekly',
        priority: '1.0',
      },
      {
        loc: `${SITE_BASE_URL}/about.html`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.8',
      },
      {
        loc: `${SITE_BASE_URL}/achievements.html`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.8',
      },
      {
        loc: `${SITE_BASE_URL}/biography.html`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.8',
      },
      {
        loc: `${SITE_BASE_URL}/contact.html`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.7',
      },
      {
        loc: `${SITE_BASE_URL}/privacy-policy.html`,
        lastmod,
        changefreq: 'yearly',
        priority: '0.5',
      },
      {
        loc: `${SITE_BASE_URL}/disclaimer.html`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.5',
      },
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${url.lastmod}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`)
      .join('\n')}\n</urlset>\n`;

    fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
    console.log(`âœ… Generated sitemap: ${path.basename(SITEMAP_FILE)} (${urls.length} URLs)`);
  } catch (err) {
    console.error(`âŒ Could not generate sitemap: ${err.message}`);
  }
}

function loadJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`âš ï¸  Could not load ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

function formatDate(dateString) {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  return new Date(dateString).toISOString().slice(0, 10);
}

/**
 * Fetch latest video ID from RSS feed (FREE, LIGHTWEIGHT)
 * YouTube RSS feeds don't require authentication
 */
async function checkRSSForNewVideo() {
  console.log('ðŸ“¡ Checking YouTube RSS feed for new videos...');
  try {
    const response = await fetch(RSS_URL);
    if (!response.ok) {
      throw new Error(`RSS feed failed: ${response.status}`);
    }

    const xml = await response.text();
    
    // Extract first video ID from RSS XML
    // Example: <yt:videoId>dQw4w9WgXcQ</yt:videoId>
    const videoIdMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoIdMatch || !videoIdMatch[1]) {
      console.warn('âš ï¸  No videos found in RSS feed');
      return null;
    }

    const latestVideoId = videoIdMatch[1];
    console.log(`âœ“ Latest video from RSS: ${latestVideoId}`);
    
    // Extract publish date
    const publishMatch = xml.match(/<published>([^<]+)<\/published>/);
    const publishDate = publishMatch ? publishMatch[1] : new Date().toISOString();
    
    return {
      id: latestVideoId,
      published: publishDate,
    };

  } catch (err) {
    console.error(`âš ï¸  RSS feed check failed: ${err.message}`);
    console.warn('   Videos.json will remain unchanged from last update');
    console.warn('   Retrying RSS feed check in 1 hour');
    return null;
  }
}

/**
 * Fetch channel statistics (subscribers, views, video count)
 */
async function fetchChannelStats(apiKey) {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'statistics');
  url.searchParams.set('id', CHANNEL_ID);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Channel stats failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const statistics = data.items[0].statistics;
  return {
    subscriberCount: statistics.subscriberCount || '0',
    videoCount: statistics.videoCount || '0',
    viewCount: statistics.viewCount || '0',
  };
}

/**
 * Fetch recent videos using Search API
 */
async function fetchRecentVideos(apiKey, limit) {
  const searchTypes = [
    { eventType: undefined, count: Math.max(4, Math.floor(limit * 0.7)) },
    { eventType: 'live', count: Math.max(3, Math.ceil(limit * 0.15)) },
    { eventType: 'upcoming', count: Math.max(3, Math.ceil(limit * 0.15)) },
  ];

  const videoIds = [];
  for (const searchType of searchTypes) {
    const ids = await fetchSearchResultIds(apiKey, searchType.count, searchType.eventType);
    ids.forEach(id => {
      if (!videoIds.includes(id)) videoIds.push(id);
    });
  }

  if (videoIds.length === 0) {
    console.warn('âš ï¸  No valid video IDs found');
    return [];
  }

  const videos = await fetchVideoDetails(apiKey, videoIds);
  return videos
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, limit);
}

async function fetchSearchResultIds(apiKey, limit, eventType) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet,id');
  url.searchParams.set('channelId', CHANNEL_ID);
  url.searchParams.set('order', 'date');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(limit));
  url.searchParams.set('key', apiKey);

  if (eventType) {
    url.searchParams.set('eventType', eventType);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  if (!data.items) {
    console.warn('âš ï¸  No videos found in search results');
    return [];
  }

  return data.items
    .filter(item => item.id && item.id.kind === 'youtube#video' && item.id.videoId)
    .map(item => item.id.videoId);
}

/**
 * Fetch detailed video information (title, views, published date)
 */
async function fetchVideoDetails(apiKey, videoIds) {
  if (videoIds.length === 0) return [];

  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,statistics');
  url.searchParams.set('id', videoIds.join(','));
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Video details failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  if (!data.items) {
    console.warn('âš ï¸  No video details found');
    return [];
  }

  return videoIds
    .map(id => {
      const video = data.items.find(item => item.id === id);
      if (!video) return null;

      const broadcastType = video.snippet?.liveBroadcastContent;
      let type = 'video';
      if (broadcastType === 'live') {
        type = 'live';
      } else if (broadcastType === 'upcoming') {
        type = 'upcoming';
      }

      return {
        id,
        title: video.snippet?.title || 'Untitled',
        published: video.snippet?.publishedAt || new Date().toISOString(),
        views: video.statistics?.viewCount || '0',
        type,
      };
    })
    .filter(v => v !== null);
}

/**
 * Main execution - OPTIMIZED
 */
async function main() {
  try {
    let statsChanged = false;
    let videosChanged = false;
    let stateChanged = false;
    let filesToCommit = [];

    // ===== STEP 1: ALWAYS FETCH CHANNEL STATS (REQUIRED EVERY HOUR) =====
    console.log('\nðŸ“Š STEP 1: Fetching channel statistics...');
    let stats;
    let lastError;

    if (API_KEY) {
      try {
        stats = await fetchChannelStats(API_KEY);
        console.log('âœ… Primary API key successful');
      } catch (err) {
        console.warn(`âš ï¸  Primary API key failed: ${err.message}`);
        lastError = err;
      }
    }

    if (!stats && API_KEY_FALLBACK) {
      try {
        stats = await fetchChannelStats(API_KEY_FALLBACK);
        console.log('âœ… Fallback API key successful');
      } catch (err) {
        console.warn(`âš ï¸  Fallback API key failed: ${err.message}`);
        lastError = err;
      }
    }

    if (!stats) {
      throw lastError || new Error('No API keys available');
    }

    console.log(`  ðŸ‘¥ Subscribers: ${stats.subscriberCount}`);
    console.log(`  ðŸ‘ï¸  Total Views: ${stats.viewCount}`);
    console.log(`  ðŸŽ¬ Video Count: ${stats.videoCount}`);

    // Check if stats changed
    const existingChannel = loadChannelJson();
    if (existingChannel && 
        existingChannel.stats.subscriberCount === stats.subscriberCount &&
        existingChannel.stats.viewCount === stats.viewCount &&
        existingChannel.stats.videoCount === stats.videoCount) {
      console.log('  â„¹ï¸  Stats unchanged from last update');
      statsChanged = false;
    } else {
      console.log('  âœ“ Stats changed - will update channel.json');
      statsChanged = true;
      filesToCommit.push(CHANNEL_FILE);
    }

    // ===== STEP 2: CHECK FOR NEW VIDEOS (LIGHTWEIGHT - RSS FEED) =====
    console.log('\nðŸ” STEP 2: Checking for new videos...');
    const rssLatest = await checkRSSForNewVideo();
    const currentState = loadState();

    let newVideoDetected = false;
    if (rssLatest && rssLatest.id !== currentState.lastVideoId) {
      console.log(`âœ“ New video detected! Last was: ${currentState.lastVideoId || 'none'}`);
      newVideoDetected = true;
    } else {
      console.log('  â„¹ï¸  No new videos detected');
    }

    // ===== STEP 3: FETCH FULL VIDEO DATA ONLY IF NEW VIDEO DETECTED =====
    if (newVideoDetected) {
      console.log('\nðŸŽ¥ STEP 3: Fetching full video details (new video detected)...');
      let videos;

      if (API_KEY) {
        try {
          videos = await fetchRecentVideos(API_KEY, MAX_RESULTS);
          console.log(`âœ… Fetched ${videos.length} videos (primary key)`);
        } catch (err) {
          console.warn(`âš ï¸  Primary key video fetch failed: ${err.message}`);
          lastError = err;
        }
      }

      if ((!videos || videos.length === 0) && API_KEY_FALLBACK) {
        try {
          videos = await fetchRecentVideos(API_KEY_FALLBACK, MAX_RESULTS);
          console.log(`âœ… Fetched ${videos.length} videos (fallback key)`);
        } catch (err) {
          console.warn(`âš ï¸  Fallback key video fetch failed: ${err.message}`);
          lastError = err;
        }
      }

      if (!videos) {
        throw lastError || new Error('Could not fetch videos');
      }

      // Update videos.json
      const videosData = {
        videos,
        total: videos.length,
        updatedAt: new Date().toISOString(),
        cached: false,
      };

      fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videosData, null, 2));
      console.log(`âœ… Saved: ${VIDEOS_FILE}`);
      videosChanged = true;
      filesToCommit.push(VIDEOS_FILE);

      // Update state with new video ID
      saveState({
        lastVideoId: rssLatest.id,
        lastUpdate: new Date().toISOString(),
      });
      
      stateChanged = true;
      filesToCommit.push(STATE_FILE);
    } else {
      console.log('\nâ­ï¸  STEP 3: Skipping video fetch (no new videos)');
    }

    // ===== STEP 4: UPDATE CHANNEL.JSON (ALWAYS) =====
    if (statsChanged || videosChanged) {
      console.log('\nðŸ’¾ STEP 4: Updating channel.json...');
      const channelData = {
        stats,
        updatedAt: new Date().toISOString(),
        cached: false,
      };

      fs.writeFileSync(CHANNEL_FILE, JSON.stringify(channelData, null, 2));
      console.log(`âœ… Saved: ${CHANNEL_FILE}`);

      if (!filesToCommit.includes(CHANNEL_FILE)) {
        filesToCommit.push(CHANNEL_FILE);
      }
    }

    // ===== STEP 5: GENERATE SITEMAP (ALWAYS, AFTER UPDATE) =====
    generateSitemap();
    if (!filesToCommit.includes(SITEMAP_FILE)) {
      filesToCommit.push(SITEMAP_FILE);
    }

    // ===== FINAL SUMMARY =====
    console.log('\n' + '='.repeat(50));
    console.log('ðŸ“‹ UPDATE SUMMARY');
    console.log('='.repeat(50));
    console.log(`âœ“ Channel stats fetched: ${stats.subscriberCount} subscribers`);
    console.log(`âœ“ New videos detected: ${newVideoDetected ? 'YES' : 'NO'}`);
    console.log(`âœ“ Stats changed: ${statsChanged ? 'YES' : 'NO'}`);
    console.log(`âœ“ Videos regenerated: ${videosChanged ? 'YES' : 'NO'}`);
    console.log(`âœ“ State updated: ${stateChanged ? 'YES' : 'NO'}`);
    console.log(`âœ“ Files to commit: ${filesToCommit.length} file(s)`);
    filesToCommit.forEach(f => console.log(`  - ${path.basename(f)}`));
    console.log('='.repeat(50) + '\n');

    if (filesToCommit.length === 0) {
      console.log('âœ… No changes detected - skipping commit & deploy');
      console.log('ðŸ’¡ This keeps Git history clean and avoids unnecessary deployments');
      process.exit(0);
    }

    console.log('âœ… OPTIMIZATION STRATEGY WORKING:');
    if (videosChanged && !statsChanged) {
      console.log('  ðŸ“¹ New video found â†’ committed videos.json');
    } else if (statsChanged && !videosChanged) {
      console.log('  ðŸ“Š Stats updated only â†’ committed channel.json only');
    } else if (statsChanged && videosChanged) {
      console.log('  ðŸ”„ Both updated â†’ committed both files');
    }

    process.exit(0);

  } catch (err) {
    console.error('\nâŒ Error during YouTube data fetch:');
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

/**
 * Helper: Load existing channel.json
 */
function loadChannelJson() {
  try {
    if (fs.existsSync(CHANNEL_FILE)) {
      return JSON.parse(fs.readFileSync(CHANNEL_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn(`Could not load existing channel.json: ${err.message}`);
  }
  return null;
}

main();




