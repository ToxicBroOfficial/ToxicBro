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

// Paths to output files
const VIDEOS_FILE = path.join(__dirname, '../../videos.json');
const CHANNEL_FILE = path.join(__dirname, '../../channel.json');
const STATE_FILE = path.join(__dirname, '../../.github/scripts/state.json');

// API keys from GitHub Secrets
const API_KEY = process.env.YOUTUBE_API_KEY;
const API_KEY_FALLBACK = process.env.YOUTUBE_API_KEY_FALLBACK;

if (!API_KEY && !API_KEY_FALLBACK) {
  console.error('❌ ERROR: YOUTUBE_API_KEY or YOUTUBE_API_KEY_FALLBACK not set in GitHub Secrets');
  process.exit(1);
}

console.log('🚀 Starting Optimized YouTube Data Fetch...');
console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
console.log('📊 Update Strategy: Smart detection for stats + new videos only\n');

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
    console.warn(`⚠️  Could not load state: ${err.message}`);
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
    console.error(`❌ Could not save state: ${err.message}`);
  }
}

/**
 * Fetch latest video ID from RSS feed (FREE, LIGHTWEIGHT)
 * YouTube RSS feeds don't require authentication
 */
async function checkRSSForNewVideo() {
  console.log('📡 Checking YouTube RSS feed for new videos...');
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
      console.warn('⚠️  No videos found in RSS feed');
      return null;
    }

    const latestVideoId = videoIdMatch[1];
    console.log(`✓ Latest video from RSS: ${latestVideoId}`);
    
    // Extract publish date
    const publishMatch = xml.match(/<published>([^<]+)<\/published>/);
    const publishDate = publishMatch ? publishMatch[1] : new Date().toISOString();
    
    return {
      id: latestVideoId,
      published: publishDate,
    };

  } catch (err) {
    console.error(`⚠️  RSS feed check failed: ${err.message}`);
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
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet,id');
  url.searchParams.set('channelId', CHANNEL_ID);
  url.searchParams.set('order', 'date');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(limit));
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  if (!data.items) {
    console.warn('⚠️  No videos found in search results');
    return [];
  }

  // Extract video IDs from search results
  const videoIds = data.items
    .filter(item => item.id && item.id.kind === 'youtube#video' && item.id.videoId)
    .map(item => item.id.videoId);

  if (videoIds.length === 0) {
    console.warn('⚠️  No valid video IDs found');
    return [];
  }

  // Fetch full video details including statistics
  return await fetchVideoDetails(apiKey, videoIds);
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
    console.warn('⚠️  No video details found');
    return [];
  }

  return videoIds
    .map(id => {
      const video = data.items.find(item => item.id === id);
      if (!video) return null;

      return {
        id,
        title: video.snippet?.title || 'Untitled',
        published: video.snippet?.publishedAt || new Date().toISOString(),
        views: video.statistics?.viewCount || '0',
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
    console.log('\n📊 STEP 1: Fetching channel statistics...');
    let stats;
    let lastError;

    if (API_KEY) {
      try {
        stats = await fetchChannelStats(API_KEY);
        console.log('✅ Primary API key successful');
      } catch (err) {
        console.warn(`⚠️  Primary API key failed: ${err.message}`);
        lastError = err;
      }
    }

    if (!stats && API_KEY_FALLBACK) {
      try {
        stats = await fetchChannelStats(API_KEY_FALLBACK);
        console.log('✅ Fallback API key successful');
      } catch (err) {
        console.warn(`⚠️  Fallback API key failed: ${err.message}`);
        lastError = err;
      }
    }

    if (!stats) {
      throw lastError || new Error('No API keys available');
    }

    console.log(`  👥 Subscribers: ${stats.subscriberCount}`);
    console.log(`  👁️  Total Views: ${stats.viewCount}`);
    console.log(`  🎬 Video Count: ${stats.videoCount}`);

    // Check if stats changed
    const existingChannel = loadChannelJson();
    if (existingChannel && 
        existingChannel.stats.subscriberCount === stats.subscriberCount &&
        existingChannel.stats.viewCount === stats.viewCount &&
        existingChannel.stats.videoCount === stats.videoCount) {
      console.log('  ℹ️  Stats unchanged from last update');
      statsChanged = false;
    } else {
      console.log('  ✓ Stats changed - will update channel.json');
      statsChanged = true;
      filesToCommit.push(CHANNEL_FILE);
    }

    // ===== STEP 2: CHECK FOR NEW VIDEOS (LIGHTWEIGHT - RSS FEED) =====
    console.log('\n🔍 STEP 2: Checking for new videos...');
    const rssLatest = await checkRSSForNewVideo();
    const currentState = loadState();

    let newVideoDetected = false;
    if (rssLatest && rssLatest.id !== currentState.lastVideoId) {
      console.log(`✓ New video detected! Last was: ${currentState.lastVideoId || 'none'}`);
      newVideoDetected = true;
    } else {
      console.log('  ℹ️  No new videos detected');
    }

    // ===== STEP 3: FETCH FULL VIDEO DATA ONLY IF NEW VIDEO DETECTED =====
    if (newVideoDetected) {
      console.log('\n🎥 STEP 3: Fetching full video details (new video detected)...');
      let videos;

      if (API_KEY) {
        try {
          videos = await fetchRecentVideos(API_KEY, MAX_RESULTS);
          console.log(`✅ Fetched ${videos.length} videos (primary key)`);
        } catch (err) {
          console.warn(`⚠️  Primary key video fetch failed: ${err.message}`);
          lastError = err;
        }
      }

      if ((!videos || videos.length === 0) && API_KEY_FALLBACK) {
        try {
          videos = await fetchRecentVideos(API_KEY_FALLBACK, MAX_RESULTS);
          console.log(`✅ Fetched ${videos.length} videos (fallback key)`);
        } catch (err) {
          console.warn(`⚠️  Fallback key video fetch failed: ${err.message}`);
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
      console.log(`✅ Saved: ${VIDEOS_FILE}`);
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
      console.log('\n⏭️  STEP 3: Skipping video fetch (no new videos)');
    }

    // ===== STEP 4: UPDATE CHANNEL.JSON (ALWAYS) =====
    if (statsChanged || videosChanged) {
      console.log('\n💾 STEP 4: Updating channel.json...');
      const channelData = {
        stats,
        updatedAt: new Date().toISOString(),
        cached: false,
      };

      fs.writeFileSync(CHANNEL_FILE, JSON.stringify(channelData, null, 2));
      console.log(`✅ Saved: ${CHANNEL_FILE}`);

      if (!filesToCommit.includes(CHANNEL_FILE)) {
        filesToCommit.push(CHANNEL_FILE);
      }
    }

    // ===== FINAL SUMMARY =====
    console.log('\n' + '='.repeat(50));
    console.log('📋 UPDATE SUMMARY');
    console.log('='.repeat(50));
    console.log(`✓ Channel stats fetched: ${stats.subscriberCount} subscribers`);
    console.log(`✓ New videos detected: ${newVideoDetected ? 'YES' : 'NO'}`);
    console.log(`✓ Stats changed: ${statsChanged ? 'YES' : 'NO'}`);
    console.log(`✓ Videos regenerated: ${videosChanged ? 'YES' : 'NO'}`);
    console.log(`✓ State updated: ${stateChanged ? 'YES' : 'NO'}`);
    console.log(`✓ Files to commit: ${filesToCommit.length} file(s)`);
    filesToCommit.forEach(f => console.log(`  - ${path.basename(f)}`));
    console.log('='.repeat(50) + '\n');

    if (filesToCommit.length === 0) {
      console.log('✅ No changes detected - skipping commit & deploy');
      console.log('💡 This keeps Git history clean and avoids unnecessary deployments');
      process.exit(0);
    }

    console.log('✅ OPTIMIZATION STRATEGY WORKING:');
    if (videosChanged && !statsChanged) {
      console.log('  📹 New video found → committed videos.json');
    } else if (statsChanged && !videosChanged) {
      console.log('  📊 Stats updated only → committed channel.json only');
    } else if (statsChanged && videosChanged) {
      console.log('  🔄 Both updated → committed both files');
    }

    process.exit(0);

  } catch (err) {
    console.error('\n❌ Error during YouTube data fetch:');
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
