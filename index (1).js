// /api/index.js — API info & health check
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    api: "GlenTechKenya API",
    tagline: "Social Media Downloader API — Built in Kenya 🇰🇪",
    version: "1.0.0",
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: {
      download: {
        method: "GET",
        path: "/api/download",
        params: { url: "Social media URL (required)", apikey: "Your API key (required)" },
        example: "/api/download?url=https://www.tiktok.com/@user/video/123&apikey=GTKAPI-FREE-001"
      },
      keygen: {
        method: "GET",
        path: "/api/keygen",
        params: { name: "Your name", email: "Your email" },
        example: "/api/keygen?name=Glen&email=glen@example.com"
      },
      status: {
        method: "GET",
        path: "/api/index",
        description: "API health check"
      }
    },
    supported_platforms: ["TikTok","YouTube","Instagram","Facebook","Twitter/X"],
    free_keys: ["GTKAPI-FREE-001","GTKAPI-FREE-002"],
    contact: "glentechkenya@gmail.com",
    website: "https://glentechkenya-api.vercel.app"
  });
};
