// schedule.jsx — Reads real match data from Supabase, falls back to mock if empty.

function Schedule({ nav }) {
  const [dayKey, setDayKey]     = useState('today');
  const [tick, setTick]         = useState(0);
  const [dbMatches, setDbMatches] = useState(null); // null = loading
  const [error, setError]       = useState('');

  // Tick for live match minutes
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 8000);
    return () => clearInterval(i);
  }, []);

  // Load from Supabase
  useEffect(() => {
    loadDay(dayKey);
  }, [dayKey]);

  const loadDay = async (key) => {
    setDbMatches(null);
    setError('');
    try {
      const data = await window.SB.Matches.getByDay(key);
      setDbMatches(data);
    } catch (e) {
      setError(e.message);
      setDbMatches([]);
    }
  };

  // Fall back to mock data if DB is empty (pre-tournament)
  const useMock = dbMatches !== null && dbMatches.length === 0;
  const day = useMock ? MOCK_SCHEDULE[dayKey] : null;

  const matches = useMock
    ? (day?.matches || [])
    : (dbMatches || []).map(dbToMatch);

  const buckets = useMemo(() => ({
    live:      matches.filter(m => m.status === 'live' || m.status === 'ht'),
    upcoming:  matches.filter(m => m.status === 'upcoming'),
    completed: matches.filter(m => m.status === 'ft'),
  }), [matches]);

  const dayLabel = { yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow' }[dayKey];

  if (dbMatches === null) {
    return (
      <div className="main fade-in">
        <div className="muted mono" style={{ padding: 40, textAlign: 'center', fontSize: 12 }}>
          Loading schedule…
        </div>
      </div>
    );
  }

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Match Schedule</div>
          <h1 className="page-title">{dayLabel}'s matches</h1>
          <div className="subtitle">
            {useMock
              ? 'Showing preview data — admin will sync real scores when the tournament begins.'
              : 'Live scores sync hourly or when admin triggers a manual update.'}
          </div>
        </div>
        <div className="row">
          {useMock && (
            <span className="tag muted">Preview data</span>
          )}
          <div className="day-toggle">
            {['yesterday','today','tomorrow'].map(k => (
              <button key={k} className={dayKey === k ? 'active' : ''} onClick={() => setDayKey(k)}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
          Could not load schedule: {error}
        </div>
      )}

      <div className="sched-summary">
        <SchedKpi k="Matches"   v={matches.length} />
        <SchedKpi k="Live now"  v={buckets.live.length} accent={buckets.live.length > 0} />
        <SchedKpi k="Completed" v={buckets.completed.length} />
        <SchedKpi k="Upcoming"  v={buckets.upcoming.length} />
      </div>

      {buckets.live.length > 0 && (
        <>
          <div className="sched-section-head">
            <span className="live-dot" />
            <h2>Live</h2>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {buckets.live.length} match{buckets.live.length === 1 ? '' : 'es'} in play
            </span>
          </div>
          <div className="match-list">
            {buckets.live.map(m => <MatchRow key={m.id} m={m} variant="live" tick={tick} />)}
          </div>
        </>
      )}

      {buckets.upcoming.length > 0 && (
        <>
          <div className="sched-section-head">
            <h2>Upcoming</h2>
            <span className="muted mono" style={{ fontSize: 11 }}>
              Next kickoff {buckets.upcoming[0]?.kickoff}
            </span>
          </div>
          <div className="match-list">
            {buckets.upcoming.map(m => <MatchRow key={m.id} m={m} variant="upcoming" />)}
          </div>
        </>
      )}

      {buckets.completed.length > 0 && (
        <>
          <div className="sched-section-head">
            <h2>Full time</h2>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {buckets.completed.length} result{buckets.completed.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="match-list">
            {buckets.completed.map(m => <MatchRow key={m.id} m={m} variant="ft" />)}
          </div>
        </>
      )}

      {matches.length === 0 && !error && (
        <div className="card padded" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No matches scheduled</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Check back once the admin syncs the fixture list.
          </div>
        </div>
      )}
    </div>
  );
}

// Convert DB row → component shape
function dbToMatch(m) {
  const kickoffDate = m.kickoff ? new Date(m.kickoff) : null;
  const kickoffTime = kickoffDate
    ? kickoffDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  return {
    id:         m.id,
    kickoff:    kickoffTime,
    home:       m.home_code,
    away:       m.away_code,
    group:      m.group_label || '',
    venue:      m.venue || '',
    status:     m.status,
    homeScore:  m.home_score,
    awayScore:  m.away_score,
    minute:     m.minute,
    highlights: m.highlights || [],
  };
}

function SchedKpi({ k, v, accent }) {
  return (
    <div className={`sched-kpi ${accent ? 'accent' : ''}`}>
      <div className="k">{k}</div>
      <div className="v num">{v}</div>
    </div>
  );
}

function MatchRow({ m, variant, tick = 0 }) {
  const byCode = window.WC_DATA.byCode;
  const home = byCode[m.home];
  const away = byCode[m.away];
  const [open, setOpen] = useState(false);

  const liveMinute = useMemo(() => {
    if (variant !== 'live') return null;
    const extra = Math.floor(tick / 2);
    const total = (m.minute || 0) + extra;
    if (total >= 90) return `90+${Math.min(total - 90, 5)}`;
    return total;
  }, [variant, m.minute, tick]);

  const homeGoals = (m.highlights || []).filter(h => h.kind === 'goal' && h.team === m.home);
  const awayGoals = (m.highlights || []).filter(h => h.kind === 'goal' && h.team === m.away);

  // Handle unknown teams gracefully
  const homeName = home?.name || m.home || '?';
  const awayName = away?.name || m.away || '?';

  return (
    <div className={`match-row v-${variant} ${open ? 'open' : ''}`}>
      <button className="mr-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="mr-status">
          {variant === 'live' && m.status !== 'ht' && (
            <>
              <span className="live-dot sm" />
              <span className="mono live-minute">{liveMinute}'</span>
            </>
          )}
          {m.status === 'ht' && <span className="mono status-pill ht">HT</span>}
          {variant === 'ft'  && m.status !== 'ht' && <span className="mono status-pill">FT</span>}
          {variant === 'upcoming' && <span className="mono kickoff">{m.kickoff}</span>}
        </div>

        <div className="mr-team home">
          <span className="t-name">{homeName}</span>
          <Flag team={home} w={22} h={14} />
        </div>

        <div className="mr-score">
          {variant === 'upcoming' ? (
            <span className="vs muted">vs</span>
          ) : (
            <>
              <span className={`num sc ${m.homeScore > m.awayScore ? 'win' : (m.homeScore < m.awayScore ? 'lose' : '')}`}>
                {m.homeScore ?? '—'}
              </span>
              <span className="dash">—</span>
              <span className={`num sc ${m.awayScore > m.homeScore ? 'win' : (m.awayScore < m.homeScore ? 'lose' : '')}`}>
                {m.awayScore ?? '—'}
              </span>
            </>
          )}
        </div>

        <div className="mr-team away">
          <Flag team={away} w={22} h={14} />
          <span className="t-name">{awayName}</span>
        </div>

        <div className="mr-meta">
          <span className="tag muted">Group {m.group}</span>
          <span className="mr-venue">{m.venue}</span>
        </div>

        <span className={`mr-caret ${open ? 'flip' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="mr-detail">
          {variant === 'upcoming' ? (
            <div className="mr-preview">
              <div className="mr-preview-row">
                <span className="lbl">Kickoff</span>
                <span className="val mono">{m.kickoff} local</span>
              </div>
              <div className="mr-preview-row">
                <span className="lbl">Venue</span>
                <span className="val">{m.venue}</span>
              </div>
              <div className="mr-preview-row">
                <span className="lbl">Stage</span>
                <span className="val">Group {m.group}</span>
              </div>
            </div>
          ) : (
            <div className="mr-events">
              <div className="mr-events-col left">
                {homeGoals.map((g, i) => (
                  <div key={i} className="ev">
                    <span className="ev-min mono">{g.minute}'</span>
                    <span className="ev-icon">⚽</span>
                    <span className="ev-who">{g.who}</span>
                  </div>
                ))}
              </div>
              <div className="mr-events-divider" />
              <div className="mr-events-col right">
                {awayGoals.map((g, i) => (
                  <div key={i} className="ev">
                    <span className="ev-who">{g.who}</span>
                    <span className="ev-icon">⚽</span>
                    <span className="ev-min mono">{g.minute}'</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mock fallback data (shown before tournament starts) ──
const MOCK_SCHEDULE = {
  yesterday: {
    matches: [
      { id: 'y1', kickoff: '12:00', home: 'GER', away: 'POL', group: 'F', venue: 'AT&T Stadium, Dallas', status: 'ft', homeScore: 2, awayScore: 1, highlights: [{ minute: 14, kind: 'goal', team: 'GER', who: 'Wirtz' }, { minute: 51, kind: 'goal', team: 'POL', who: 'Lewandowski' }, { minute: 78, kind: 'goal', team: 'GER', who: 'Musiala' }] },
      { id: 'y2', kickoff: '18:00', home: 'BRA', away: 'SUI', group: 'D', venue: 'SoFi Stadium, Los Angeles', status: 'ft', homeScore: 1, awayScore: 1, highlights: [{ minute: 33, kind: 'goal', team: 'SUI', who: 'Embolo' }, { minute: 89, kind: 'goal', team: 'BRA', who: 'Vinícius Jr.' }] },
    ],
  },
  today: {
    matches: [
      { id: 't1', kickoff: '12:00', home: 'ENG', away: 'DEN', group: 'A', venue: 'MetLife Stadium, New Jersey', status: 'ft', homeScore: 1, awayScore: 0, highlights: [{ minute: 27, kind: 'goal', team: 'ENG', who: 'Bellingham' }] },
      { id: 't2', kickoff: '15:00', home: 'FRA', away: 'AUS', group: 'B', venue: 'Lumen Field, Seattle', status: 'live', homeScore: 2, awayScore: 0, minute: 67, highlights: [{ minute: 12, kind: 'goal', team: 'FRA', who: 'Mbappé' }, { minute: 58, kind: 'goal', team: 'FRA', who: 'Mbappé' }] },
      { id: 't3', kickoff: '21:00', home: 'USA', away: 'COL', group: 'C', venue: 'Arrowhead Stadium, Kansas City', status: 'upcoming', homeScore: null, awayScore: null, highlights: [] },
    ],
  },
  tomorrow: {
    matches: [
      { id: 'm1', kickoff: '15:00', home: 'ESP', away: 'CRO', group: 'G', venue: 'Hard Rock Stadium, Miami', status: 'upcoming', homeScore: null, awayScore: null, highlights: [] },
      { id: 'm2', kickoff: '21:00', home: 'MEX', away: 'SEN', group: 'B', venue: 'Estadio Azteca, Mexico City', status: 'upcoming', homeScore: null, awayScore: null, highlights: [] },
    ],
  },
};

Object.assign(window, { Schedule });
