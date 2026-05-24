const fetch = require('node-fetch');
const TOKEN = '29757506dbc94ae89ba828dd98fd5f0f';
(async () => {
  const r = await fetch('https://api.football-data.org/v4/teams?name=Benfica', {
    headers: { 'X-Auth-Token': TOKEN }
  });
  const d = await r.json();
  console.log(JSON.stringify(d, null, 2));
})();