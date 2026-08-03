// main.js - Complete Social Media Downloader API for Deno Deploy
// Full version with all features from the original Python code

// =============================================
// Developer Information
// =============================================
const DARKz_DEVELOPER = {
  api_name: "SOCIAL DL - All-in-One Media Downloader API",
  api_version: "2.0.0",
  api_developer: "DARK FORID",
  dev_github: "https://github.com/DARK-FORID-404",
  dev_telegram: "https://t.me/@UnknownXBoyX"
};

// =============================================
// Configuration
// =============================================
const CONFIG = {
  rapidapi_key: Deno.env.get("RAPIDAPI_KEY") || "",
  twitter_bearer_token: Deno.env.get("TWITTER_TOKEN") || "",
  vimeo_access_token: Deno.env.get("VIMEO_TOKEN") || "",
  soundcloud_client_id: Deno.env.get("SOUNDCLOUD_CLIENT_ID") || "",
  twitch_client_id: Deno.env.get("TWITCH_CLIENT_ID") || "",
  twitch_client_secret: Deno.env.get("TWITCH_SECRET") || "",
  pinterest_access_token: Deno.env.get("PINTEREST_TOKEN") || ""
};

// =============================================
// Platform Detection
// =============================================
const DARKz_PLATFORMS = {
  youtube: /(youtube\.com|youtu\.be)/i,
  tiktok: /tiktok\.com/i,
  facebook: /(facebook\.com|fb\.watch|fb\.reel)/i,
  instagram: /(instagram\.com|instagr\.am)/i,
  twitter: /(twitter\.com|x\.com)/i,
  reddit: /(reddit\.com|redd\.it)/i,
  vimeo: /vimeo\.com/i,
  dailymotion: /dailymotion\.com/i,
  soundcloud: /soundcloud\.com/i,
  twitch: /(twitch\.tv|clips\.twitch\.tv)/i,
  pinterest: /(pinterest\.com|pin\.it)/i,
  linkedin: /linkedin\.com/i,
  tumblr: /tumblr\.com/i,
  vk: /vk\.com/i,
  spotify: /spotify\.com/i,
  mixcloud: /mixcloud\.com/i,
  bandcamp: /bandcamp\.com/i,
  patreon: /patreon\.com/i,
  onlyfans: /onlyfans\.com/i,
  discord: /discord\.com/i,
  medium: /medium\.com/i
};

function DARKz_detect_platform(url) {
  for (var platform in DARKz_PLATFORMS) {
    if (DARKz_PLATFORMS[platform].test(url)) {
      return platform;
    }
  }
  return "unknown";
}

// =============================================
// YouTube Client Configurations
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
// Cache System
// =============================================
var cache = new Map();
var CACHE_TTL = 300000;

function getCache(key) {
  var entry = cache.get(key);
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

// =============================================
// Utility Functions
// =============================================

function extractVideoId(url, pattern) {
  var match = url.match(pattern);
  return match ? match[1] : null;
}

async function fetchWithRetry(url, options, retries) {
  options = options || {};
  retries = retries || 3;
  for (var i = 0; i < retries; i++) {
    try {
      var headers = options.headers || {};
      var response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...headers
        },
        body: options.body || null
      });
      if (response.status === 200) {
        return await response.json();
      }
      if (response.status === 429) {
        await new Promise(function(resolve) {
          setTimeout(resolve, 2000 * (i + 1));
        });
        continue;
      }
      return null;
    } catch (e) {
      if (i === retries - 1) return null;
      await new Promise(function(resolve) {
        setTimeout(resolve, 1000 * (i + 1));
      });
    }
  }
  return null;
}

// =============================================
// YOUTUBE EXTRACTOR - Full Implementation
// =============================================

async function DARKz_youtube_extract(url) {
  var videoId = extractVideoId(url, /(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|$)/);
  if (!videoId) {
    videoId = extractVideoId(url, /youtu\.be\/([0-9A-Za-z_-]{11})/);
  }
  if (!videoId) {
    videoId = extractVideoId(url, /embed\/([0-9A-Za-z_-]{11})/);
  }
  if (!videoId) return null;
  
  var cacheKey = "yt_" + videoId;
  var cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    var pageUrl = "https://www.youtube.com/watch?v=" + videoId;
    var pageResp = await fetch(pageUrl, {
      headers: {
        "accept-language": "en-US,en;q=0.5",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    var html = await pageResp.text();

    var match = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/s);
    if (!match) return null;
    
    var player = JSON.parse(match[1]);
    var vd = player.videoDetails || {};
    var mf = (player.microformat || {}).playerMicroformatRenderer || {};
    
    if (!vd.videoId) return null;

    var keyMatch = html.match(/"INNERTUBE_API_KEY":"(.*?)"/);
    var clientNameMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_NAME":(\d+)/);
    var clientVersionMatch = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"(.*?)"/);
    
    var apiKey = keyMatch ? keyMatch[1] : null;
    var clientName = clientNameMatch ? clientNameMatch[1] : null;
    var clientVersion = clientVersionMatch ? clientVersionMatch[1] : null;

    var medias = { audio: [], video: [], combined: [] };
    
    if (apiKey && clientName) {
      var clients = ["ios", "android_vr", "android"];
      for (var ci = 0; ci < clients.length; ci++) {
        var ct = clients[ci];
        var client = DARKz_CLIENTS[ct];
        var apiUrl = "https://www.youtube.com/youtubei/v1/player?key=" + apiKey;
        
        var payload = {
          context: { client: client },
          videoId: videoId,
          playbackContext: {
            contentPlaybackContext: {
              html5Preference: "HTML5_PREF_WANTS"
            }
          },
          racyCheckOk: true
        };
        
        try {
          var resp = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": client.userAgent,
              "X-YouTube-Client-Name": clientName,
              "X-YouTube-Client-Version": clientVersion || ""
            },
            body: JSON.stringify(payload)
          });
          
          if (resp.status === 200) {
            var data = await resp.json();
            var streaming = (data || {}).streamingData || {};
            var formats = (streaming.formats || []).concat(streaming.adaptiveFormats || []);
            
            var audio = [];
            var video = [];
            var combined = [];
            
            for (var fi = 0; fi < formats.length; fi++) {
              var fmt = formats[fi];
              var entry = {
                itag: fmt.itag,
                bitrate: fmt.bitrate,
                quality: fmt.quality,
                filesize: parseInt(fmt.contentLength, 10) || 0,
                mimeType: fmt.mimeType,
                url: fmt.url
              };
              
              var mime = fmt.mimeType || "";
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
            
            audio.sort(function(a, b) {
              return (b.bitrate || 0) - (a.bitrate || 0);
            });
            video.sort(function(a, b) {
              return (b.height || 0) - (a.height || 0);
            });
            combined.sort(function(a, b) {
              return (b.height || 0) - (a.height || 0);
            });
            
            medias = {
              audio: audio.slice(0, 5),
              video: video.slice(0, 10),
              combined: combined.slice(0, 5)
            };
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    var result = {
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
      webpage_url: "https://www.youtube.com/watch?v=" + vd.videoId,
      thumbnail: "https://img.youtube.com/vi/" + vd.videoId + "/maxresdefault.jpg",
      medias: medias,
      download_count: 0
    };

    setCache(cacheKey, result);
    return result;
  } catch (e) {
    return null;
  }
}

// =============================================
// TIKTOK EXTRACTOR
// =============================================

async function DARKz_tiktok_extract(url) {
  var cacheKey = "tt_" + url;
  var cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    var apiUrl = "https://tiktok-download-video1.p.rapidapi.com/getVideo?url=" + encodeURIComponent(url);
    var data = await fetchWithRetry(apiUrl, {
      headers: {
        "X-RapidAPI-Key": CONFIG.rapidapi_key,
        "X-RapidAPI-Host": "tiktok-download-video1.p.rapidapi.com"
      }
    });

    if (data && data.id) {
      var formats = [];
      
      if (data.video_no_watermark || data.video || data.play_url) {
        formats.push({
          format_id: "video_no_watermark",
          ext: "mp4",
          resolution: "1080p",
          filesize: data.video_size || 0,
          url: data.video_no_watermark || data.video || data.play_url
        });
      }
      if (data.video_watermark || data.video_with_watermark) {
        formats.push({
          format_id: "video_with_watermark",
          ext: "mp4",
          resolution: "720p",
          filesize: data.video_size_watermark || 0,
          url: data.video_watermark || data.video_with_watermark
        });
      }
      if (data.music || data.audio) {
        formats.push({
          format_id: "audio",
          ext: "mp3",
          resolution: "audio",
          filesize: data.music_size || 0,
          url: data.music || data.audio
        });
      }

      var result = {
        id: data.id,
        title: data.title || data.desc || "TikTok Video",
        description: data.desc || data.title || "",
        uploader: (data.author || {}).unique_id || (data.author || {}).nickname || "Unknown",
        uploader_id: (data.author || {}).unique_id || "",
        duration_seconds: data.duration || 0,
        view_count: data.play_count || data.views || 0,
        like_count: data.digg_count || data.likes || 0,
        comment_count: data.comment_count || 0,
        share_count: data.share_count || 0,
        thumbnail: data.cover || (data.thumbnails || [])[0] || "",
        webpage_url: url,
        formats: formats.filter(function(f) { return f.url; }),
        medias: {
          audio: [],
          video: [],
          combined: []
        }
      };

      if (result.formats) {
        result.medias.audio = result.formats.filter(function(f) {
          return f.resolution === "audio";
        }).map(function(f) {
          return {
            itag: f.format_id,
            bitrate: 0,
            quality: "audio",
            filesize: f.filesize,
            mimeType: "audio/mp4",
            url: f.url
          };
        });
        result.medias.video = result.formats.filter(function(f) {
          return f.resolution !== "audio";
        }).map(function(f) {
          return {
            itag: f.format_id,
            bitrate: 0,
            quality: f.resolution,
            filesize: f.filesize,
            mimeType: "video/mp4",
            url: f.url,
            height: parseInt(f.resolution) || 720,
            width: 0,
            fps: 30
          };
        });
      }
      
      setCache(cacheKey, result);
      return result;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// =============================================
// FACEBOOK EXTRACTOR
// =============================================

async function DARKz_facebook_extract(url) {
  var cacheKey = "fb_" + url;
  var cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    var apiUrl = "https://api.vevioz.com/api/facebook?url=" + encodeURIComponent(url);
    var data = await fetchWithRetry(apiUrl);

    if (data && (data.downloads || data.download)) {
      var downloads = data.downloads || data.download || [];
      var formats = [];
      
      for (var i = 0; i < downloads.length; i++) {
        var dl = downloads[i];
        formats.push({
          format_id: "fb_" + i,
          ext: dl.extension || "mp4",
          resolution: dl.quality || "720p",
          filesize: dl.size || dl.filesize || 0,
          url: dl.url || dl.link
        });
      }

      var result = {
        id: data.id || Date.now().toString(),
        title: data.title || "Facebook Video",
        description: data.description || "",
        uploader: data.author || data.owner_name || "Unknown",
        uploader_id: data.author_id || "",
        duration_seconds: data.duration || 0,
        view_count: data.views || 0,
        like_count: data.likes || 0,
        comment_count: data.comments || 0,
        share_count: data.shares || 0,
        thumbnail: data.thumbnail || data.cover || "",
        webpage_url: url,
        formats: formats.filter(function(f) { return f.url; }),
        medias: {
          audio: [],
          video: [],
          combined: []
        }
      };

      if (result.formats) {
        result.medias.video = result.formats.map(function(f) {
          return {
            itag: f.format_id,
            bitrate: 0,
            quality: f.resolution,
            filesize: f.filesize,
            mimeType: "video/mp4",
            url: f.url,
            height: parseInt(f.resolution) || 720,
            width: 0,
            fps: 30
          };
        });
      }
      
      setCache(cacheKey, result);
      return result;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// =============================================
// INSTAGRAM EXTRACTOR
// =============================================

async function DARKz_instagram_extract(url) {
  var cacheKey = "ig_" + url;
  var cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    if (url.includes("instagram.com/reel/") || url.includes("instagram.com/p/")) {
      var apiUrl = "https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=" + encodeURIComponent(url);
      var data = await fetchWithRetry(apiUrl, {
        headers: {
          "X-RapidAPI-Key": CONFIG.rapidapi_key,
          "X-RapidAPI-Host": "instagram-downloader-download-instagram-videos-stories.p.rapidapi.com"
        }
      });

      if (data && (data.video || data.video_url || data.play_url || data.display_url)) {
        var formats = [];
        
        if (data.video || data.video_url || data.play_url) {
          formats.push({
            format_id: "video",
            ext: "mp4",
            resolution: "720p",
            filesize: data.video_size || 0,
            url: data.video || data.video_url || data.play_url
          });
        }
        if (data.image || data.display_url) {
          formats.push({
            format_id: "image",
            ext: "jpg",
            resolution: "1080p",
            filesize: data.image_size || 0,
            url: data.image || data.display_url
          });
        }

        var result = {
          id: data.id || Date.now().toString(),
          title: data.title || data.caption || "Instagram Post",
          description: data.caption || data.title || "",
          uploader: (data.owner || {}).username || data.username || "Unknown",
          uploader_id: (data.owner || {}).id || data.user_id || "",
          duration_seconds: data.duration || 0,
          view_count: data.views || data.play_count || 0,
          like_count: data.likes || 0,
          comment_count: data.comments || 0,
          share_count: 0,
          thumbnail: data.thumbnail || data.cover || data.display_url || "",
          webpage_url: url,
          formats: formats.filter(function(f) { return f.url; }),
          is_carousel: data.is_carousel || false,
          medias: {
            audio: [],
            video: [],
            combined: []
          }
        };

        if (result.formats) {
          result.medias.video = result.formats.filter(function(f) {
            return f.ext === "mp4";
          }).map(function(f) {
            return {
              itag: f.format_id,
              bitrate: 0,
              quality: f.resolution,
              filesize: f.filesize,
              mimeType: "video/mp4",
              url: f.url,
              height: parseInt(f.resolution) || 720,
              width: 0,
              fps: 30
            };
          });
        }
        
        setCache(cacheKey, result);
        return result;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// =============================================
// TWITTER/X EXTRACTOR
// =============================================

async function DARKz_twitter_extract(url) {
  var cacheKey = "tw_" + url;
  var cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    var tweetId = url.match(/status\/(\d+)/);
    tweetId = tweetId ? tweetId[1] : null;
    if (!tweetId) return null;

    var apiUrl = "https://api.twitter.com/2/tweets/" + tweetId + "?expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url,type,duration_ms,height,width&tweet.fields=created_at,public_metrics,text,source";
    
    var data = await fetchWithRetry(apiUrl, {
      headers: { "Authorization": "Bearer " + CONFIG.twitter_bearer_token }
    });

    if (data && data.data) {
      var tweet = data.data;
      var includes = data.includes || {};
      var media = includes.media || [];
      var user = (includes.users || [])[0] || {};

      var formats = [];
      for (var mi = 0; mi < media.length; mi++) {
        var m = media[mi];
        formats.push({
          format_id: "tw_" + mi,
          ext: m.type === "video" ? "mp4" : (m.type === "photo" ? "jpg" : "mp4"),
          resolution: m.type === "video" ? (m.height || 720) + "p" : "image",
          filesize: 0,
          url: m.url || m.preview_image_url
        });
