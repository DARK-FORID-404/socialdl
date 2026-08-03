// main.js - Simple Social Media Downloader
// Deno Deploy - Fully Self-Contained

// ============ CONFIG ============
const DEV = {
  name: "DARK FORID",
  github: "https://github.com/DARK-FORID-404",
  telegram: "https://t.me/@UnknownXBoyX"
};

// ============ CACHE ============
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
  cache.set(key, { data: data, timestamp: Date.now() });
}

// ============ PLATFORM DETECTION ============
function detectPlatform(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("facebook.com") || url.includes("fb.watch")) return "facebook";
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
}

// ============ FETCH HELPER ============
async function getHTML(url) {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (resp.status === 200) return await resp.text();
    return null;
  } catch {
    return null;
  }
}

// ============ YOUTUBE ============
async function getYoutube(url) {
  const key = "yt_" + url;
  const cached = getCache(key);
  if (cached) return cached;

  try {
    const id = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    if (!id) return null;
    
    const html = await getHTML("https://www.youtube.com/watch?v=" + id[1]);
    if (!html) return null;
    
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/s);
    if (!match) return null;
    
    const data = JSON.parse(match[1]);
    const vd = data.videoDetails || {};
    const streams = data.streamingData || {};
    const formats = streams.formats || [];
    const adaptive = streams.adaptiveFormats || [];
    const all = [...formats, ...adaptive];
    
    const videos = [];
    const audios = [];
    
    for (let i = 0; i < all.length; i++) {
      const f = all[i];
      if (f.url) {
        if (f.mimeType && f.mimeType.includes("video")) {
          videos.push({
            quality: f.qualityLabel || f.quality || "720p",
            url: f.url
          });
        }
        if (f.mimeType && f.mimeType.includes("audio")) {
          audios.push({
            quality: "audio",
            url: f.url
          });
        }
      }
    }
    
    const result = {
      title: vd.title || "YouTube Video",
      uploader: vd.author || "Unknown",
      duration: parseInt(vd.lengthSeconds) || 0,
      thumbnail: "https://img.youtube.com/vi/" + id[1] + "/maxresdefault.jpg",
      medias: { video: videos, audio: audios }
    };
    
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}

// ============ TIKTOK ============
async function getTikTok(url) {
  const key = "tt_" + url;
  const cached = getCache(key);
  if (cached) return cached;

  try {
    const html = await getHTML(url);
    if (!html) return null;
    
    let videoUrl = "";
    let title = "TikTok Video";
    let author = "Unknown";
    let thumbnail = "";
    
    // Find video URL
    const patterns = [
      /"videoUrl":"([^"]+)"/,
      /"playAddr":"([^"]+)"/,
      /<video[^>]*src="([^"]+)"/,
      /"downloadAddr":"([^"]+)"/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const m = html.match(patterns[i]);
      if (m) {
        videoUrl = m[1].replace(/\\/g, "");
        break;
      }
    }
    
    // Find thumbnail
    const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/) ||
                       html.match(/"cover":"([^"]+)"/);
    if (thumbMatch) thumbnail = thumbMatch[1];
    
    // Find title
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/) ||
                       html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) title = titleMatch[1].replace(/\s*\|\s*TikTok$/, "");
    
    // Find author
    const authorMatch = html.match(/@([a-zA-Z0-9_\.]+)/);
    if (authorMatch) author = authorMatch[1];
    
    if (!videoUrl) return null;
    
    const result = {
      title: title,
      uploader: author,
      duration: 0,
      thumbnail: thumbnail,
      medias: {
        video: [{ quality: "720p", url: videoUrl }],
        audio: []
      }
    };
    
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}

// ============ FACEBOOK ============
async function getFacebook(url) {
  const key = "fb_" + url;
  const cached = getCache(key);
  if (cached) return cached;

  try {
    const html = await getHTML(url);
    if (!html) return null;
    
    const urls = [];
    const patterns = [
      /"playable_url":"([^"]+)"/g,
      /"playable_url_quality_hd":"([^"]+)"/g,
      /"hd_src":"([^"]+)"/g,
      /"sd_src":"([^"]+)"/g,
      /<video[^>]*src="([^"]*\.mp4[^"]*)"/gi
    ];
    
    for (let p = 0; p < patterns.length; p++) {
      const matches = html.matchAll(patterns[p]);
      for (const m of matches) {
        const u = m[1].replace(/\\/g, "");
        if (u.startsWith("http") && !urls.includes(u)) {
          urls.push(u);
        }
      }
    }
    
    if (urls.length === 0) return null;
    
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    const videos = urls.map(function(u, i) {
      return { quality: i === 0 ? "HD" : "SD", url: u };
    });
    
    const result = {
      title: titleMatch ? titleMatch[1] : "Facebook Video",
      uploader: "Facebook User",
      duration: 0,
      thumbnail: thumbMatch ? thumbMatch[1] : "",
      medias: { video: videos, audio: [] }
    };
    
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}

// ============ INSTAGRAM ============
async function getInstagram(url) {
  const key = "ig_" + url;
  const cached = getCache(key);
  if (cached) return cached;

  try {
    // Try oEmbed first (free, no API key)
    const embedUrl = "https://api.instagram.com/oembed?url=" + encodeURIComponent(url);
    const oembedResp = await fetch(embedUrl);
    let title = "Instagram Post";
    let thumbnail = "";
    let author = "Unknown";
    
    if (oembedResp.status === 200) {
      const data = await oembedResp.json();
      title = data.title || title;
      thumbnail = data.thumbnail_url || thumbnail;
      author = data.author_name || author;
    }
    
    // Try to get video from page
    const html = await getHTML(url);
    let videoUrl = "";
    
    if (html) {
      const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/) ||
                         html.match(/<meta property="og:video:url" content="([^"]+)"/) ||
                         html.match(/"video_url":"([^"]+)"/);
      if (videoMatch) videoUrl = videoMatch[1].replace(/\\/g, "");
      
      if (!thumbnail) {
        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (thumbMatch) thumbnail = thumbMatch[1];
      }
    }
    
    const videos = [];
    if (videoUrl) {
      videos.push({ quality: "720p", url: videoUrl });
    } else if (thumbnail) {
      videos.push({ quality: "image", url: thumbnail });
    } else {
      return null;
    }
    
    const result = {
      title: title,
      uploader: author,
      duration: 0,
      thumbnail: thumbnail,
      medias: { video: videos, audio: [] }
    };
    
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}

// ============ UNIVERSAL EXTRACTOR ============
async function extract(url) {
  const platform = detectPlatform(url);
  
  let result = null;
  if (platform === "youtube") result = await getYoutube(url);
  else if (platform === "tiktok") result = await getTikTok(url);
  else if (platform === "facebook") result = await getFacebook(url);
  else if (platform === "instagram") result = await getInstagram(url);
  
  if (!result) {
    return {
      success: false,
      platform: platform,
      error: "Could not extract video from this URL"
    };
  }
  
  return {
    success: true,
    platform: platform,
    developer: DEV,
    result: result
  };
}

// ============ HTTP SERVER ============
function json(data, status) {
  status = status || 200;
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

async function handle(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
  
  if (path === "/") {
    return json({
      success: true,
      message: "Social Media Downloader API",
      platforms: ["YouTube", "TikTok", "Facebook", "Instagram"],
      endpoints: {
        "/": "Status",
        "/api/info": "Info",
        "/api/download?url=URL": "Download media"
      }
    });
  }
  
  if (path === "/api/info") {
    return json({
      success: true,
      developer: DEV,
      platforms: ["YouTube", "TikTok", "Facebook", "Instagram"],
      cache_size: cache.size
    });
  }
  
  if (path === "/api/download") {
    const videoUrl = url.searchParams.get("url");
    if (!videoUrl) {
      return json({ success: false, error: "Missing ?url= parameter" }, 400);
    }
    
    try {
      const result = await extract(videoUrl);
      return json(result);
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }
  
  return json({ success: false, error: "Endpoint not found" }, 404);
}

// ============ START ============
const PORT = parseInt(Deno.env.get("PORT") || "8000", 10);

console.log("=".repeat(50));
console.log("🚀 SOCIAL MEDIA DOWNLOADER API");
console.log("=".repeat(50));
console.log("📡 Port: " + PORT);
console.log("📦 Platforms: YouTube, TikTok, Facebook, Instagram");
console.log("🔑 No API keys required");
console.log("=".repeat(50));
console.log("\n📌 Endpoints:");
console.log("   GET /");
console.log("   GET /api/info");
console.log("   GET /api/download?url=URL");
console.log("\n📝 Example:");
console.log("   /api/download?url=https://www.youtube.com/watch?v=VIDEO");
console.log("=".repeat(50));

Deno.serve({ port: PORT }, handle);
