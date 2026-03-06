// /api/keygen.js — Generate free API keys for users
// In production, connect this to a database (e.g. Supabase/PlanetScale)

const crypto = require("crypto");

function generateKey() {
  const rand = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `GTKAPI-${rand.slice(0,4)}-${rand.slice(4,8)}`;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { name, email } = req.query;

  if (!name || !email) {
    return res.status(400).json({
      status: "error",
      message: "Please provide ?name=YourName&email=your@email.com"
    });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: "error", message: "Invalid email address." });
  }

  const key = generateKey();
  const issued = new Date().toISOString();

  // NOTE: In production, save key to Supabase/Firebase/MongoDB
  // For now, keys are shown once — user must save them
  return res.status(200).json({
    status: "success",
    message: "Your GlenTechKenya API key has been generated. Save it — it won't be shown again!",
    api_key: key,
    plan: "Free",
    requests_per_day: 100,
    issued_to: name,
    issued_at: issued,
    api: "GlenTechKenya API",
    docs: "https://glentechkenya-api.vercel.app",
    note: "To upgrade to Pro (unlimited), contact: glentechkenya@gmail.com"
  });
};
