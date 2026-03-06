const fetch = require("node-fetch");

// ─────────────────────────────────────────────
//  GlenTechKenya API — /api/download
//  Usage: GET /api/download?url=<link>&apikey=<key>
// ─────────────────────────────────────────────

// Valid API keys — add yours here or manage via Vercel env vars
const VALID_KEYS = (process.env.GLENTECHKENYA_KEYS || "GTKAPI-FREE-001,GTKAPI-FREE-002,GTKAPI-GLEN-PRO").split(",");

function detectPlatform(url) {
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/facebook\.com|fb\.watch/i.test(url)) return "facebook";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  if (/pinterest\.com/i.test(url)) return "pinterest";
  if (/snapchat\.com/i.test(url)) return "snapchat";
  return "unknown";
}

// ── TikTok via tikwm.com (free, no key) ──
async function downloadTikTok(url) {
  const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
  const data = await res.json();
  if (!data || data.code !== 0) throw new Error("TikTok fetch failed");
  const d = data.data;
  return {
    title: d.title || "TikTok Video",
    author: d.author?.nickname || "",
    thumbnail: d.cover,
    duration: d.duration,
    platform: "tiktok",
    medias: [
      { quality: "HD (No Watermark)", url: `https://www.tikwm.com${d.hdplay}`, ext: "mp4" },
      { quality: "SD (No Watermark)", url: `https://www.tikwm.com${d.play}`, ext: "mp4" },
      { quality: "Audio Only", url: `https://www.tikwm.com${d.music}`, ext: "mp3" },
    ].filter(m => m.url && m.url !== "https://www.tikwm.comundefined")
  };
}

// ── YouTube via yt1s-style cobalt/noembed ──
async function downloadYouTube(url) {
  // Use cobalt.tools API (free, open source)
  const res = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ url, vCodec: "h264", vQuality: "720", aFormat: "mp3", filenamePattern: "basic" })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.text || "YouTube fetch failed");

  // Get title via noembed
  let title = "YouTube Video", thumbnail = "", author = "";
  try {
    const meta = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const m = await meta.json();
    title = m.title || title;
    thumbnail = m.thumbnail_url || thumbnail;
    author = m.author_name || author;
  } catch (_) {}

  const medias = [];
  if (data.status === "stream" || data.status === "redirect") {
    medias.push({ quality: "720p Video", url: data.url, ext: "mp4" });
  } else if (data.status === "picker") {
    data.picker?.forEach((p, i) => medias.push({ quality: `Option ${i+1}`, url: p.url, ext: "mp4" }));
  }

  return { title, author, thumbnail, platform: "youtube", medias };
}

// ── Instagram via instavideosave ──
async function downloadInstagram(url) {
  const res = await fetch(`https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`, {
    headers: {
      "x-rapidapi-host": "instagram-downloader-download-instagram-videos-stories.p.rapidapi.com",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY || ""
    }
  });

  // Fallback: use saveinsta-style scraper
  const fallback = await fetch(`https://www.saveig.app/api?url=${encodeURIComponent(url)}`).catch(() => null);
  if (fallback) {
    const fd = await fallback.json().catch(() => null);
    if (fd && fd.data) {
      return {
        title: "Instagram Media",
        author: "",
        thumbnail: fd.data[0]?.thumbnail || "",
        platform: "instagram",
        medias: fd.data.map((d, i) => ({ quality: d.type === "video" ? `Video ${i+1}` : `Image ${i+1}`, url: d.url, ext: d.type === "video" ? "mp4" : "jpg" }))
      };
    }
  }
  throw new Error("Instagram fetch failed. Try a public post URL.");
}

// ── Facebook & Twitter via cobalt ──
async function downloadGeneric(url, platform) {
  const res = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ url, vCodec: "h264", vQuality: "720", filenamePattern: "basic" })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.text || `${platform} fetch failed`);

  const medias = [];
  if (data.status === "stream" || data.status === "redirect") {
    medias.push({ quality: "Video", url: data.url, ext: "mp4" });
  } else if (data.status === "picker") {
    data.picker?.forEach((p, i) => medias.push({ quality: `Option ${i+1}`, url: p.url, ext: p.type === "photo" ? "jpg" : "mp4" }));
  }

  return { title: `${platform} Media`, author: "", thumbnail: "", platform, medias };
}

// ─────────────────────────────────────────────
module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const url = req.query.url || req.body?.url;
  const apikey = req.query.apikey || req.headers["x-api-key"] || req.body?.apikey;

  // ── Validate API key ──
  if (!apikey) {
    return res.status(401).json({
      status: "error",
      code: 401,
      message: "Missing API key. Pass ?apikey=YOUR_KEY or header x-api-key.",
      docs: "https://glentechkenya-api.vercel.app"
    });
  }

  if (!VALID_KEYS.includes(apikey)) {
    return res.status(403).json({
      status: "error",
      code: 403,
      message: "Invalid API key. Get a free key at https://glentechkenya-api.vercel.app",
      docs: "https://glentechkenya-api.vercel.app"
    });
  }

  if (!url) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Missing 'url' parameter.",
      example: "/api/download?url=https://www.tiktok.com/@user/video/123&apikey=GTKAPI-FREE-001"
    });
  }

  const platform = detectPlatform(url);

  try {
    let result;
    if (platform === "tiktok") result = await downloadTikTok(url);
    else if (platform === "youtube") result = await downloadYouTube(url);
    else if (platform === "instagram") result = await downloadInstagram(url);
    else if (platform === "facebook" || platform === "twitter") result = await downloadGeneric(url, platform);
    else throw new Error(`Platform not supported: ${platform}`);

    return res.status(200).json({
      status: "success",
      code: 200,
      api: "GlenTechKenya API",
      version: "1.0",
      platform,
      data: result
    });

  } catch (err) {
    return res.status(500).json({
      status: "error",
      code: 500,
      message: err.message || "Download failed",
      platform,
      api: "GlenTechKenya API"
    });
  }
};
