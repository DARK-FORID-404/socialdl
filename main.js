// main.js - Self-Contained Social Media Downloader
// No external APIs needed - Direct scraping
// Deno Deploy - Production Ready

const DEVELOPER = {
  name: "DARK FORID",
  github: "https://github.com/DARK-FORID-404",
  telegram: "https://t.me/@UnknownXBoyX"
};

// Cache system
const cache = new Map();
const CACHE_TTL = 300000;

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Detect platform
function detectPlatform(url) {
  if (/(youtube\.com|youtu\.be)/i.test(url)) return "youtube";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/(facebook\.com|fb\.watch)/i.test(url)) return "facebook";
  if (/instagram\.com/i.test(url)) return "instagram";
  return "unknown";
}

// Fetch HTML helper
async function fetchHTML(url) {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      }
    });
    if (resp.status === 200) {
      return await resp.text();
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================
// YOUTUBE EXTRACTOR - Direct parsing
// =============================================
async function extractYouTube(url) {
  const cacheKey = "yt_" + url;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|$)/) || 
                  url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/);
    if (!match) return null;
    const id = match[1];

    const html = await fetchHTML("https://www.youtube.com/watch?v=" + id);
    if (!html) return null;
    
    // Get video info from ytInitialPlayerResponse
    const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/s);
    if (!playerMatch) return null;
    
    const player = JSON.parse(playerMatch[1]);
    const vd = player.videoDetails || {};
    const mf = (player.microformat || {}).playerMicroformatRenderer || {};
    
    // Extract streaming data
    const streamingData = player.streamingData || {};
    const formats = streamingData.formats || [];
    const adaptiveFormats = streamingData.adaptiveFormats || [];
    const allFormats = [...formats, ...adaptiveFormats];
    
    const videos = [];
    const audios = [];
    
    for (let i = 0; i < allFormats.length; i++) {
      const f = allFormats[i];
      const mimeType = f.mimeType || "";
      
      if (mimeType.includes("video") && f.url) {
        videos.push({
          quality: f.qualityLabel || f.quality || "720p",
          url: f.url,
          itag: f.itag,
          mimeType: mimeType,
          bitrate: f.bitrate || 0,
          width: f.width || 0,
          height: f.height || 0
        });
      }
      
      if (mimeType.includes("audio") && f.url) {
        audios.push({
          quality: "audio",
          url: f.url,
          itag: f.itag,
          mimeType: mimeType,
          bitrate: f.bitrate || 0
        });
      }
    }
    
    // Sort by quality
    videos.sort((a, b) => (b.height || 0) - (a.height || 0));
    
    const result = {
      id: vd.videoId || id,
      title: vd.title || "YouTube Video",
      description: (vd.shortDescription || "").slice(0, 300),
      uploader: vd.author || "Unknown",
      uploader_id: vd.channelId || "",
      duration: parseInt(vd.lengthSeconds, 10) || 0,
      viewCount: parseInt(vd.viewCount, 10) || 0,
      isLive: vd.isLiveContent || false,
      uploadDate: mf.uploadDate || "",
      thumbnail: "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg",
      medias: {
        video: videos,
        audio: audios
      },
      url: "https://www.youtube.com/watch?v=" + id
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    return null;
  }
}

// =============================================
// TIKTOK EXTRACTOR - Direct scraping
// =============================================
async function extractTikTok(url) {
  const cacheKey = "tt_" + url;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchHTML(url);
    if (!html) return null;
    
    // Try to find video data in script tags
    const scriptMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    let data = null;
    
    if (scriptMatch) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        if (jsonData && jsonData.__DEFAULT_SCOPE__) {
          const scope = jsonData.__DEFAULT_SCOPE__;
          if (scope['webapp.video-detail']) {
            data = scope['webapp.video-detail'];
          } else if (scope['VideoDetail']) {
            data = scope['VideoDetail'];
          }
        }
      } catch (e) {}
    }
    
    // Fallback: search for video URLs in HTML
    let videoUrl = "";
    let coverUrl = "";
    let title = "TikTok Video";
    let author = "Unknown";
    let duration = 0;
    
    // Try to find video URL from various patterns
    const videoMatch = html.match(/<video[^>]*src="([^"]*?)"/i) ||
                      html.match(/src="([^"]*?\.mp4[^"]*?)"/i) ||
                      html.match(/"videoUrl":"([^"]*?)"/i) ||
                      html.match(/"playAddr":"([^"]*?)"/i);
    
    if (videoMatch) {
      videoUrl = videoMatch[1].replace(/\\/g, "");
    }
    
    // Try to find cover image
    const coverMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                       html.match(/<img[^>]*class="[^"]*cover[^"]*"[^>]*src="([^"]+)"/i) ||
                       html.match(/"cover":"([^"]*?)"/i);
    
    if (coverMatch) {
      coverUrl = coverMatch[1];
    }
    
    // Try to get title
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                       html.match(/<title>([^<]*?)<\/title>/i);
    
    if (titleMatch) {
      title = titleMatch[1].replace(/\| TikTok$/, "").trim();
    }
    
    // Try to get author
    const authorMatch = html.match(/<meta\s+property="og:url"[^>]*content="[^"]*@([^"]+)"/i) ||
                        html.match(/@([a-zA-Z0-9_\.]+)/);
    
    if (authorMatch) {
      author = authorMatch[1];
    }
    
    // If we got data from JSON, extract more info
    if (data) {
      if (data.itemInfo && data.itemInfo.itemStruct) {
        const item = data.itemInfo.itemStruct;
        videoUrl = item.video?.playAddr || item.video?.downloadAddr || videoUrl;
        coverUrl = item.video?.cover || item.video?.dynamicCover || coverUrl;
        title = item.desc || title;
        author = item.author?.uniqueId || author;
        duration = item.video?.duration || duration;
      } else if (data.videoData) {
        const item = data.videoData;
        videoUrl = item.video?.playAddr || item.video?.downloadAddr || videoUrl;
        coverUrl = item.video?.cover || coverUrl;
        title = item.desc || title;
        author = item.author?.uniqueId || author;
        duration = item.video?.duration || duration;
      }
    }
    
    if (!videoUrl) return null;
    
    const result = {
      id: Date.now().toString(),
      title: title,
      uploader: author,
      duration: duration,
      thumbnail: coverUrl,
      medias: {
        video: [{ quality: "720p", url: videoUrl }],
        audio: []
      },
      url: url
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    return null;
  }
}

// =============================================
// FACEBOOK EXTRACTOR - Direct scraping
// =============================================
async function extractFacebook(url) {
  const cacheKey = "fb_" + url;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchHTML(url);
    if (!html) return null;
    
    // Try to find video URLs from various patterns
    const videoUrls = [];
    
    // Look for video URL in various formats
    const patterns = [
      /"playable_url":"([^"]+)"/g,
      /"playable_url_quality_hd":"([^"]+)"/g,
      /"src":"([^"]*?\.mp4[^"]*)"/g,
      /<video[^>]*src="([^"]*?\.mp4[^"]*)"/gi,
      /"browser_native_hd_url":"([^"]+)"/g,
      /"browser_native_sd_url":"([^"]+)"/g,
      /"hd_src":"([^"]+)"/g,
      /"sd_src":"([^"]+)"/g,
      /video_alt":"([^"]*?\.mp4[^"]*)"/g
    ];
    
    for (let p = 0; p < patterns.length; p++) {
      const matches = html.matchAll(patterns[p]);
      for (const match of matches) {
        const url = match[1].replace(/\\/g, "");
        if (url.startsWith("http") && !videoUrls.includes(url)) {
          videoUrls.push(url);
        }
      }
    }
    
    // Try to get title
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                       html.match(/<title>([^<]*?)<\/title>/i);
    
    const title = titleMatch ? titleMatch[1].replace(/ \| Facebook$/, "").trim() : "Facebook Video";
    
    // Try to get thumbnail
    const thumbMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    const thumbnail = thumbMatch ? thumbMatch[1] : "";
    
    // Create video entries
    const videos = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const quality = i === 0 ? "HD" : "SD";
      videos.push({
        quality: quality,
        url: videoUrls[i]
      });
    }
    
    if (videos.length === 0) return null;
    
    const result = {
      id: Date.now().toString(),
      title: title,
      uploader: "Facebook User",
      duration: 0,
      thumbnail: thumbnail,
      medias: { video: videos },
      url: url
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    return null;
  }
}

// =============================================
// INSTAGRAM EXTRACTOR - Direct scraping
// =============================================
async function extractInstagram(url) {
  const cacheKey = "ig_" + url;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // Instagram requires a different approach - use the embed or oEmbed API
    // First try oEmbed
    let videoUrl = "";
    let thumbnail = "";
    let title = "Instagram Post";
    let uploader = "Unknown";
    
    // Try oEmbed endpoint (this is free and doesn't require API key)
    const embedUrl = "https://api.instagram.com/oembed?url=" + encodeURIComponent(url);
    try {
      const oembedResp = await fetch(embedUrl);
      if (oembedResp.status === 200) {
        const oembedData = await oembedResp.json();
        title = oembedData.title || title;
        thumbnail = oembedData.thumbnail_url || thumbnail;
        uploader = oembedData.author_name || uploader;
      }
    } catch (e) {}
    
    // Try to get the page HTML
    const html = await fetchHTML(url);
    if (html) {
      // Look for video URL
      const videoMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i) ||
                         html.match(/<meta\s+property="og:video:url"\s+content="([^"]+)"/i) ||
                         html.match(/"video_url":"([^"]+)"/i) ||
                         html.match(/"video_versions":\[\{"url":"([^"]+)"/i);
      
      if (videoMatch) {
        videoUrl = videoMatch[1].replace(/\\/g, "");
      }
      
      // If no video, look for image
      if (!videoUrl) {
        const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                         html.match(/"display_url":"([^"]+)"/i);
        if (imgMatch) {
          thumbnail = imgMatch[1].replace(/\\/g, "");
        }
      }
      
      // Try to get title
      const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (titleMatch) {
        title = titleMatch[1];
      }
      
      // Try to get uploader
      const uploaderMatch = html.match(/@([a-zA-Z0-9_\.]+)/);
      if (uploaderMatch) {
        uploader = uploaderMatch[1];
      }
    }
    
    // If we have a video URL or image URL
    const videos = [];
    if (videoUrl) {
      videos.push({ quality: "720p", url: videoUrl });
    } else if (thumbnail) {
      videos.push({ quality: "image", url: thumbnail });
    } else {
      return null;
    }
    
    const result = {
      id: Date.now().toString(),
      title: title,
      uploader: uploader,
      duration: 0,
      thumbnail: thumbnail,
      medias: { video: videos },
      url: url
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    return null;
  }
}

// =============================================
// UNIVERSAL EXTRACTOR
// =============================================
async function extractUniversal(url) {
  const platform = detectPlatform(url);
  
  let result = null;
  if (platform === "youtube") {
    result = await extractYouTube(url);
  } else if (platform === "tiktok") {
    result = await extractTikTok(url);
  } else if (platform === "facebook") {
    result = await extractFacebook(url);
  } else if (platform === "instagram") {
    result = await extractInstagram(url);
  }
  
  if (!result) {
    return {
      success: false,
      platform: platform,
      error: "Could not extract media from this URL. The video might be private or the platform may have changed their structure."
    };
  }
  
  return {
    success: true,
    platform: platform,
    developer: DEVELOPER,
    result: result
  };
}

// =============================================
// HTTP SERVER
// =============================================
function jsonResponse(data, status) {
  status = status || 200;
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  // Root endpoint
  if (path === "/" || path === "") {
    return jsonResponse({
      success: true,
      message: "Self-Contained Social Media Downloader API",
      version: "2.0.0",
      description: "No external APIs needed - Direct scraping from platforms",
      platforms: ["YouTube", "TikTok", "Facebook", "Instagram"],
      endpoints: {
        "/": "API status",
        "/api/info": "API information",
        "/api/download?url=VIDEO_URL": "Download media"
      },
      developer: DEVELOPER
    });
  }

  // Info endpoint
  if (path === "/api/info") {
    return jsonResponse({
      success: true,
      developer: DEVELOPER,
      platforms: ["YouTube", "TikTok", "Facebook", "Instagram"],
      method: "Direct scraping - No external APIs required",
      cache: {
        enabled: true,
        ttl: CACHE_TTL / 1000 + " seconds",
        size: cache.size
      },
      endpoints: {
        download: "/api/download?url=VIDEO_URL",
        raw: "/api/raw?url=VIDEO_URL"
      }
    });
  }

  // Raw endpoint - returns just the video URL
  if (path === "/api/raw") {
    const videoUrl = url.searchParams.get("url");
    if (!videoUrl) {
      return jsonResponse({
        success: false,
        error: "Missing required parameter: ?url=VIDEO_URL"
      }, 400);
    }

    try {
      const result = await extractUniversal(videoUrl);
      if (!result.success) {
        return jsonResponse(result, 500);
      }
      
      // Extract just the video URLs
      const urls = [];
      if (result.result.medias && result.result.medias.video) {
        for (let i = 0; i < result.result.medias.video.length; i++) {
          urls.push(result.result.medias.video[i].url);
        }
      }
      
      return jsonResponse({
        success: true,
        platform: result.platform,
        title: result.result.title || "Unknown",
        urls: urls,
        thumbnail: result.result.thumbnail || ""
      });
    } catch (error) {
      return jsonResponse({
        success: false,
        error: error.message || "Internal server error"
      }, 500);
    }
  }

  // Download endpoint
  if (path === "/api/download") {
    const videoUrl = url.searchParams.get("url");
    const format = url.searchParams.get("format") || "video";
    const quality = url.searchParams.get("quality") || "best";

    if (!videoUrl) {
      return jsonResponse({
        success: false,
        error: "Missing required parameter: ?url=VIDEO_URL",
        usage: "/api/download?url=VIDEO_URL&format=video|audio&quality=best|480|720|1080"
      }, 400);
    }

    try {
      const startTime = Date.now();
      const result = await extractUniversal(videoUrl);
      const elapsed = Date.now() - startTime;
      
      if (!result.success) {
        return jsonResponse(result, 500);
      }
      
      // Filter by format if requested
      if (format === "audio") {
        // Keep only audio
        if (result.result.medias.audio && result.result.medias.audio.length > 0) {
          result.result.medias.video = [];
        } else {
          // No audio found, keep video as fallback
        }
      }
      
      // Filter by quality if requested
      if (quality !== "best" && quality !== "worst" && result.result.medias.video) {
        const targetHeight = parseInt(quality) || 720;
        result.result.medias.video = result.result.medias.video.filter(function(v) {
          const height = v.height || parseInt(v.quality) || 0;
          return height <= targetHeight;
        });
        if (result.result.medias.video.length > 1) {
          result.result.medias.video.sort(function(a, b) {
            const ah = Math.abs((a.height || parseInt(a.quality) || 0) - targetHeight);
            const bh = Math.abs((b.height || parseInt(b.quality) || 0) - targetHeight);
            return ah - bh;
          });
          result.result.medias.video = [result.result.medias.video[0]];
        }
      }
      
      return jsonResponse({
        success: true,
        platform: result.platform,
        developer: DEVELOPER,
        processing_time: elapsed + "ms",
        requested_format: format,
        requested_quality: quality,
        result: result.result
      });
    } catch (error) {
      return jsonResponse({
        success: false,
        error: error.message || "Internal server error"
      }, 500);
    }
  }

  // 404
  return jsonResponse({
    success: false,
    error: "Endpoint not found",
    available: ["/", "/api/info", "/api/download", "/api/raw"]
  }, 404);
}

// =============================================
// SERVER STARTUP
// =============================================
const PORT = parseInt(Deno.env.get("PORT") || "8000", 10);

console.log("=".repeat(50));
console.log("🚀 SELF-CONTAINED SOCIAL MEDIA DOWNLOADER");
console.log("=".repeat(50));
console.log("📡 Running on port: " + PORT);
console.log("📦 Platforms: YouTube, TikTok, Facebook, Instagram");
console.log("🔑 No external APIs required - Direct scraping");
console.log("👨‍💻 Developer: " + DEVELOPER.name);
console.log("📚 GitHub: " + DEVELOPER.github);
console.log("=".repeat(50));
console.log("\n📌 Available Endpoints:");
console.log("   GET /");
console.log("   GET /api/info");
console.log("   GET /api/download?url=VIDEO_URL");
console.log("   GET /api/raw?url=VIDEO_URL");
console.log("\n📝 Example:");
console.log("   /api/download?url=https://www.youtube.com/watch?v=VIDEO_ID");
console.log("=".repe
