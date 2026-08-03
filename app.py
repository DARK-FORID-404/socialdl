# =============================================
import os,sys,time,re,json,requests,subprocess
from flask import Flask, request, jsonify
from datetime import datetime
app = Flask(__name__)

DARKz_DEVELOPER = {
    "api_name": "SOCIAL DL - All-in-One Media Downloader API",
    "api_version": "1.0.0",
    "api_developer": "DARK FORID",
    "dev_github": "https://github.com/DARK-FORID-404",
    "dev_telegram": "https://t.me/@UnknownXBoyX"
}

DARKz_CLIENTS = {
    "ios": {
        "clientName": "IOS",
        "clientVersion": "19.45.4",
        "deviceMake": "Apple",
        "deviceModel": "iPhone16,2",
        "osName": "iPhone",
        "osVersion": "18.1.0.22B83",
        "userAgent": "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
        "hl": "en",
        "timeZone": "UTC",
        "utcOffsetMinutes": 0
    },
    "android_vr": {
        "clientName": "ANDROID_VR",
        "clientVersion": "1.60.19",
        "androidSdkVersion": 32,
        "deviceMake": "Oculus",
        "deviceModel": "Quest 3",
        "osName": "Android",
        "osVersion": "12L",
        "userAgent": "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
        "hl": "en",
        "timeZone": "UTC",
        "utcOffsetMinutes": 0
    },
    "android": {
        "clientName": "ANDROID",
        "clientVersion": "19.44.38",
        "androidSdkVersion": 30,
        "osName": "Android",
        "osVersion": "11",
        "userAgent": "com.google.android.youtube/19.44.38 (Linux; U; Android 11) gzip",
        "hl": "en",
        "timeZone": "UTC",
        "utcOffsetMinutes": 0
    }
}

DARKz_PLATFORMS = {
    "youtube": r"(youtube\.com|youtu\.be)",
    "facebook": r"(facebook\.com|fb\.watch)",
    "instagram": r"instagram\.com",
    "tiktok": r"tiktok\.com",
    "twitter": r"(twitter\.com|x\.com)",
    "reddit": r"reddit\.com",
    "vimeo": r"vimeo\.com",
    "dailymotion": r"dailymotion\.com",
    "soundcloud": r"soundcloud\.com",
    "twitch": r"twitch\.tv",
    "pinterest": r"pinterest\.com"
}

def DARKz_detect_platform(DARKz_url):
    for DARKz_p, DARKz_pt in DARKz_PLATFORMS.items():
        if re.search(DARKz_pt, DARKz_url, re.IGNORECASE):
            return DARKz_p
    return "unknown"

def DARKz_extract_id(DARKz_url):
    DARKz_patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"embed\/([0-9A-Za-z_-]{11})"
    ]
    for DARKz_pat in DARKz_patterns:
        DARKz_match = re.search(DARKz_pat, DARKz_url)
        if DARKz_match:
            return DARKz_match.group(1)
    return None

def DARKz_fetch_page(DARKz_id):
    DARKz_url = f"https://www.youtube.com/watch?v={DARKz_id}"
    DARKz_headers = {
        "accept-language": "en-US,en;q=0.5",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }
    try:
        DARKz_resp = requests.get(DARKz_url, headers=DARKz_headers, timeout=15)
        return DARKz_resp.status_code, DARKz_resp.text
    except:
        return 0, ""

def DARKz_parse_video_info(DARKz_html):
    DARKz_result = {}
    
    DARKz_match = re.search(r'ytInitialPlayerResponse\s*=\s*({.*?});', DARKz_html, re.DOTALL)
    if not DARKz_match:
        return None
    
    try:
        DARKz_player = json.loads(DARKz_match.group(1))
    except:
        return None
    
    DARKz_vd = DARKz_player.get("videoDetails", {})
    DARKz_mf = DARKz_player.get("microformat", {}).get("playerMicroformatRenderer", {})
    
    if not DARKz_vd.get("videoId"):
        return None
    
    DARKz_result["id"] = DARKz_vd.get("videoId")
    DARKz_result["title"] = DARKz_vd.get("title")
    DARKz_result["description"] = (DARKz_vd.get("shortDescription") or "")[:300]
    DARKz_result["uploader"] = DARKz_vd.get("author")
    DARKz_result["channel_id"] = DARKz_vd.get("channelId")
    DARKz_result["channel_url"] = DARKz_mf.get("ownerProfileUrl")
    DARKz_result["duration_seconds"] = int(DARKz_vd.get("lengthSeconds", 0))
    DARKz_result["view_count"] = int(DARKz_vd.get("viewCount", 0))
    DARKz_result["is_live"] = DARKz_vd.get("isLiveContent", False)
    DARKz_result["upload_date"] = DARKz_mf.get("uploadDate")
    DARKz_result["publish_date"] = DARKz_mf.get("publishDate")
    DARKz_result["category"] = DARKz_mf.get("category")
    DARKz_result["webpage_url"] = f"https://www.youtube.com/watch?v={DARKz_vd.get('videoId')}"
    
    DARKz_result["thumbnails"] = {}
    for DARKz_thumb in DARKz_vd.get("thumbnail", {}).get("thumbnails", []):
        DARKz_result["thumbnails"][f"{DARKz_thumb['width']}x{DARKz_thumb['height']}"] = DARKz_thumb["url"]
    
    if DARKz_result["thumbnails"]:
        DARKz_result["thumbnail"] = list(DARKz_result["thumbnails"].values())[-1]
    else:
        DARKz_result["thumbnail"] = f"https://img.youtube.com/vi/{DARKz_vd.get('videoId')}/maxresdefault.jpg"
    
    return DARKz_result

def DARKz_parse_config(DARKz_html):
    DARKz_result = {}
    
    DARKz_match = re.search(r'"INNERTUBE_API_KEY":"(.*?)"', DARKz_html)
    DARKz_result["key"] = DARKz_match.group(1) if DARKz_match else None
    
    DARKz_match = re.search(r'"INNERTUBE_CONTEXT_CLIENT_NAME":(\d+)', DARKz_html)
    DARKz_result["client_name"] = DARKz_match.group(1) if DARKz_match else None
    
    DARKz_match = re.search(r'"INNERTUBE_CONTEXT_CLIENT_VERSION":"(.*?)"', DARKz_html)
    DARKz_result["client_version"] = DARKz_match.group(1) if DARKz_match else None
    
    if DARKz_result["key"] and DARKz_result["client_name"]:
        return DARKz_result
    return None

def DARKz_call_player(DARKz_id, DARKz_config, DARKz_client_type="ios"):
    DARKz_client = DARKz_CLIENTS.get(DARKz_client_type, DARKz_CLIENTS["ios"])
    DARKz_url = f"https://www.youtube.com/youtubei/v1/player?key={DARKz_config['key']}"
    
    DARKz_payload = {
        "context": {"client": DARKz_client},
        "videoId": DARKz_id,
        "playbackContext": {
            "contentPlaybackContext": {
                "html5Preference": "HTML5_PREF_WANTS"
            }
        },
        "racyCheckOk": True
    }
    
    DARKz_headers = {
        "Content-Type": "application/json",
        "User-Agent": DARKz_client["userAgent"],
        "X-YouTube-Client-Name": DARKz_config["client_name"],
        "X-YouTube-Client-Version": DARKz_config["client_version"],
    }
    
    try:
        DARKz_resp = requests.post(DARKz_url, json=DARKz_payload, headers=DARKz_headers, timeout=15)
        if DARKz_resp.status_code == 200:
            return json.loads(DARKz_resp.text)
    except:
        pass
    return None

def DARKz_extract_medias(DARKz_player_data):
    DARKz_audio = []
    DARKz_video = []
    DARKz_combined = []
    
    DARKz_all = []
    for DARKz_key in ["formats", "adaptiveFormats"]:
        DARKz_all.extend(DARKz_player_data.get("streamingData", {}).get(DARKz_key, []))
    
    for DARKz_fmt in DARKz_all:
        DARKz_mime = DARKz_fmt.get("mimeType", "")
        DARKz_entry = {
            "itag": DARKz_fmt.get("itag"),
            "bitrate": DARKz_fmt.get("bitrate"),
            "quality": DARKz_fmt.get("quality"),
            "filesize": int(DARKz_fmt.get("contentLength", 0)),
            "mimeType": DARKz_mime,
            "url": DARKz_fmt.get("url")
        }
        
        if "audio" in DARKz_mime and "video" not in DARKz_mime:
            DARKz_audio.append(DARKz_entry)
        elif "video" in DARKz_mime and "audio" not in DARKz_mime:
            DARKz_entry["height"] = DARKz_fmt.get("height")
            DARKz_entry["width"] = DARKz_fmt.get("width")
            DARKz_entry["fps"] = DARKz_fmt.get("fps")
            DARKz_video.append(DARKz_entry)
        elif "video" in DARKz_mime:
            DARKz_entry["height"] = DARKz_fmt.get("height")
            DARKz_entry["width"] = DARKz_fmt.get("width")
            DARKz_combined.append(DARKz_entry)
    
    DARKz_audio.sort(key=lambda x: x.get("bitrate", 0) or 0, reverse=True)
    DARKz_video.sort(key=lambda x: x.get("height", 0) or 0, reverse=True)
    DARKz_combined.sort(key=lambda x: x.get("height", 0) or 0, reverse=True)
    
    return {
        "audio": DARKz_audio[:5],
        "video": DARKz_video[:10],
        "combined": DARKz_combined[:5]
    }

def DARKz_youtube_extract(DARKz_url):
    DARKz_id = DARKz_extract_id(DARKz_url)
    if not DARKz_id:
        return None
    
    DARKz_status, DARKz_html = DARKz_fetch_page(DARKz_id)
    if DARKz_status != 200:
        return None
    
    DARKz_info = DARKz_parse_video_info(DARKz_html)
    if not DARKz_info:
        return None
    
    DARKz_config = DARKz_parse_config(DARKz_html)
    if not DARKz_config:
        DARKz_info["medias"] = {"audio": [], "video": [], "combined": []}
        return DARKz_info
    
    for DARKz_ct in ["ios", "android_vr", "android"]:
        DARKz_player = DARKz_call_player(DARKz_id, DARKz_config, DARKz_ct)
        if DARKz_player:
            DARKz_info["medias"] = DARKz_extract_medias(DARKz_player)
            return DARKz_info
    
    DARKz_info["medias"] = {"audio": [], "video": [], "combined": []}
    return DARKz_info

def DARKz_install_ytdlp():
    try:
        import yt_dlp
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "yt-dlp"])
        import yt_dlp

def DARKz_ytdlp_extract(DARKz_url, DARKz_fmt, DARKz_quality):
    DARKz_platform = DARKz_detect_platform(DARKz_url)
    
    DARKz_install_ytdlp()
    import yt_dlp

    DARKz_opts = {"quiet": True, "no_warnings": True}
    
    if DARKz_fmt == "audio":
        DARKz_opts["format"] = "bestaudio/best"
    elif DARKz_quality.isdigit():
        DARKz_opts["format"] = f"bestvideo[height<={DARKz_quality}]+bestaudio/best[height<={DARKz_quality}]"
    else:
        DARKz_opts["format"] = "bestvideo+bestaudio/best"

    with yt_dlp.YoutubeDL(DARKz_opts) as DARKz_ydl:
        DARKz_info = DARKz_ydl.extract_info(DARKz_url, download=False)

    return {
        "success": True,
        "platform": DARKz_platform,
        "developer": DARKz_DEVELOPER,
        "result": {
            "title": DARKz_info.get("title"),
            "description": (DARKz_info.get("description") or "")[:500],
            "uploader": DARKz_info.get("uploader"),
            "duration_seconds": DARKz_info.get("duration"),
            "view_count": DARKz_info.get("view_count"),
            "like_count": DARKz_info.get("like_count"),
            "upload_date": DARKz_info.get("upload_date"),
            "thumbnail": DARKz_info.get("thumbnail"),
            "webpage_url": DARKz_info.get("webpage_url"),
            "requested_format": DARKz_fmt,
            "requested_quality": DARKz_quality,
            "direct_url": DARKz_info.get("url"),
            "formats": [
                {
                    "format_id": DARKz_f.get("format_id"),
                    "ext": DARKz_f.get("ext"),
                    "resolution": DARKz_f.get("resolution") or DARKz_f.get("format_note"),
                    "filesize": DARKz_f.get("filesize"),
                    "url": DARKz_f.get("url")
                } for DARKz_f in DARKz_info.get("formats", [])[:10]
            ]
        }
    }

@app.route('/api/download')
def DARKz_download():
    DARKz_url = request.args.get('url')
    DARKz_fmt = request.args.get('format', 'video')
    DARKz_quality = request.args.get('quality', 'best')
    
    if not DARKz_url:
        return jsonify({
            "success": False,
            "error": "Missing required param: ?url=",
            "developer": DARKz_DEVELOPER
        }), 400
    
    try:
        DARKz_platform = DARKz_detect_platform(DARKz_url)
        
        if DARKz_platform == "youtube":
            DARKz_data = DARKz_youtube_extract(DARKz_url)
            if DARKz_data:
                return jsonify({
                    "success": True,
                    "platform": "youtube",
                    "developer": DARKz_DEVELOPER,
                    "result": DARKz_data
                })
            else:
                return jsonify({
                    "success": False,
                    "error": "Failed to extract YouTube video info. Video may be private, deleted, or region-blocked.",
                    "developer": DARKz_DEVELOPER
                }), 500
        
        DARKz_data = DARKz_ytdlp_extract(DARKz_url, DARKz_fmt, DARKz_quality)
        return jsonify(DARKz_data)
        
    except Exception as DARKz_e:
        return jsonify({
            "success": False,
            "error": str(DARKz_e),
            "developer": DARKz_DEVELOPER
        }), 500

@app.route('/api/info')
def DARKz_info():
    return jsonify({
        "success": True,
        "message": "API Info Fetched Successfully",
        "developer": DARKz_DEVELOPER
    })

@app.route('/')
def DARKz_home():
    return jsonify({
        "success": True,
        "message": "DARKz [SOCIAL DL] API is Running",
        "usage": "https://your-app.onrender.com/api/download?url=",
        "developer": DARKz_DEVELOPER
    })

if __name__ == '__main__':
    DARKz_port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=DARKz_port)
