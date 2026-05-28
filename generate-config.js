const fs = require('fs');

const config = {
  SUPABASE_URL:  process.env.SUPABASE_URL,
  SUPABASE_ANON: process.env.SUPABASE_ANON,
  RAPIDAPI_KEY:  process.env.RAPIDAPI_KEY,
  WC2026_LEAGUE: 1,
  WC2026_SEASON: 2026,
};

fs.writeFileSync('config.js', `window.AppConfig = ${JSON.stringify(config, null, 2)};\n`);
console.log('config.js generated');
