// schedule.jsx — Today view + full Calendar view

function Schedule({ nav }) {
  const [tab, setTab]         = useState('today');
  const [tick, setTick]       = useState(0);
  const [todayData, setTodayData] = useState(null); // null = loading
  const [allData, setAllData] = useState(null);     // null = not yet fetched
  const [error, setError]     = useState('');

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 8000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (tab === 'today' && todayData === null) loadToday();
    if (tab === 'calendar' && allData === null) loadAll();
  }, [tab]);

  // Live scores are pushed to Supabase every 15 min by the Netlify scheduled
  // function (netlify/functions/sync-live.js). Poll Supabase — not the API —
  // to pick up those updates without burning API quota.
  useEffect(() => {
    if (tab !== 'today' || !todayData) return;
    const hasLive = todayData.some(m => m.status === 'live' || m.status === 'ht');
    if (!hasLive) return;

    const refresh = async () => {
      try {
        const fresh = await window.SB.Matches.getByDay('today');
        if (fresh?.length) setTodayData(fresh);
      } catch { /* silent */ }
    };

    const interval = setInterval(refresh, 60000); // re-read Supabase every 60s (free)
    return () => clearInterval(interval);
  }, [tab, todayData]);

  const loadToday = async () => {
    setError('');
    try {
      const data = await window.SB.Matches.getByDay('today');
      setTodayData(data);
    } catch (e) {
      setError(e.message);
      setTodayData([]);
    }
  };

  const loadAll = async () => {
    setError('');
    try {
      const data = await window.SB.Matches.getAll();
      setAllData(data);
    } catch (e) {
      setError(e.message);
      setAllData([]);
    }
  };

  // Resolve today matches (fall back to mock if DB empty)
  const useMockToday = todayData !== null && todayData.length === 0;
  const todayMatches = useMockToday
    ? MOCK_SCHEDULE.today.matches
    : (todayData || []).map(dbToMatch);

  // Resolve calendar matches (fall back to mock if DB empty)
  const useMockAll = allData !== null && allData.length === 0;
  const calMatches = useMockAll
    ? MOCK_CALENDAR
    : (allData || []).map(dbToCalMatch);

  const buckets = useMemo(() => ({
    live:      todayMatches.filter(m => m.status === 'live' || m.status === 'ht'),
    upcoming:  todayMatches.filter(m => m.status === 'upcoming'),
    completed: todayMatches.filter(m => m.status === 'ft'),
  }), [todayMatches]);

  const loading = (tab === 'today' && todayData === null) ||
                  (tab === 'calendar' && allData === null);

  if (loading) {
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
          <h1 className="page-title">{tab === 'today' ? "Today's matches" : "Tournament Calendar"}</h1>
          {tab === 'today' && (
            <div className="subtitle">
              {useMockToday
                ? 'Showing preview data — admin will sync real scores when the tournament begins.'
                : 'Live scores sync hourly or when admin triggers a manual update.'}
            </div>
          )}
        </div>
        <div className="row">
          {tab === 'today' && useMockToday && <span className="tag muted">Preview data</span>}
          <div className="day-toggle">
            <button className={tab === 'today'    ? 'active' : ''} onClick={() => setTab('today')}>Today</button>
            <button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}>Calendar</button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
          Could not load schedule: {error}
        </div>
      )}

      {tab === 'today' && (
        <>
          <div className="sched-summary">
            <SchedKpi k="Matches"   v={todayMatches.length} />
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

          {todayMatches.length === 0 && !error && (
            <div className="card padded" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No matches today</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Check back once the admin syncs the fixture list.
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'calendar' && (
        <CalendarView matches={calMatches} />
      )}
    </div>
  );
}

// ── Calendar components ───────────────────────────────────────

const TOURNAMENT_START = '2026-06-11';
const TOURNAMENT_END   = '2026-07-19';

const FILTER_OPTIONS = [
  { key: 'all',      label: 'All' },
  { key: 'group',    label: 'Group Stage' },
  { key: 'knockout', label: 'Knockout' },
];
const KNOCKOUT_STAGES = new Set(['r32', 'r16', 'qf', 'sf', 'third', 'final']);

function CalendarView({ matches }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all')      return matches;
    if (filter === 'group')    return matches.filter(m => m.stage === 'group');
    if (filter === 'knockout') return matches.filter(m => KNOCKOUT_STAGES.has(m.stage));
    return matches;
  }, [matches, filter]);

  const byDate = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });
    return map;
  }, [filtered]);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: CDT });
  const inTournament = todayStr >= TOURNAMENT_START && todayStr <= TOURNAMENT_END;

  const scrollToToday = () => {
    document.querySelector('.cal-cell.is-today')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <div className="cal-toolbar">
        <div className="cal-filter">
          {FILTER_OPTIONS.map(o => (
            <button
              key={o.key}
              className={`cal-filter-btn${filter === o.key ? ' active' : ''}`}
              onClick={() => setFilter(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {inTournament && (
          <button className="cal-today-btn" onClick={scrollToToday}>Jump to today</button>
        )}
      </div>
      <div className="cal-wrap">
        <CalMonth year={2026} month={5} byDate={byDate} />
        <CalMonth year={2026} month={6} byDate={byDate} />
      </div>
    </>
  );
}

const CHIP_LIMIT = 2;

const STAGE_LABELS = {
  group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-final', sf: 'Semi-final', third: '3rd Place', final: 'Final',
};

function CalMonth({ year, month, byDate }) {
  const monthName   = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' });
  const firstDow    = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = new Date().toLocaleDateString('en-CA', { timeZone: CDT });
  const [expanded, setExpanded] = useState(new Set());
  const [openChip, setOpenChip] = useState(null);
  const byCode = window.WC_DATA?.byCode || {};

  const toggleDay = (dateStr) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
    return next;
  });

  const toggleChip = (id) => setOpenChip(prev => prev === id ? null : id);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="cal-month">
      <div className="cal-month-label">{monthName} {year}</div>
      <div className="cal-grid">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cal-cell empty" />;
          const mm         = String(month + 1).padStart(2, '0');
          const dd         = String(d).padStart(2, '0');
          const dateStr    = `${year}-${mm}-${dd}`;
          const games      = byDate[dateStr] || [];
          const isToday    = dateStr === todayStr;
          const isExpanded = expanded.has(dateStr);
          const visible    = isExpanded ? games : games.slice(0, CHIP_LIMIT);
          const overflow   = games.length - CHIP_LIMIT;
          return (
            <div key={d} className={`cal-cell${games.length ? ' has-matches' : ''}${isToday ? ' is-today' : ''}`}>
              <div className="cal-day-num">{d}</div>
              {visible.map(m => {
                const isOpen   = openChip === m.id;
                const homeName = byCode[m.home]?.name || m.home;
                const awayName = byCode[m.away]?.name || m.away;
                const stageLabel = m.stage === 'group'
                  ? `Group ${m.group}`
                  : (STAGE_LABELS[m.stage] || m.stage);
                return (
                  <div key={m.id}>
                    <button
                      className={`cal-chip cal-chip--${m.stage || 'group'}${isOpen ? ' open' : ''}`}
                      onClick={() => toggleChip(m.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="cal-chip-time mono">{m.kickoff}</span>
                      <span className="cal-chip-teams">{m.home} <span className="cal-v">v</span> {m.away}</span>
                    </button>
                    {isOpen && (
                      <div className="cal-chip-detail">
                        <div className="cal-chip-detail-teams">{homeName} <span className="cal-v">v</span> {awayName}</div>
                        <div className="cal-chip-detail-row">{m.kickoff} CT · {stageLabel}</div>
                        <div className="cal-chip-detail-row">{m.venue}</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {overflow > 0 && (
                <button className="cal-more" onClick={() => toggleDay(dateStr)}>
                  {isExpanded ? 'show less' : `+${overflow} more`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────

const CDT = 'America/Chicago';

function dbToMatch(m) {
  const kickoffDate = m.kickoff ? new Date(m.kickoff) : null;
  const kickoffTime = kickoffDate
    ? kickoffDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CDT })
    : '';
  return {
    id:         m.id,
    kickoff:    kickoffTime,
    home:       m.home_code,
    away:       m.away_code,
    group:      m.group_label || '',
    stage:      m.stage || '',
    venue:      m.venue || '',
    status:     m.status,
    homeScore:  m.home_score,
    awayScore:  m.away_score,
    minute:     m.minute,
    highlights: m.highlights || [],
  };
}

function dbToCalMatch(m) {
  const kickoffDate = m.kickoff ? new Date(m.kickoff) : null;
  return {
    ...dbToMatch(m),
    date: kickoffDate ? kickoffDate.toLocaleDateString('en-CA', { timeZone: CDT }) : '',
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
                <span className="val mono">{m.kickoff} CT</span>
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

// ── Mock data ─────────────────────────────────────────────────

const MOCK_SCHEDULE = {
  today: {
    matches: [
      { id: 't1', kickoff: '12:00', home: 'ENG', away: 'DEN', group: 'A', venue: 'MetLife Stadium, New Jersey', status: 'ft',       homeScore: 1, awayScore: 0, highlights: [{ minute: 27, kind: 'goal', team: 'ENG', who: 'Bellingham' }] },
      { id: 't2', kickoff: '15:00', home: 'FRA', away: 'AUS', group: 'B', venue: 'Lumen Field, Seattle',        status: 'live',     homeScore: 2, awayScore: 0, minute: 67, highlights: [{ minute: 12, kind: 'goal', team: 'FRA', who: 'Mbappé' }, { minute: 58, kind: 'goal', team: 'FRA', who: 'Mbappé' }] },
      { id: 't3', kickoff: '21:00', home: 'USA', away: 'COL', group: 'C', venue: 'Arrowhead Stadium, Kansas City', status: 'upcoming', homeScore: null, awayScore: null, highlights: [] },
    ],
  },
};

// Calendar mock — shown before tournament data is synced
const _m = (id, date, time, home, away, grp, venue) => ({
  id, date, kickoff: time, home, away, group: grp, venue,
  status: 'upcoming', homeScore: null, awayScore: null, highlights: [],
});

const MOCK_CALENDAR = [
  // ── June 11 — Opening day ────────────────────────────────────
  _m('c01','2026-06-11','17:00','MEX','USA','A','Estadio Azteca, Mexico City'),
  _m('c02','2026-06-11','20:00','CAN','ARG','B','MetLife Stadium, New Jersey'),
  // ── June 12 ─────────────────────────────────────────────────
  _m('c03','2026-06-12','12:00','GER','POL','C','AT&T Stadium, Dallas'),
  _m('c04','2026-06-12','15:00','FRA','AUS','D','Lumen Field, Seattle'),
  _m('c05','2026-06-12','21:00','BRA','SUI','E','Hard Rock Stadium, Miami'),
  // ── June 13 ─────────────────────────────────────────────────
  _m('c06','2026-06-13','12:00','ENG','DEN','A','Lincoln Financial Field, Philadelphia'),
  _m('c07','2026-06-13','15:00','ESP','CRO','F','SoFi Stadium, Los Angeles'),
  _m('c08','2026-06-13','18:00','NED','SEN','G','NRG Stadium, Houston'),
  _m('c09','2026-06-13','21:00','POR','JPN','H','BC Place, Vancouver'),
  // ── June 14 ─────────────────────────────────────────────────
  _m('c10','2026-06-14','12:00','ARG','URU','B','MetLife Stadium, New Jersey'),
  _m('c11','2026-06-14','15:00','MEX','COL','A','Estadio Azteca, Mexico City'),
  _m('c12','2026-06-14','18:00','GER','NED','C','AT&T Stadium, Dallas'),
  _m('c13','2026-06-14','21:00','FRA','ITA','D','Lumen Field, Seattle'),
  // ── June 15 ─────────────────────────────────────────────────
  _m('c14','2026-06-15','15:00','BRA','ENG','E','Hard Rock Stadium, Miami'),
  _m('c15','2026-06-15','18:00','ESP','MAR','F','SoFi Stadium, Los Angeles'),
  _m('c16','2026-06-15','21:00','USA','SEN','A','Arrowhead Stadium, Kansas City'),
  // ── June 16 ─────────────────────────────────────────────────
  _m('c17','2026-06-16','12:00','CAN','POL','B','BMO Field, Toronto'),
  _m('c18','2026-06-16','18:00','POR','TUR','H','BC Place, Vancouver'),
  _m('c19','2026-06-16','21:00','DEN','CRO','A','Lincoln Financial Field, Philadelphia'),
  // ── June 17 ─────────────────────────────────────────────────
  _m('c20','2026-06-17','12:00','ITA','JPN','D','NRG Stadium, Houston'),
  _m('c21','2026-06-17','15:00','ARG','MEX','B','Estadio Azteca, Mexico City'),
  _m('c22','2026-06-17','18:00','GER','AUS','C','AT&T Stadium, Dallas'),
  _m('c23','2026-06-17','21:00','BRA','ESP','E','Hard Rock Stadium, Miami'),
  // ── June 18 ─────────────────────────────────────────────────
  _m('c24','2026-06-18','15:00','ENG','SUI','A','MetLife Stadium, New Jersey'),
  _m('c25','2026-06-18','18:00','NED','POR','G','SoFi Stadium, Los Angeles'),
  _m('c26','2026-06-18','21:00','FRA','MAR','D','Lumen Field, Seattle'),
  // ── June 19 ─────────────────────────────────────────────────
  _m('c27','2026-06-19','15:00','USA','COL','A','Arrowhead Stadium, Kansas City'),
  _m('c28','2026-06-19','18:00','TUR','JPN','H','BC Place, Vancouver'),
  _m('c29','2026-06-19','21:00','CRO','SEN','F','NRG Stadium, Houston'),
  // ── June 20 ─────────────────────────────────────────────────
  _m('c30','2026-06-20','12:00','POL','URU','C','BMO Field, Toronto'),
  _m('c31','2026-06-20','15:00','GER','ITA','C','AT&T Stadium, Dallas'),
  _m('c32','2026-06-20','18:00','BRA','DEN','E','Hard Rock Stadium, Miami'),
  _m('c33','2026-06-20','21:00','ESP','ENG','F','SoFi Stadium, Los Angeles'),
  // ── June 21 ─────────────────────────────────────────────────
  _m('c34','2026-06-21','12:00','ARG','CAN','B','MetLife Stadium, New Jersey'),
  _m('c35','2026-06-21','15:00','MEX','SEN','A','Estadio Azteca, Mexico City'),
  _m('c36','2026-06-21','18:00','POR','MAR','H','BC Place, Vancouver'),
  _m('c37','2026-06-21','21:00','NED','TUR','G','NRG Stadium, Houston'),
  // ── June 22 ─────────────────────────────────────────────────
  _m('c38','2026-06-22','18:00','USA','MEX','A','Arrowhead Stadium, Kansas City'),
  _m('c39','2026-06-22','18:00','CAN','ARG','B','BMO Field, Toronto'),
  // ── June 23 ─────────────────────────────────────────────────
  _m('c40','2026-06-23','18:00','GER','FRA','C','AT&T Stadium, Dallas'),
  _m('c41','2026-06-23','18:00','ITA','AUS','D','Lumen Field, Seattle'),
  // ── June 24 ─────────────────────────────────────────────────
  _m('c42','2026-06-24','18:00','BRA','SUI','E','Hard Rock Stadium, Miami'),
  _m('c43','2026-06-24','18:00','ESP','CRO','F','SoFi Stadium, Los Angeles'),
  // ── June 25 ─────────────────────────────────────────────────
  _m('c44','2026-06-25','18:00','NED','SEN','G','NRG Stadium, Houston'),
  _m('c45','2026-06-25','18:00','POR','JPN','H','BC Place, Vancouver'),
  // ── June 26 ─────────────────────────────────────────────────
  _m('c46','2026-06-26','18:00','ENG','DEN','A','MetLife Stadium, New Jersey'),
  _m('c47','2026-06-26','18:00','URU','COL','C','AT&T Stadium, Dallas'),
  // ── June 27 ─────────────────────────────────────────────────
  _m('c48','2026-06-27','18:00','FRA','ITA','D','Lumen Field, Seattle'),
  _m('c49','2026-06-27','18:00','AUS','GER','C','NRG Stadium, Houston'),
  // ── June 28-30 — Final group stage matchdays ─────────────────
  _m('c50','2026-06-28','18:00','BRA','ENG','E','Hard Rock Stadium, Miami'),
  _m('c51','2026-06-28','18:00','SUI','ESP','F','SoFi Stadium, Los Angeles'),
  _m('c52','2026-06-29','18:00','MAR','NED','G','BC Place, Vancouver'),
  _m('c53','2026-06-29','18:00','JPN','TUR','H','BMO Field, Toronto'),
  _m('c54','2026-06-30','18:00','ARG','MEX','B','Estadio Azteca, Mexico City'),
  _m('c55','2026-06-30','18:00','CAN','USA','A','Arrowhead Stadium, Kansas City'),
  // ── July — Knockout stage ────────────────────────────────────
  _m('k01','2026-07-01','18:00','1A','2B','R32','MetLife Stadium, New Jersey'),
  _m('k02','2026-07-01','21:00','1C','2D','R32','AT&T Stadium, Dallas'),
  _m('k03','2026-07-02','18:00','1E','2F','R32','Hard Rock Stadium, Miami'),
  _m('k04','2026-07-02','21:00','1G','2H','R32','SoFi Stadium, Los Angeles'),
  _m('k05','2026-07-03','18:00','1B','2A','R32','BMO Field, Toronto'),
  _m('k06','2026-07-03','21:00','1D','2C','R32','Lumen Field, Seattle'),
  _m('k07','2026-07-04','18:00','1F','2E','R32','NRG Stadium, Houston'),
  _m('k08','2026-07-04','21:00','1H','2G','R32','BC Place, Vancouver'),
  _m('k09','2026-07-06','18:00','W1','W2','R16','MetLife Stadium, New Jersey'),
  _m('k10','2026-07-06','21:00','W3','W4','R16','AT&T Stadium, Dallas'),
  _m('k11','2026-07-07','18:00','W5','W6','R16','Hard Rock Stadium, Miami'),
  _m('k12','2026-07-07','21:00','W7','W8','R16','SoFi Stadium, Los Angeles'),
  _m('k13','2026-07-08','18:00','W9','W10','R16','Lumen Field, Seattle'),
  _m('k14','2026-07-08','21:00','W11','W12','R16','NRG Stadium, Houston'),
  _m('k15','2026-07-09','18:00','W13','W14','R16','BC Place, Vancouver'),
  _m('k16','2026-07-09','21:00','W15','W16','R16','BMO Field, Toronto'),
  _m('k17','2026-07-12','18:00','QF1','QF2','QF','MetLife Stadium, New Jersey'),
  _m('k18','2026-07-12','21:00','QF3','QF4','QF','AT&T Stadium, Dallas'),
  _m('k19','2026-07-13','18:00','QF5','QF6','QF','Hard Rock Stadium, Miami'),
  _m('k20','2026-07-13','21:00','QF7','QF8','QF','SoFi Stadium, Los Angeles'),
  _m('k21','2026-07-16','21:00','SF1','SF2','SF','MetLife Stadium, New Jersey'),
  _m('k22','2026-07-17','21:00','SF3','SF4','SF','AT&T Stadium, Dallas'),
  _m('k23','2026-07-19','18:00','TBD','TBD','Final','MetLife Stadium, New Jersey'),
];

Object.assign(window, { Schedule });
