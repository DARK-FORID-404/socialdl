// main.js - Complete Social Media Downloader API for Deno Deploy
// All syntax errors fixed - Production Ready

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
  pinterest: /(pinterest\.com|pin\.it)/i
};

function DARKz_detect_platform(url) {
  var keys = Object.keys(DARKz_PLATFORMS);
  for (var i = 0; i < keys.length; i++) {
    var platform = keys[i];
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
  if (match) {
    return match[1];
  }
  return null;
}

async function fetchWithRetry(url, options, retries) {
  if (!options) options = {};
  if (!retries) retries = 3;
  
  for (var i = 0; i < retries; i++) {
    try {
      var headers = options.headers || {};
      var fetchOptions = {
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      };
      
      if (options.headers) {
        for (var key in options.headers) {
          fetchOptions.headers[key] = options.headers[key];
        }
      }
      
      if (options.body) {
        fetchOptions.body = options.body;
      }
      
      var response = await fetch(url, fetchOptions);
      
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
// YOUTUBE EXTRACTOR
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

    var medias = {
      audio: [],
      video: [],
      combined: []
    };

    var result = {
      id: vd.videoId,
      title: vd.title || "Unknown",
      description: (vd.shortDescription || "").slice(0, 300),
      uploader: vd.author || "Unknown",
      channel_id: vd.channelId || "",
      channel_url: mf.ownerProfileUrl || "",
      duration_seconds: parseInt(vd.lengthSeconds, 10) || 0,
      view_count: parseInt(vd.viewCount, 10) || 0,
      is_live: vd.isLiveContent || false,
      upload_date: mf.uploadDate || "",
      publish_date: mf.publishDate || "",
      category: mf.category || "",
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
        var videoUrl = data.video_no_watermark || data.video || data.play_url;
        formats.push({
          format_id: "video_no_watermark",
          ext: "mp4",
          resolution: "1080p",
          filesize: data.video_size || 0,
          url: videoUrl
        });
      }
      
      if (data.music || data.audio) {
        var audioUrl = data.music || data.audio;
        formats.push({
          format_id: "audio",
          ext: "mp3",
          resolution: "audio",
          filesize: data.music_size || 0,
          url: audioUrl
        });
      }

      var author = data.author || {};
      var thumbnails = data.thumbnails || [];
      
      var result = {
        id: data.id,
        title: data.title || data.desc || "TikTok Video",
        description: data.desc || data.title || "",
        uploader: author.unique_id || author.nickname || "Unknown",
        uploader_id: author.unique_id || "",
        duration_seconds: data.duration || 0,
        view_count: data.play_count || data.views || 0,
        like_count: data.digg_count || data.likes || 0,
        comment_count: data.comment_count || 0,
        share_count: data.share_count || 0,
        thumbnail: data.cover || (thumbnails.length > 0 ? thumbnails[0] : "") || "",
        webpage_url: url,
        formats: formats,
        medias: {
          audio: [],
          video: [],
          combined: []
        }
      };

      if (result.formats && result.formats.length > 0) {
        result.medias.audio = result.formats
          .filter(function(f) { return f.resolution === "audio"; })
          .map(function(f) {
            return {
              itag: f.format_id,
              bitrate: 0,
              quality: "audio",
              filesize: f.filesize,
              mimeType: "audio/mp4",
              url: f.url
            };
          });
        
        result.medias.video = result.formats
          .filter(function(f) { return f.resolution !== "audio"; })
          .map(function(f) {
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
        formats: formats,
        medias: {
          audio: [],
          video: [],
          combined: []
        }
      };

      if (result.formats && result.formats.length > 0) {
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

        var owner = data.owner || {};
        
        var result = {
          id: data.id || Date.now().toString(),
          title: data.title || data.caption || "Instagram Post",
          description: data.caption || data.title || "",
          uploader: owner.username || data.username || "Unknown",
          uploader_id: owner.id || data.user_id || "",
          duration_seconds: data.duration || 0,
          view_count: data.views || data.play_count || 0,
          like_count: data.likes || 0,
          comment_count: data.comments || 0,
          share_count: 0,
          thumbnail: data.thumbnail || data.cover || data.display_url || "",
          webpage_url: url,
          formats: formats,
          is_carousel: data.is_carousel || false,
          medias: {
            audio: [],
            video: [],
            combined: []
          }
        };

        if (result.formats && result.formats.length > 0) {
          result.medias.video = result.formats
            .filter(function(f) { return f.ext === "mp4"; })
            .map(function(f) {
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
    var tweetIdMatch = url.match(/status\/(\d+)/);
    var tweetId = tweetIdMatch ? tweetIdMatch[1] : null;
    if (!tweetId) return null;

    var apiUrl = "https://api.twitter.com/2/tweets/" + tweetId + "?expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url,type,duration_ms,height,width&tweet.fields=created_at,public_metrics,text,source";
    
    var data = await fetchWithRetry(apiUrl, {
      headers: { "Authorization": "Bearer " + CONFIG.twitter_bearer_token }
    });

    if (data && data.data) {
      var tweet = data.data;
      var includes = data.includes || {};
      var media = includes.media || [];
      var users = includes.users || [];
      var user = users.length > 0 ? users[0] : {};
      
      var formats = [];
      for (var mi = 0; mi < media.length; mi++) {
        var m = media[mi];
        var ext = "mp4";
        if (m.type === "photo") ext = "jpg";
        formats.push({
          format_id: "tw_" + mi,
          ext: ext,
          resolution: m.type === "video" ? (m.height || 720) + "p" : "image",
          filesize: 0,
          url: m.url || m.preview_image_url
        });
      }

      var publicMetrics = tweet.public_metrics || {};
      
      var result = {
        id: tweet.id,
        title: tweet.text.slice(0, 100),
        description: tweet.text,
        uploader: user.username || "Unknown",
        uploader_id: user.id || "",
        duration_seconds: media.length > 0 && media[0].duration_ms ? Math.floor(media[0].duration_ms / 1000) : 0,
        view_count: publicMetrics.view_count || 0,
        like_count: publicMetrics.like_count || 0,
        comment_count: publicMetrics.reply_count || 0,
        share_count: publicMetrics.retweet_count || 0,
        thumbnail: media.length > 0 ? (media[0].preview_image_url || media[0].url || "") : "",
        webpage_url: "https://twitter.com/" + user.username + "/status/" + tweet.id,
        formats: formats,
        medias: {
          audio: [],
          video: [],
          combined: []
        }
      };

      if (result.formats && result.formats.length > 0) {
        result.medias.video = result.formats
          .filter(function(f) { return f.ext === "mp4"; })
          .map(function(f) {
            return {
              itag: f.format_id,
              bitrate: 0,
              quality: f.resolution,
              filesize: f.filesize,
              mimeType: "video/mp4",
              url: f.url,
              height: 720,
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
// REDDIT EXTRACTOR
// =============================================

async function DARKz_reddit_extract(url) {
  var cacheKey = "rd_" + url;
  var cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    var postIdMatch = url.match(/comments\/([a-zA-Z0-9]+)/);
    var postId = postIdMatch ? postIdMatch[1] : null;
    if (!postId) {
      postIdMatch = url.match(/r\/[^\/]+\/([a-zA-Z0-9]+)/);
      postId = postIdMatch ? postIdMatch[1] : null;
    }
    if (!postId) return null;

    var apiUrl = "https://www.reddit.com/api/info.json?id=t3_" + postId;
    var data = await fetchWithRetry(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (data && data.data && data.data.children && data.data.children.length > 0) {
      var post = data.data.children[0].data;
      var media = post.media || {};
      var secure_media = post.secure_media || {};
      var reddit_video = media.reddit_video || secure_media.reddit_video || {};
      
      var formats = [];
      
      if (reddit_video.fallback_url) {
        formats.push({
          format_id: "video",
          ext: "mp4",
          resolution: (reddit_video.height || 720) + "p",
          filesize: 0,
          url: reddit_video.fallback_url
        });
        formats.push({
          format_id: "audio",
          ext: "mp3",
          resolution: "audio",
          filesize: 0,
          url: reddit_video.fallback_url.replace(".mp4", ".mp3")
        });
      }
      
      if (post.url && post.url.match(/\.(mp4|webm|gif|jpg|png)$/)) {
        var ext = post.url.split('
