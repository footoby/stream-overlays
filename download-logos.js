const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const TOKEN = '29757506dbc94ae89ba828dd98fd5f0f';

// Ligas principais disponíveis no plano gratuito
const COMPETITIONS = [
  { code: 'PL',  name: 'Premier League' },
  { code: 'PD',  name: 'La Liga' },
  { code: 'SA',  name: 'Serie A' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'CL',  name: 'Champions League' },
  { code: 'PPL', name: 'Liga Portugal' },
];

const LOGOS_DIR = path.join(__dirname, 'public', 'logos');
const DB_FILE   = path.join(__dirname, 'public', 'clubs.json');

if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadLogo(url, filename) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-Auth-Token': TOKEN }
    });
    if (!r.ok) { console.log('  SKIP', filename, r.status); return false; }
    const buf = await r.buffer();
    fs.writeFileSync(path.join(LOGOS_DIR, filename), buf);
    return true;
  } catch(e) {
    console.log('  ERR', filename, e.message);
    return false;
  }
}

async function main() {
  const clubs = {};
  let total = 0;

  for (const comp of COMPETITIONS) {
    console.log(`\nA carregar ${comp.name}...`);
    try {
      const r = await fetch(`https://api.football-data.org/v4/competitions/${comp.code}/teams`, {
        headers: { 'X-Auth-Token': TOKEN }
      });
      const data = await r.json();
      const teams = data.teams || [];
      console.log(`  ${teams.length} equipas encontradas`);

      for (const t of teams) {
        if (!t.crest) continue;
        const ext = t.crest.endsWith('.svg') ? 'svg' : 'png';
        const filename = `${t.id}.${ext}`;
        const localPath = `/logos/${filename}`;

        if (!fs.existsSync(path.join(LOGOS_DIR, filename))) {
          process.stdout.write(`  Descarregar ${t.shortName || t.name}... `);
          const ok = await downloadLogo(t.crest, filename);
          console.log(ok ? 'OK' : 'FALHOU');
          await sleep(300); // evitar rate limit
        } else {
          console.log(`  ${t.shortName || t.name} - já existe`);
        }

        clubs[t.id] = {
          id: t.id,
          name: t.name,
          shortName: t.shortName || t.name,
          country: t.area ? t.area.name : '',
          color: '#6366f1',
          logo: localPath,
          competitions: [...(clubs[t.id]?.competitions || []), comp.name]
        };
        total++;
      }
    } catch(e) {
      console.log(`  ERRO: ${e.message}`);
    }
    await sleep(1000);
  }

  // Remove duplicados de competições
  for (const id of Object.keys(clubs)) {
    clubs[id].competitions = [...new Set(clubs[id].competitions)];
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(clubs, null, 2));
  console.log(`\n✅ Feito! ${Object.keys(clubs).length} equipas guardadas em public/clubs.json`);
  console.log(`   Logos em public/logos/`);
}

main();
