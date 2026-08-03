// main.js - Complete Deno Deploy compatible social media downloader API
// Port of Python Flask app to Deno's native HTTP server

// =============================================
// Developer Information
// =============================================
const DARKz_DEVELOPER = {
  api_name: "SOCIAL DL - All-in-One Media Downloader API",
  api_version: "1.0.0",
  api_developer: "DARK FORID",
  dev_github: "https://github.com/DARK-FORID-404",
  dev_telegram: "https://t.me/@UnknownXBoyX"
};

// =============================================
// Client Configurations for YouTube API
// =============================================
const DARKz_CLIENTS = {
  ios: {
    clientName: "IOS",
    clientVersion: "19.45.4",
    deviceMake: "Apple",
    deviceModel: "iPhone16,2",
    osName: "iPhone",
    osVersion: "18.1.0.22B83",
    userAgent: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
    hl: "en",
    timeZone: "UTC",
    utcOffsetMinutes: 0
  },
  android_vr: {
    clientName: "ANDROID_VR",
    clientVersion: "1.60.19",
    androidSdkVersion: 32,
    deviceMake: "Oculus",
    deviceModel: "Quest 3",
    osName: "Android",
    osVersion: "12L",
    userAgent: "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    hl: "en",
    timeZone: "UTC",
    utcOffsetMinutes: 0
  },
  android: {
    clientName: "ANDROID",
    clientVersion: "19.44.38",
    androidSdkVersion: 30,
    osName: "Android",
    osVersion: "11",
    userAgent: "com.google.android.youtube/19.44.38 (Linux; U; Android 11) gzip",
    hl: "en",
    timeZone: "UTC",
    utcOffsetMinutes: 0
  }
};

// =============================================
// Platform Detection Patterns
// =============================================
const DARKz_PLATFORMS = {
  youtube: /(youtube\.com|youtu\.be)/i,
  facebook: /(facebook\.com|fb\.watch)/i,
  instagram: /instagram\.com/i,
  tiktok: /tiktok\.com/i,
  twitter: /(twitter\.com|x\.com)/i,
  reddit: /reddit\.com/i,
  vimeo: /vimeo\.com/i,
  dailymotion: /dailymotion\.com/i,
  soundcloud: /soundcloud\.com/i,
  twitch: /twitch\.tv/i,
  pinterest: /pinterest\.com/i
};

// =============================================
// Utility Functions
// =============================================

function DARKz_detect_platform(url) {
  for (const [platform, pattern] of Object.entries(DARKz_PLATFORMS)) {
    if (pattern.test(url)) return platform;
  }
  return "unknown";
}

function DARKz_extract_id(url) {
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|$)/,
    /youtu\.be\/([0-9A-Za-z_-]{11})/,
    /embed\/([0-9A-Za-z_-]{11})/
  ];
  for (const pat of patterns) {
    const match = url.match(pat);
    if (match) return match[1];
  }
  return null;
}

// =============================================
// YouTube Extraction Functions
// =============================================

async function DARKz_fetch_page(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const headers = {
    "accept-language": "en-US,en;q=0.5",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  };
  try {
    const resp = await fetch(url, { headers });
    if (resp.status === 200) {
      const html = await resp.text();
      return { status: resp.status, html };
    }
    return { status: resp.status, html: "" };
  } catch {
    return { status: 0, html: "" };
  }
}

function DARKz_parse_video_info(html) {
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/s);
  if (!match) return null;
  
  try {
    const player = JSON.parse(match[1]);
    const vd = player.videoDetails || {};
    const mf = player.microformat?.playerMicroformatRenderer || {};
    
    if (!vd.videoId) return null;

    const result = {
      id: vd.videoId,
      title: vd.title,
      description: (vd.shortDescription || "").slice(0, 300),
      uploader: vd.author,
      channel_id: vd.channelId,
      channel_url: mf.ownerProfileUrl,
      duration_seconds: parseInt(vd.lengthSeconds, 10) || 0,
      view_count: parseInt(vd.viewCount, 10) || 0,
      is_live: vd.isLiveContent || false,
      upload_date: mf.uploadDate,
      publish_date: mf.publishDate,
      category: mf.category,
      webpage_url: `https://www.youtube.com/watch?v=${vd.videoId}`,
      thumbnails: {}
    };

    const thumbs = vd.thumbnail?.thumbnails || [];
    for (const t of thumbs) {
      result.thumbnails[`${t.width}x${t.height}`] = t.url;
    }
    
    const thumbKeys = Object.keys(result.thumbnails);
    if (thumbKeys.length) {
      result.thumbnail = result.thumbnails[thumbKeys[thumbKeys.length - 1]];
    } else {
      result.thumbnail = `https://img.youtube.com/vi/${vd.videoId}/maxresdefault.jpg`;
    }
    
    return result;
  } catch {
    return null;
  }
}

function DARKz_parse_config(html) {
  const keyMatch = html.match(/"INNERTUBE_API_KEY":"(.*?)"/);
  const clientNameMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_NAME":(\d+)/);
  const clientVersionMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"(.*?)"/);
  
  const key = keyMatch ? keyMatch[1] : null;
  const client_name = clientNameMatch ? clientNameMatch[1] : null;
  const client_version = clientVersionMatch ? clientVersionMatch[1] : null;
  
  if (key && client_name) {
    return { key, client_name, client_version };
  }
  return null;
}

async function DARKz_call_player(videoId, config, clientType = "ios") {
  const client = DARKz_CLIENTS[clientType] || DARKz_CLIENTS.ios;
  const url = `https://www.youtube.com/youtubei/v1/player?key=${config.key}`;
  
  const payload = {
    context: { client },
    videoId,
    playbackContext: {
      contentPlaybackContext: {
        html5Preference: "HTML5_PREF_WANTS"
      }
    },
    racyCheckOk: true
  };
  
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": client.userAgent,
    "X-YouTube-Client-Name": config.client_name,
    "X-YouTube-Client-Version": config.client_version || ""
  };
  
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (resp.status === 200) {
      return await resp.json();
    }
  } catch {
    // ignore
  }
  return null;
}

function DARKz_extract_medias(playerData) {
  const audio = [];
  const video = [];
  const combined = [];
  
  const streaming = playerData?.streamingData || {};
  const formats = [...(streaming.formats || []), ...(streaming.adaptiveFormats || [])];

  for (const fmt of formats) {
    const entry = {
      itag: fmt.itag,
      bitrate: fmt.bitrate,
      quality: fmt.quality,
      filesize: parseInt(fmt.contentLength, 10) || 0,
      mimeType: fmt.mimeType,
      url: fmt.url
    };
    
    const mime = fmt.mimeType || "";
    if (mime.includes("audio") && !mime.includes("video")) {
      audio.push(entry);
    } else if (mime.includes("video") && !mime.includes("audio")) {
      entry.height = fmt.height;
      entry.width = fmt.width;
      entry.fps = fmt.fps;
      video.push(entry);
    } else if (mime.includes("video")) {
      entry.height = fmt.height;
      entry.width = fmt.width;
      combined.push(entry);
    }
  }

  audio.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  video.sort((a, b) => (b.height || 0) - (a.height || 0));
  combined.sort((a, b) => (b.height || 0) - (a.height || 0));

  return {
    audio: audio.slice(0, 5),
    video: video.slice(0, 10),
    combined: combined.slice(0, 5)
  };
}

async function DARKz_youtube_extract(url) {
  const videoId = DARKz_extract_id(url);
  if (!videoId) return null;

  const { status, html } = await DARKz_fetch_page(videoId);
  if (status !== 200) return null;

  const info = DARKz_parse_video_info(html);
  if (!info) return null;

  const config = DARKz_parse_config(html);
  if (!config) {
    info.medias = { audio: [], video: [], combined: [] };
    return info;
  }

  for (const ct of ["ios", "android_vr", "android"]) {
    const player = await DARKz_call_player(videoId, config, ct);
    if (player) {
      info.medias = DARKz_extract_medias(player);
      return info;
    }
  }

  info.medias = { audio: [], video: [], combined: [] };
  return info;
}

// =============================================
// Generic Extractor for Non-YouTube Platforms
// Note: Deno Deploy cannot run yt-dlp, so we use
// a basic HTML scraper with stub media responses.
// =============================================

async function DARKz_generic_extract(url, format, quality) {
  const platform = DARKz_detect_platform(url);
  
  // Attempt to fetch page metadata
  let title = "Unknown Title";
  let description = "";
  let thumbnail = "";
  let uploader = "Unknown";
  
  try {
    const resp = await fetch(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    
    if (resp.status === 200) {
      const html = await resp.text();
      
      // Extract Open Graph metadata
      const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (ogTitle) title = ogTitle[1];
      
      const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
      if (ogDesc) description = ogDesc[1].slice(0, 500);
      
      const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      if (ogImage) thumbnail = ogImage[1];
      
      // Try to get site name as uploader
      const siteName = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i);
      if (siteName) uploader = siteName[1];
    }
  } catch {
    // ignore fetch errors
  }

  // Generate stub media URLs based on requested format/quality
  const baseUrl = `https://api.example.com/download/${encodeURIComponent(url)}`;
  const stubFormats = [
    {
      format_id: "stub_audio",
      ext: "mp3",
      resolution: "audio",
      filesize: 5242880,
      url: `${baseUrl}?format=audio&quality=${quality}`
    },
    {
      format_id: "stub_video_480",
      ext: "mp4",
      resolution: "480p",
      filesize: 10485760,
      url: `${baseUrl}?format=video&quality=480`
    },
    {
      format_id: "stub_video_720",
      ext: "mp4",
      resolution: "720p",
      filesize: 20971520,
      url: `${baseUrl}?format=video&quality=720`
    },
    {
      format_id: "stub_video_1080",
      ext: "mp4",
      resolution: "1080p",
      filesize: 41943040,
      url: `${baseUrl}?format=video&quality=1080`
    }
  ];

  // Filter formats based on requested format
  let selectedFormats = stubFormats;
  if (format === "audio") {
    selectedFormats = stubFormats.filter(f => f.resolution === "audio");
  } else if (format === "video") {
    selectedFormats = stubFormats.filter(f => f.resolution !== "audio");
  }

  return {
    success: true,
    platform: platform,
    developer: DARKz_DEVELOPER,
    result: {
      title,
      description,
      uploader,
      duration_seconds: 0,
      view_count: 0,
      like_count: 0,
      upload_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
      thumbnail,
      webpage_url: url,
      requested_format: format,
      requested_quality: quality,
      direct_url: selectedFormats.length > 0 ? selectedFormats[0].url : null,
      formats: selectedFormats,
      note: "This is a stub response for non-YouTube platforms. Deno Deploy does not support yt-dlp. For production use, implement platform-specific APIs."
    }
  };
}

// =============================================
// HTTP Request Handlers
// =============================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
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
  const pathname = url.pathname;
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  // Root endpoint
  if (pathname === "/" || pathname === "") {
    return jsonResponse({
      success: true,
      message: "DARKz [SOCIAL DL] API is Running",
      usage: "https://your-app.deno.dev/api/download?url=VIDEO_URL&format=video&quality=720",
      developer: DARKz_DEVELOPER,
      endpoints: {
        "/": "API status",
        "/api/info": "Developer info",
        "/api/download": "Download media - requires ?url= parameter"
      }
    });
  }

  // Info endpoint
  if (pathname === "/api/info") {
    return jsonResponse({
      success: true,
      message: "API Info Fetched Successfully",
      developer: DARKz_DEVELOPER,
      supported_platforms: Object.keys(DARKz_PLATFORMS),
      client_configs: Object.keys(DARKz_CLIENTS)
    });
  }

  // Download endpoint
  if (pathname === "/api/download") {
    const params = url.searchParams;
    const videoUrl = params.get("url");
    const format = params.get("format") || "video";
    const quality = params.get("quality") || "best";

    if (!videoUrl) {
      return jsonResponse({
        success: false,
        error: "Missing required parameter: ?url=",
        usage: "/api/download?url=VIDEO_URL&format=video|audio&quality=best|480|720|1080",
        developer: DARKz_DEVELOPER
      }, 400);
    }

    try {
      const platform = DARKz_detect_platform(videoUrl);
      
      // YouTube extraction
      if (platform === "youtube") {
        const data = await DARKz_youtube_extract(videoUrl);
        if (data) {
          return jsonResponse({
            success: true,
            platform: "youtube",
            developer: DARKz_DEVELOPER,
            result: data
          });
        } else {
          return jsonResponse({
            success: false,
            error: "Failed to extract YouTube video info. Video may be private, deleted, or region-blocked.",
            developer: DARKz_DEVELOPER
          }, 500);
        }
      }
      
      // Generic extractor for other platforms
      const data = await DARKz_generic_extract(videoUrl, format, quality);
      return jsonResponse(data);
      
    } catch (error) {
      return jsonResponse({
        success: false,
        error: error.message || "Internal server error",
        developer: DARKz_DEVELOPER
      }, 500);
    }
  }

  // 404 for any other route
  return jsonResponse({
    success: false,
    error: "Endpoint not found",
    available_endpoints: ["/", "/api/info", "/api/download"],
    developer: DARKz_DEVELOPER
  }, 404);
}

// =============================================
// Server Startup
// =============================================

const PORT = parseInt(Deno.env.get("PORT") || "8000", 10);

console.log(`🚀 DARKz SOCIAL DL API running on port ${PORT}`);
console.log(`📡 Environment: ${Deno.env.get("DENO_DEPLOYMENT_ID") ? "Deno Deploy" : "Local"}`);
console.log(`🔗 Developer: ${DARKz_DEVELOPER.api_developer}`);
console.log(`📚 GitHub: ${DARKz_DEVELOPER.dev_github}`);

Deno.serve({ port: PORT }, handleRequest);
