# 🎮 Stream Overlays

Overlays profissionais para OBS — scoreboard ao vivo, tips, countdown, probabilidade de vitória, heatmap de golos e alertas.

## 📁 Estrutura

```
stream-overlays/
├── server/
│   └── index.js          ← Backend Express + proxy de logos
├── public/
│   ├── index.html         ← Homepage com links para overlays
│   ├── admin.html         ← Painel de gestão (em desenvolvimento)
│   └── overlays/
│       ├── scoreboard.html  ← Scoreboard ao vivo com logos reais
│       ├── tips.html        ← Tips ao vivo
│       ├── countdown.html   ← Countdown próximo jogo
│       ├── probability.html ← Probabilidade de vitória
│       ├── heatmap.html     ← Heatmap de golos
│       └── alert.html       ← Alertas de tip
├── package.json
└── railway.toml
```

## 🚀 Deploy no Railway

### 1. Criar repositório GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USERNAME/stream-overlays.git
git push -u origin main
```

### 2. Deploy no Railway
1. Vai a [railway.app](https://railway.app)
2. Clica em **New Project → Deploy from GitHub repo**
3. Seleciona o repositório `stream-overlays`
4. Railway deteta automaticamente o Node.js e faz deploy

### 3. URLs dos overlays (após deploy)
```
https://SEU-PROJETO.up.railway.app/           ← Homepage
https://SEU-PROJETO.up.railway.app/scoreboard ← Scoreboard OBS
https://SEU-PROJETO.up.railway.app/tips       ← Tips OBS
https://SEU-PROJETO.up.railway.app/countdown  ← Countdown OBS
https://SEU-PROJETO.up.railway.app/probability← Probabilidade OBS
https://SEU-PROJETO.up.railway.app/heatmap    ← Heatmap OBS
https://SEU-PROJETO.up.railway.app/alert      ← Alertas OBS
```

## 💻 Desenvolvimento local

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

## 🔌 Logo API

O servidor tem um proxy que busca logos do Wikimedia sem bloqueios CORS:

```
GET /api/logo/search?q=benfica
→ [{ name, country, color, logo, proxyLogo }]

GET /api/logo/img?url=https://upload.wikimedia.org/...
→ Imagem PNG (proxy server-side)
```

## 🎯 Configurar no OBS

1. Adiciona uma **Browser Source** no OBS
2. URL: `https://SEU-PROJETO.up.railway.app/scoreboard`
3. Largura: `800` / Altura: `200` (scoreboard)
4. Marca **"Refresh browser when scene becomes active"**

## 🏗 Adicionar overlays ao OBS

| Overlay | URL | Resolução sugerida |
|---------|-----|-------------------|
| Scoreboard | `/scoreboard` | 800×200 |
| Tips | `/tips` | 400×600 |
| Countdown | `/countdown` | 600×300 |
| Probabilidade | `/probability` | 700×250 |
| Heatmap | `/heatmap` | 700×400 |
| Alerta | `/alert` | 400×200 |
