const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Shared state ─────────────────────────────────────────────────────────────
let state = {
  home: 0, away: 0, min: 0, sec: 0,
  period: "1H", running: false, events: [], tips: [],
  teams: {
    home: { name: "", logo: "", col: "#ef4444" },
    away: { name: "", logo: "", col: "#6366f1" }
  },
  comp: "Liga Portugal",
  alert: null
};

let timerInterval = null;

function startServerTimer() {
  if (state.running) return;
  state.running = true;
  timerInterval = setInterval(() => {
    if (state.period === "HT" || state.period === "FT") return;
    state.sec++;
    if (state.sec >= 60) { state.sec = 0; state.min++; }
    broadcastTick();
  }, 1000);
}

function stopServerTimer() {
  state.running = false;
  clearInterval(timerInterval);
  timerInterval = null;
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
// Try WebSocket first, fall back to polling via REST
let wss;
try {
  wss = new WebSocket.Server({ server });
  wss.on("connection", ws => {
    ws.send(JSON.stringify({ type: "state", state }));
    ws.on("message", raw => {
      try { handleAction(JSON.parse(raw)); } catch {}
    });
  });
  console.log("WebSocket enabled");
} catch(e) {
  console.log("WebSocket not available, using polling");
}

function broadcast(msg) {
  if (!wss) return;
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(data);
  });
}

function broadcastState() { broadcast({ type: "state", state }); }
function broadcastTick() {
  broadcast({ type: "tick", min: state.min, sec: state.sec, period: state.period });
}

// ── REST API for polling fallback ─────────────────────────────────────────────
app.get("/api/state", (req, res) => res.json(state));

app.post("/api/action", (req, res) => {
  handleAction(req.body);
  res.json({ ok: true });
});

function handleAction(msg) {
  switch (msg.action) {
    case "setComp": state.comp = msg.value; break;
    case "setTeam": state.teams[msg.side] = msg.team; break;
    case "setColor": state.teams[msg.side].col = msg.col; break;
    case "start": startServerTimer(); break;
    case "pause": stopServerTimer(); break;
    case "reset": stopServerTimer(); state.min = 0; state.sec = 0; break;
    case "setMin": state.min = msg.min; state.sec = 0; break;
    case "setPeriod":
      if (msg.period === "HT" || msg.period === "FT") stopServerTimer();
      if (msg.period === "2H" && state.min < 45) { state.min = 45; state.sec = 0; }
      if (msg.period === "ET" && state.min < 90) { state.min = 90; state.sec = 0; }
      state.period = msg.period;
      break;
    case "goal":
      state[msg.side]++;
      state.events.unshift({ type: "goal", side: msg.side, min: state.min, txt: `Golo — ${state.teams[msg.side].name || msg.side}` });
      break;
    case "undo":
      if (state[msg.side] > 0) {
        state[msg.side]--;
        const idx = state.events.findIndex(e => e.type === "goal" && e.side === msg.side);
        if (idx !== -1) state.events.splice(idx, 1);
      }
      break;
    case "yellow":
      state.events.unshift({ type: "yellow", side: msg.side, min: state.min, txt: `Cartão amarelo — ${state.teams[msg.side].name || msg.side}` });
      break;
    case "red":
      state.events.unshift({ type: "red", side: msg.side, min: state.min, txt: `Cartão vermelho — ${state.teams[msg.side].name || msg.side}` });
      break;
    case "custom":
      state.events.unshift({ type: "custom", side: msg.side, min: state.min, txt: msg.txt });
      break;
    case "delEvent": state.events.splice(msg.index, 1); break;
    case "addTip": state.tips.unshift(msg.tip); break;
    case "updateTipStatus": if (state.tips[msg.index]) state.tips[msg.index].status = msg.status; break;
    case "delTip": state.tips.splice(msg.index, 1); break;
    case "resetAll":
      stopServerTimer();
      state = { home:0, away:0, min:0, sec:0, period:"1H", running:false, events:[], tips:[],
        teams:{ home:{name:"",logo:"",col:"#ef4444"}, away:{name:"",logo:"",col:"#6366f1"} },
        comp:"Liga Portugal", alert:null };
      break;
  }
  broadcastState();
}

// ── Logo API ──────────────────────────────────────────────────────────────────
let CLUBS = {};
const DB_FILE = path.join(__dirname, "../public/clubs.json");
if (fs.existsSync(DB_FILE)) {
  CLUBS = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  console.log(`📦 ${Object.keys(CLUBS).length} equipas carregadas`);
}

app.get("/api/logo/search", (req, res) => {
  const q = (req.query.q || "").toString().toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);
  const seen = new Set();
  const results = [];
  for (const club of Object.values(CLUBS)) {
    if ((club.shortName.toLowerCase().includes(q) || club.name.toLowerCase().includes(q)) && !seen.has(club.id)) {
      seen.add(club.id);
      results.push({ name: club.shortName, country: club.country, color: "#6366f1", logo: club.logo, proxyLogo: club.logo });
    }
    if (results.length >= 8) break;
  }
  res.json(results);
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
app.get("/scoreboard",  (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/scoreboard.html")));
app.get("/tips",        (req, res) => res.sendFile(path.join(__dirname, "../public/overlays/tips.html")));
app.get("/admin",       (req, res) => res.sendFile(path.join(__dirname, "../public/admin.html")));
app.get("/admin/tips",  (req, res) => res.sendFile(path.join(__dirname, "../public/admin-tips.html")));

server.listen(PORT, () => {
  console.log(`✅ Stream Overlays running on http://localhost:${PORT}`);
  console.log(`   Overlay OBS: http://localhost:${PORT}/scoreboard`);
  console.log(`   Admin:       http://localhost:${PORT}/admin`);
});
