// Scheduled Netlify function — fires every 15 min during match hours (UTC).
// Fetches live WC 2026 fixtures from API-Football and patches scores to Supabase.
// Costs exactly 1 API call per invocation regardless of user count.
//
// Required env vars (set in Netlify dashboard):
//   RAPIDAPI_KEY         — API-Football key (x-apisports-key)
//   SUPABASE_URL         — https://<ref>.supabase.co
//   SUPABASE_SERVICE_KEY — service role key (bypasses RLS for server-side writes)

const STATUS_MAP = {
  'FT': 'ft', 'AET': 'ft', 'PEN': 'ft',
  '1H': 'live', '2H': 'live', 'ET': 'live', 'P': 'live', 'INT': 'live', 'LIVE': 'live',
  'HT': 'ht', 'BT': 'ht',
  'NS': 'upcoming', 'TBD': 'upcoming', 'PST': 'upcoming',
  'SUSP': 'upcoming', 'ABD': 'upcoming', 'CANC': 'upcoming',
};

exports.handler = async () => {
  const API_KEY = process.env.RAPIDAPI_KEY;
  const SB_URL  = process.env.SUPABASE_URL;
  const SB_KEY  = process.env.SUPABASE_SERVICE_KEY;

  if (!API_KEY || !SB_URL || !SB_KEY) {
    console.error('sync-live: missing env vars — RAPIDAPI_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
    return { statusCode: 500, body: 'Missing env vars' };
  }

  // 1 API call — fetch all currently-live WC 2026 fixtures
  let fixtures;
  try {
    const resp = await fetch(
      'https://v3.football.api-sports.io/fixtures?league=1&season=2026&status=1H-HT-2H-ET-P-BT-LIVE',
      { headers: { 'x-apisports-key': API_KEY } }
    );
    if (!resp.ok) {
      console.error(`sync-live: API returned ${resp.status}`);
      return { statusCode: 200, body: `API ${resp.status} — skipped` };
    }
    const json = await resp.json();
    fixtures = json.response || [];
  } catch (err) {
    console.error('sync-live: API fetch failed:', err.message);
    return { statusCode: 200, body: 'API unreachable — skipped' };
  }

  if (!fixtures.length) {
    console.log('sync-live: no live matches right now');
    return { statusCode: 200, body: 'No live matches' };
  }

  // PATCH only the mutable fields — preserves home_code, group_label etc. from the full sync
  const now = new Date().toISOString();
  const results = await Promise.allSettled(
    fixtures.map(f => {
      const patch = {
        status:     STATUS_MAP[f.fixture.status.short] || 'live',
        minute:     f.fixture.status.elapsed,
        home_score: f.goals.home,
        away_score: f.goals.away,
        synced_at:  now,
      };
      return fetch(`${SB_URL}/rest/v1/matches?api_id=eq.${f.fixture.id}`, {
        method: 'PATCH',
        headers: {
          'apikey':        SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(patch),
      });
    })
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  const msg = `sync-live: updated ${fixtures.length - failed}/${fixtures.length} match(es)`;
  if (failed) console.error(msg);
  else console.log(msg);

  return { statusCode: 200, body: msg };
};
