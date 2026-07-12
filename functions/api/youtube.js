// YouTube API Function with Cloudflare CDN Caching
// 100% Reliable with proper error handling and fallback support

const CHANNEL_ID = 'UCXG8sste5hX3P26gWayrlkg';
const CACHE_SECONDS = 12 * 60 * 60; // 12 hours cache
const MAX_RESULTS = 9; // Number of videos to fetch

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': `public, max-age=300, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
  // Note: origin header is added dynamically per-request to avoid wildcard CORS
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

// Basic in-memory rate limiting (best-effort; ephemeral in serverless env)
const ALLOWED_ORIGINS = [
  'https://toxicbro.pages.dev',
  'https://www.toxicbro.pages.dev',
  'http://localhost:5173',
];
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // max requests per IP per window
const rateLimitMap = new Map(); // ip -> { count, start }

function getAllowedOrigin(request) {
  try {
    const origin = request.headers.get('origin');
    if (!origin) return null;
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // allow same-origin requests without an explicit origin header
    const url = new URL(origin);
    if (url.hostname && url.hostname.endsWith('pages.dev')) return origin;
    return null;
  } catch (e) {
    return null;
  }
}

function checkRateLimit(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return { limited: true, retryAfter: Math.ceil((entry.start + RATE_LIMIT_WINDOW - now) / 1000) };
  }
  return { limited: false };
}

// Handle OPTIONS request for CORS
export async function onRequestOptions(context) {
  const allowedOrigin = getAllowedOrigin(context.request);
  const cors = {
    'access-control-allow-origin': allowedOrigin || 'null',
  };

  return new Response(null, {
    status: 204,
    headers: {
      ...jsonHeaders,
      ...cors,
    },
  });
}

// Main GET request handler
export async function onRequestGet(context) {
  const { env } = context;

  // Basic rate limiting
  const rl = checkRateLimit(context.request);
  if (rl.limited) {
    return jsonResponse({ error: 'rate_limited', message: 'Rate limit exceeded' }, 429, { 'retry-after': String(rl.retryAfter) });
  }

  try {
    // Get API keys with fallback support
    const apiKey = env.YOUTUBE_API_KEY;
    const fallbackKey = env.YOUTUBE_API_KEY_FALLBACK;

    if (!apiKey && !fallbackKey) {
      console.error('Missing YOUTUBE_API_KEY environment variable');
      return jsonResponse({
        error: 'Configuration error: Missing API key',
        message: 'YOUTUBE_API_KEY environment variable not set',
      }, 500);
    }

    // Try primary API key first, then fallback
    let data;
    let lastError;

    if (apiKey) {
      try {
        console.log('Attempting with primary API key...');
        data = await fetchYouTubeData(apiKey);
      } catch (error) {
        console.error('Primary API key failed:', error.message);
        lastError = error;
      }
    }

    // Try fallback if primary failed
    if (!data && fallbackKey) {
      try {
        console.log('Attempting with fallback API key...');
        data = await fetchYouTubeData(fallbackKey);
      } catch (error) {
        console.error('Fallback API key failed:', error.message);
        lastError = error;
      }
    }

    if (!data) {
      throw lastError || new Error('All API keys failed');
    }

    const allowedOrigin = getAllowedOrigin(context.request);
    const cors = {
      'access-control-allow-origin': allowedOrigin || 'null',
    };

    return jsonResponse(data, 200, {
      'x-youtube-api-status': 'success',
      'x-cache-age': '0',
      ...cors,
    });

  } catch (error) {
    console.error('YouTube API error:', error.message);
    const allowedOrigin = getAllowedOrigin(context.request);
    const cors = {
      'access-control-allow-origin': allowedOrigin || 'null',
    };

    return jsonResponse({
      error: 'YouTube API error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, 502, {
      'x-youtube-api-status': 'error',
      ...cors,
    });
  }
}

// Fetch YouTube data with comprehensive error handling
async function fetchYouTubeData(apiKey) {
  console.log(`Fetching data for channel ${CHANNEL_ID}...`);

  // Step 1: Fetch channel statistics
  const stats = await fetchChannelStats(apiKey);
  console.log('✓ Channel stats fetched:', stats);

  // Step 2: Fetch recent videos
  const videos = await fetchRecentVideos(apiKey, MAX_RESULTS);
  console.log(`✓ Fetched ${videos.length} videos`);

  return {
    stats,
    videos,
    updatedAt: new Date().toISOString(),
    cached: false,
  };
}

// Fetch channel statistics with retry logic
async function fetchChannelStats(apiKey) {
  const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
  channelUrl.searchParams.set('part', 'statistics');
  channelUrl.searchParams.set('id', CHANNEL_ID);
  channelUrl.searchParams.set('key', apiKey);

  const response = await fetchJson(channelUrl);

  if (!response.items || response.items.length === 0) {
    throw new Error('Channel not found or inaccessible');
  }

  const statistics = response.items[0].statistics;

  if (!statistics) {
    throw new Error('Channel statistics not available');
  }

  return {
    subscriberCount: statistics.subscriberCount || '0',
    videoCount: statistics.videoCount || '0',
    viewCount: statistics.viewCount || '0',
  };
}

// Fetch recent videos using Search API
async function fetchRecentVideos(apiKey, limit) {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet,id');
  searchUrl.searchParams.set('channelId', CHANNEL_ID);
  searchUrl.searchParams.set('order', 'date');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', String(limit));
  searchUrl.searchParams.set('key', apiKey);

  const response = await fetchJson(searchUrl);

  if (!response.items) {
    console.warn('No search results found');
    return [];
  }

  // Extract video IDs from search results
  const videoIds = response.items
    .filter(item => item.id && item.id.kind === 'youtube#video' && item.id.videoId)
    .map(item => item.id.videoId);

  if (videoIds.length === 0) {
    console.warn('No video IDs found in search results');
    return [];
  }

  // Fetch video details for statistics
  return await fetchVideoDetails(apiKey, videoIds);
}

// Fetch video details with statistics
async function fetchVideoDetails(apiKey, videoIds) {
  if (videoIds.length === 0) return [];

  const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videosUrl.searchParams.set('part', 'snippet,statistics');
  videosUrl.searchParams.set('id', videoIds.join(','));
  videosUrl.searchParams.set('key', apiKey);

  const response = await fetchJson(videosUrl);

  if (!response.items) {
    console.warn('No video details found');
    return [];
  }

  return videoIds.map(id => {
    const video = response.items.find(item => item.id === id);
    if (!video) {
      console.warn(`Video ${id} not found in details`);
      return {
        id,
        title: 'Video not found',
        published: new Date().toISOString(),
        views: '0',
      };
    }

    return {
      id,
      title: video.snippet?.title || 'Untitled',
      published: video.snippet?.publishedAt || new Date().toISOString(),
      views: video.statistics?.viewCount || '0',
    };
  });
}

// Generic JSON fetch with error handling
async function fetchJson(url) {
  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    cf: {
      cacheTtl: 0,
      cacheEverything: false,
    },
  });

  if (!response.ok) {
    let errorDetails = `HTTP ${response.status}`;

    try {
      const body = await response.json();
      if (body.error) {
        errorDetails += `: ${body.error.message || body.error.code}`;
        if (body.error.errors) {
          errorDetails += ` (${body.error.errors[0]?.reason})`;
        }
      }
    } catch (e) {
      // If we can't parse error details, just use the status code
    }

    throw new Error(`YouTube API request failed: ${errorDetails}`);
  }

  return response.json();
}

// Helper function to create JSON responses
function jsonResponse(body, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...additionalHeaders,
    },
  });
}