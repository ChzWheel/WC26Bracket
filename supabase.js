// supabase.js — Supabase client + all DB helpers + API-Football sync.
// Loaded before all other scripts in Brackt.html.

(function () {
  // ── Config ────────────────────────────────────────────────
  const SUPABASE_URL    = window.AppConfig.SUPABASE_URL;
  const SUPABASE_ANON   = window.AppConfig.SUPABASE_ANON;
  const RAPIDAPI_KEY    = window.AppConfig.RAPIDAPI_KEY;
  const WC2026_LEAGUE   = window.AppConfig.WC2026_LEAGUE;
  const WC2026_SEASON   = window.AppConfig.WC2026_SEASON;

  // ── Client ───────────────────────────────────────────────
  // Uses the Supabase JS CDN client (loaded in HTML).
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // ── Auth helpers ─────────────────────────────────────────
  const Auth = {
    async signUp(email, password, name) {
      const av = name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'U';
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { name, avatar: av } },
      });
      if (error) throw error;
      return data.user;
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data.user;
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async getSession() {
      const { data } = await sb.auth.getSession();
      return data.session;
    },

    onAuthStateChange(cb) {
      return sb.auth.onAuthStateChange(cb);
    },
  };

  // ── Profile helpers ───────────────────────────────────────
  const Profiles = {
    async get(userId) {
      const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return data;
    },
  };

  // ── Bracket helpers ───────────────────────────────────────
  const Brackets = {
    async list(userId) {
      const { data, error } = await sb.from('brackets')
        .select('*').eq('user_id', userId).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },

    // guestName: optional display owner for brackets managed on behalf of
    // someone without an account (e.g. "Grandma").
    async create(userId, name, groups, guestName = null) {
      const { data, error } = await sb.from('brackets').insert({
        user_id: userId,
        name,
        guest_name: guestName,
        groups,
        knockout: { r32: {}, r16: {}, qf: {}, sf: {}, thirdQualifiers: [], third: null, final: null },
        step: 0,
        done: false,
      }).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, patch) {
      const { data, error } = await sb.from('brackets')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await sb.from('brackets').delete().eq('id', id);
      if (error) throw error;
    },

    // All brackets submitted to a pool — one leaderboard entry each.
    // Embeds the owner's profile (requires brackets.user_id → profiles FK,
    // see migration-guest-brackets.sql).
    async getAllForPool(poolId) {
      const { data, error } = await sb.from('brackets')
        .select('id, user_id, name, guest_name, score, correct, groups, knockout, submitted_at, profiles(name, avatar)')
        .eq('submitted_to', poolId)
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  };

  // ── Pool helpers ──────────────────────────────────────────
  const Pools = {
    async listForUser(userId) {
      // Get all pools the user is a member of, with member list.
      const { data: memberships, error: me } = await sb.from('pool_members')
        .select('pool_id').eq('user_id', userId);
      if (me) throw me;
      if (!memberships.length) return [];

      const ids = memberships.map(m => m.pool_id);
      const { data: pools, error: pe } = await sb.from('pools')
        .select('*, pool_members(*, profiles(name, avatar))').in('id', ids);
      if (pe) throw pe;
      return pools;
    },

    async create(userId, userName, poolName) {
      const code = Math.random().toString(36).slice(2, 7).toUpperCase();
      const { data: pool, error: pe } = await sb.from('pools')
        .insert({ name: poolName, code, owner_id: userId }).select().single();
      if (pe) throw pe;
      // Auto-join creator
      await sb.from('pool_members').insert({ pool_id: pool.id, user_id: userId, score: 0 });
      return pool;
    },

    async join(userId, code) {
      const { data: pool, error: pe } = await sb.from('pools')
        .select('*').eq('code', code.toUpperCase()).single();
      if (pe) throw new Error('Pool not found — check your code.');
      const { error: me } = await sb.from('pool_members')
        .insert({ pool_id: pool.id, user_id: userId, score: 0 });
      if (me && me.code !== '23505') throw me; // ignore duplicate
      return pool;
    },

    async getWithMembers(poolId) {
      const { data, error } = await sb.from('pools')
        .select('*, pool_members(score, user_id, profiles(name, avatar))')
        .eq('id', poolId).single();
      if (error) throw error;
      return data;
    },

    async deletePool(poolId) {
      // Unsubmit all brackets submitted to this pool first.
      await sb.from('brackets')
        .update({ submitted_to: null, submitted_at: null })
        .eq('submitted_to', poolId);
      const { error } = await sb.from('pools').delete().eq('id', poolId);
      if (error) throw error;
    },

    async leave(poolId, userId) {
      // Unsubmit this user's bracket from the pool.
      await sb.from('brackets')
        .update({ submitted_to: null, submitted_at: null })
        .eq('submitted_to', poolId)
        .eq('user_id', userId);
      const { error } = await sb.from('pool_members')
        .delete().eq('pool_id', poolId).eq('user_id', userId);
      if (error) throw error;
    },
  };

  // ── Match helpers ─────────────────────────────────────────
  const Matches = {
    async getByDay(date) {
      // date: 'yesterday' | 'today' | 'tomorrow'
      const d = new Date();
      if (date === 'yesterday') d.setDate(d.getDate() - 1);
      if (date === 'tomorrow')  d.setDate(d.getDate() + 1);
      const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const { data, error } = await sb.from('matches')
        .select('*')
        .gte('kickoff', `${day}T00:00:00Z`)
        .lte('kickoff', `${day}T23:59:59Z`)
        .order('kickoff', { ascending: true });
      if (error) throw error;
      return data;
    },

    async getAll() {
      const { data, error } = await sb.from('matches')
        .select('*').order('kickoff', { ascending: true });
      if (error) throw error;
      return data;
    },

    async getKnockoutResults() {
      const { data, error } = await sb.from('matches')
        .select('stage, home_code, away_code, home_score, away_score')
        .in('stage', ['r32', 'r16', 'qf', 'sf', 'third'])
        .eq('status', 'ft');
      if (error) throw error;
      return data || [];
    },

    async getGroupMatches() {
      const { data, error } = await sb.from('matches')
        .select('*')
        .eq('stage', 'group')
        .order('group_label', { ascending: true })
        .order('kickoff',     { ascending: true });
      if (error) throw error;
      return data;
    },

    // Fetches pre-computed FIFA standings and returns them parsed into our format:
    // { A: [{code, p, w, d, l, gf, ga, pts}, ...], B: [...], ... }
    // Returns {} before the tournament starts (API has no data yet).
    async getApiStandings() {
      const resp = await apiCall(`standings?league=${WC2026_LEAGUE}&season=${WC2026_SEASON}`);
      const json = await resp.json();
      if (json.errors && Object.keys(json.errors).length) {
        throw new Error(JSON.stringify(json.errors));
      }
      const apiResponse = json.response || [];
      const league = apiResponse[0]?.league;
      if (!league?.standings) return {};

      const result = {};
      league.standings.forEach(group => {
        if (!group.length) return;
        const m = (group[0].group || '').match(/Group\s+([A-L])\b/i);
        const letter = m ? m[1].toUpperCase() : null;
        if (!letter) return;
        result[letter] = group.map(entry => ({
          code: mapTeamCode(entry.team?.name || ''),
          p:    entry.all.played,
          w:    entry.all.win,
          d:    entry.all.draw,
          l:    entry.all.lose,
          gf:   entry.all.goals.for,
          ga:   entry.all.goals.against,
          pts:  entry.points,
        }));
      });
      return result;
    },

    // Syncs currently-live WC fixtures from the API and upserts to Supabase.
    // Uses status filter so only in-progress matches are returned.
    // Rate limit: 1 API call per invocation — poll at most every 2 minutes.
    async syncLive() {
      const resp = await apiCall(
        `fixtures?league=${WC2026_LEAGUE}&season=${WC2026_SEASON}&status=1H-HT-2H-ET-P-BT-LIVE`
      );
      if (!resp.ok) return [];
      const json = await resp.json();
      const fixtures = json.response || [];
      if (!fixtures.length) return [];
      const rows = fixtures.map(mapFixture);
      await sb.from('matches').upsert(rows, { onConflict: 'api_id' });
      return rows;
    },

    async isGroupStageDone() {
      const { count, error } = await sb.from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'group')
        .eq('status', 'ft');
      if (error) return false;
      return (count || 0) >= 72; // 12 groups × 6 matches
    },
  };

  // ── Admin helpers ─────────────────────────────────────────
  const Admin = {
    async isAdmin(userId) {
      const { data } = await sb.from('app_settings')
        .select('value').eq('key', 'admin_ids').single();
      if (!data) return false;
      return (data.value || []).includes(userId);
    },

    async addAdmin(userId) {
      const { data } = await sb.from('app_settings')
        .select('value').eq('key', 'admin_ids').single();
      const ids = data?.value || [];
      if (!ids.includes(userId)) ids.push(userId);
      await sb.from('app_settings').update({ value: ids }).eq('key', 'admin_ids');
    },

    async syncMatches() {
      const resp = await apiCall(`fixtures?league=${WC2026_LEAGUE}&season=${WC2026_SEASON}`);
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API ${resp.status}: ${body}`);
      }
      const json = await resp.json();
      if (json.errors && Object.keys(json.errors).length) {
        throw new Error(JSON.stringify(json.errors));
      }
      const fixtures = json.response || [];
      if (!fixtures.length) throw new Error('No fixtures returned — WC 2026 may not be in the API yet.');
      const rows = fixtures.map(mapFixture);
      const { error } = await sb.from('matches').upsert(rows, { onConflict: 'api_id' });
      if (error) throw error;
      return rows.length;
    },

    async setMatchScore(matchId, homeScore, awayScore, status) {
      const { error } = await sb.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status,
        synced_at: new Date().toISOString(),
      }).eq('id', matchId);
      if (error) throw error;
    },

    async lockBrackets(locked) {
      await sb.from('app_settings')
        .update({ value: locked }).eq('key', 'brackets_locked');
    },
  };

  // ── API-Football helpers ──────────────────────────────────
  // Direct API-Sports access (api-football.com) — uses x-apisports-key header.
  function apiCall(path) {
    return fetch(`https://v3.football.api-sports.io/${path}`, {
      headers: { 'x-apisports-key': RAPIDAPI_KEY },
    });
  }

  // All 48 WC 2026 teams. Includes alternate spellings API-Football may use.
  const NAME_TO_CODE = {
    // CONCACAF
    'Canada': 'CAN', 'Mexico': 'MEX', 'United States': 'USA',
    'Haiti': 'HAI', 'Panama': 'PAN', 'Curaçao': 'CUW', 'Curacao': 'CUW',
    // UEFA
    'France': 'FRA', 'England': 'ENG', 'Germany': 'GER', 'Spain': 'ESP',
    'Portugal': 'POR', 'Netherlands': 'NED', 'Belgium': 'BEL',
    'Croatia': 'CRO', 'Switzerland': 'SUI', 'Austria': 'AUT',
    'Scotland': 'SCO', 'Norway': 'NOR', 'Sweden': 'SWE',
    'Czech Republic': 'CZE', 'Czechia': 'CZE',
    'Bosnia and Herzegovina': 'BIH', 'Bosnia & Herzegovina': 'BIH',
    'Turkey': 'TUR', 'Türkiye': 'TUR',
    // CONMEBOL
    'Argentina': 'ARG', 'Brazil': 'BRA', 'Uruguay': 'URU',
    'Colombia': 'COL', 'Ecuador': 'ECU', 'Paraguay': 'PAR',
    // AFC
    'Japan': 'JPN', 'South Korea': 'KOR', 'Korea Republic': 'KOR',
    'Iran': 'IRN', 'Australia': 'AUS', 'Qatar': 'QAT',
    'Saudi Arabia': 'KSA', 'Uzbekistan': 'UZB', 'Iraq': 'IRQ', 'Jordan': 'JOR',
    // CAF
    'Morocco': 'MAR', 'Senegal': 'SEN', 'South Africa': 'RSA',
    "Ivory Coast": 'CIV', "Côte d'Ivoire": 'CIV', 'Cote d\'Ivoire': 'CIV',
    'Egypt': 'EGY', 'Algeria': 'ALG', 'Tunisia': 'TUN', 'Ghana': 'GHA',
    'Cape Verde': 'CPV', 'Cabo Verde': 'CPV',
    'DR Congo': 'COD', 'Congo DR': 'COD', 'Democratic Republic of the Congo': 'COD',
    // OFC
    'New Zealand': 'NZL',
    // Non-WC teams kept for completeness
    'Italy': 'ITA', 'Denmark': 'DEN', 'Poland': 'POL', 'Ukraine': 'UKR',
    'Serbia': 'SRB', 'Chile': 'CHI', 'Nigeria': 'NGA', 'Cameroon': 'CMR',
    'Costa Rica': 'CRC',
  };

  function mapTeamCode(name) {
    return NAME_TO_CODE[name] || name.slice(0, 3).toUpperCase();
  }

  // WC 2026 team → group letter, built from the official draw in data.js.
  // Used by mapFixture() because the API round string is matchday-based
  // ("Group Stage - 1") not group-based ("Group A").
  const TEAM_TO_GROUP = {};
  (window.WC_DATA?.buildSeededGroups() || []).forEach(g => {
    g.teams.forEach(code => { TEAM_TO_GROUP[code] = g.letter; });
  });

  function mapStage(round) {
    if (!round) return 'group';
    const r = round.toLowerCase();
    if (r.includes('group'))           return 'group';
    if (r.includes('32'))              return 'r32';
    if (r.includes('16'))              return 'r16';
    if (r.includes('quarter'))         return 'qf';
    if (r.includes('semi'))            return 'sf';
    if (r.includes('3rd') || r.includes('third') || r.includes('place')) return 'third';
    if (r.includes('final'))           return 'final';
    return 'group';
  }

  function mapStatus(short) {
    const map = {
      // Finished
      'FT': 'ft', 'AET': 'ft', 'PEN': 'ft',
      // Live
      '1H': 'live', '2H': 'live', 'ET': 'live', 'P': 'live', 'INT': 'live', 'LIVE': 'live',
      // Paused
      'HT': 'ht', 'BT': 'ht',
      // Not started / deferred
      'NS': 'upcoming', 'TBD': 'upcoming', 'PST': 'upcoming',
      'SUSP': 'upcoming', 'ABD': 'upcoming', 'CANC': 'upcoming',
    };
    return map[short] || 'upcoming';
  }

  // Maps a single API-Football fixture object to our DB schema.
  // Group label is derived from the home team's draw assignment because the
  // API round string is matchday-based ("Group Stage - 1"), not group-based.
  function mapFixture(f) {
    const homeCode = mapTeamCode(f.teams.home.name);
    const stage    = mapStage(f.league.round);
    const groupLabel = stage === 'group'
      ? (TEAM_TO_GROUP[homeCode] || '')
      : f.league.round;
    return {
      api_id:      f.fixture.id,
      kickoff:     f.fixture.date,
      home_code:   homeCode,
      away_code:   mapTeamCode(f.teams.away.name),
      home_name:   f.teams.home.name,
      away_name:   f.teams.away.name,
      group_label: groupLabel,
      stage,
      venue:       f.fixture.venue?.name || '',
      status:      mapStatus(f.fixture.status.short),
      minute:      f.fixture.status.elapsed,
      home_score:  f.goals.home,
      away_score:  f.goals.away,
      highlights:  [],
      synced_at:   new Date().toISOString(),
    };
  }

  // ── Expose globally ───────────────────────────────────────
  window.SB = { sb, Auth, Profiles, Brackets, Pools, Matches, Admin };
})();
