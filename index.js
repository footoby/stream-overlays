const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Load clubs database (built by download-logos.js)
let CLUBS = {};
const DB_FILE = path.join(__dirname, "../public/clubs.json");
if (fs.existsSync(DB_FILE)) {
  CLUBS = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  console.log(`📦 Base de dados carregada: ${Object.keys(CLUBS).length} equipas`);
} else {
  console.log("⚠️  clubs.json não encontrado. Corre: node download-logos.js");
}

// Search clubs from local database
app.get("/api/logo/search", (req, res) => {
  const q = (req.query.q || "").toString().toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);

  const results = [];
  const seen = new Set();

  for (const club of Object.values(CLUBS)) {
    const nameMatch = club.shortName.toLowerCase().includes(q) || club.name.toLowerCase().includes(q);
    if (nameMatch && !seen.has(club.id)) {
      seen.add(club.id);
      results.push({
        name: club.shortName,
        country: club.country,
        color: club.color,
        logo: club.logo,
        proxyLogo: club.logo, // served locally — no proxy needed!
      });
    }
    if (results.length >= 8) break;
  }

  res.json(results);
});

// Serve overlay routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
app.get("/scoreboard",  (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/scoreboard.html")));
app.get("/tips",        (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/tips.html")));
app.get("/countdown",   (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/countdown.html")));
app.get("/probability", (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/probability.html")));
app.get("/heatmap",     (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/heatmap.html")));
app.get("/alert",       (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/alert.html")));
app.get("/admin",       (req, res) => res.sendFile(path.join(__dirname, "../public/admin.html")));

app.listen(PORT, () => {
  console.log(`✅ Stream Overlays running on http://localhost:${PORT}`);
  console.log(`   Logo API: /api/logo/search?q=benfica`);
});
