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

    async create(userId, name, groups) {
      const { data, error } = await sb.from('brackets').insert({
        user_id: userId,
        name,
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

    async getByUserInPool(userId, poolId) {
      const { data, error } = await sb.from('brackets')
        .select('groups, knockout')
        .eq('user_id', userId)
        .eq('submitted_to', poolId)
        .single();
      if (error) throw error;
      return data;
    },

    async getAllForPool(poolId) {
      const { data, error } = await sb.from('brackets')
        .select('user_id, knockout')
        .eq('submitted_to', poolId);
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
      // Returns all group stage matches ordered for standings computation.
      // Future: replace body with a direct football-api standings endpoint call.
      const { data, error } = await sb.from('matches')
        .select('*')
        .eq('stage', 'group')
        .order('group_label', { ascending: true })
        .order('kickoff',     { ascending: true });
      if (error) throw error;
      return data;
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
      // Fetch from API-Football via a CORS-friendly proxy approach.
      // We fetch fixtures for the WC 2026 league.
      const url = `https://v3.football.api-sports.io/fixtures?league=${WC2026_LEAGUE}&season=${WC2026_SEASON}`;
      const resp = await fetch(url, {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const json = await resp.json();
      const fixtures = json.response || [];

      if (!fixtures.length) throw new Error('No fixtures returned. The 2026 WC may not be in API yet.');

      // Map to our schema
      const rows = fixtures.map(f => ({
        api_id:      f.fixture.id,
        kickoff:     f.fixture.date,
        home_code:   mapTeamCode(f.teams.home.name),
        away_code:   mapTeamCode(f.teams.away.name),
        home_name:   f.teams.home.name,
        away_name:   f.teams.away.name,
        group_label: f.league.round,
        stage:       mapStage(f.league.round),
        venue:       f.fixture.venue?.name || '',
        status:      mapStatus(f.fixture.status.short),
        minute:      f.fixture.status.elapsed,
        home_score:  f.goals.home,
        away_score:  f.goals.away,
        highlights:  [],
        synced_at:   new Date().toISOString(),
      }));

      // Upsert by api_id
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

  // ── Mapping helpers ───────────────────────────────────────
  // API-Football uses full names; map to our 3-letter codes.
  const NAME_TO_CODE = {
    'Canada': 'CAN', 'Mexico': 'MEX', 'United States': 'USA', 'England': 'ENG',
    'France': 'FRA', 'Germany': 'GER', 'Spain': 'ESP', 'Portugal': 'POR',
    'Netherlands': 'NED', 'Belgium': 'BEL', 'Argentina': 'ARG', 'Brazil': 'BRA',
    'Italy': 'ITA', 'Croatia': 'CRO', 'Denmark': 'DEN', 'Switzerland': 'SUI',
    'Uruguay': 'URU', 'Colombia': 'COL', 'Japan': 'JPN', 'South Korea': 'KOR',
    'Iran': 'IRN', 'Australia': 'AUS', 'Senegal': 'SEN', 'Morocco': 'MAR',
    'Poland': 'POL', 'Austria': 'AUT', 'Ukraine': 'UKR', 'Serbia': 'SRB',
    'Ecuador': 'ECU', 'Paraguay': 'PAR', 'Chile': 'CHI', 'Saudi Arabia': 'KSA',
    'Uzbekistan': 'UZB', 'Egypt': 'EGY', 'Algeria': 'ALG', 'Nigeria': 'NGA',
    'Scotland': 'SCO', 'Norway': 'NOR', 'Sweden': 'SWE', 'Qatar': 'QAT',
    'Tunisia': 'TUN', 'Ghana': 'GHA', "Ivory Coast": 'CIV', "Côte d'Ivoire": 'CIV',
    'Cameroon': 'CMR', 'South Africa': 'RSA', 'New Zealand': 'NZL',
    'Costa Rica': 'CRC', 'Panama': 'PAN',
  };

  function mapTeamCode(name) {
    return NAME_TO_CODE[name] || name.slice(0, 3).toUpperCase();
  }

  function mapStage(round) {
    if (!round) return 'group';
    const r = round.toLowerCase();
    if (r.includes('group'))      return 'group';
    if (r.includes('32') || r.includes('round of 32')) return 'r32';
    if (r.includes('16') || r.includes('round of 16')) return 'r16';
    if (r.includes('quarter'))    return 'qf';
    if (r.includes('semi'))       return 'sf';
    if (r.includes('3rd') || r.includes('third')) return 'third';
    if (r.includes('final'))      return 'final';
    return 'group';
  }

  function mapStatus(short) {
    const map = { 'FT': 'ft', 'AET': 'ft', 'PEN': 'ft', '1H': 'live', '2H': 'live',
                  'HT': 'ht', 'LIVE': 'live', 'NS': 'upcoming', 'TBD': 'upcoming' };
    return map[short] || 'upcoming';
  }

  // ── Expose globally ───────────────────────────────────────
  window.SB = { sb, Auth, Profiles, Brackets, Pools, Matches, Admin };
})();
