// standings.jsx — Group tables + Knockout results

// ── Data computation ──────────────────────────────────────────

function computeGroupStandings(groupMatches) {
  const groups = {};

  groupMatches.forEach(m => {
    const g = m.group_label;
    if (!groups[g]) groups[g] = {};
    [m.home_code, m.away_code].forEach(code => {
      if (!groups[g][code]) {
        groups[g][code] = { code, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      }
    });

    if (m.status === 'ft' && m.home_score !== null && m.away_score !== null) {
      const h = groups[g][m.home_code], a = groups[g][m.away_code];
      const hg = m.home_score, ag = m.away_score;
      h.p++; a.p++;
      h.gf += hg; h.ga += ag;
      a.gf += ag; a.ga += hg;
      if (hg > ag)      { h.w++; h.pts += 3; a.l++; }
      else if (hg < ag) { a.w++; a.pts += 3; h.l++; }
      else              { h.d++; a.d++; h.pts++; a.pts++; }
    }
  });

  const result = {};
  Object.entries(groups).forEach(([grp, teams]) => {
    result[grp] = Object.values(teams).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdDiff = (b.gf - b.ga) - (a.gf - a.ga);
      if (gdDiff !== 0) return gdDiff;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.code.localeCompare(b.code);
    });
  });

  return result;
}

// ── Constants ─────────────────────────────────────────────────

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');

const KO_ROUNDS = [
  { stage: 'r32',   label: 'Round of 32'    },
  { stage: 'r16',   label: 'Round of 16'    },
  { stage: 'qf',    label: 'Quarter-finals' },
  { stage: 'sf',    label: 'Semi-finals'    },
  { stage: 'third', label: '3rd Place'      },
  { stage: 'final', label: 'Final'          },
];

// ── Main screen ───────────────────────────────────────────────

function Standings({ nav }) {
  const [tab, setTab]       = useState('groups');
  const [matches, setMatches] = useState(null);
  const [error, setError]   = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      // Future hook: replace with direct football-api standings call when available.
      const data = await window.SB.Matches.getAll();
      setMatches(data);
    } catch (e) {
      setError(e.message);
      setMatches([]);
    }
  };

  const groupStandings = useMemo(() => {
    if (!matches) return null;
    return computeGroupStandings(matches.filter(m => m.stage === 'group'));
  }, [matches]);

  const koMatches = useMemo(() => {
    if (!matches) return [];
    return matches
      .filter(m => m.stage !== 'group')
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  }, [matches]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const phase = today < '2026-06-11' ? 'pre'
              : today < '2026-06-28' ? 'group'
              : 'knockout';

  const subtitles = {
    pre:      'Tournament begins June 11, 2026. Tables will populate as results come in.',
    group:    'Group stage in progress — standings update when admin syncs results.',
    knockout: 'Group stage complete. Knockout results below.',
  };

  if (matches === null) {
    return (
      <div className="main fade-in">
        <div className="muted mono" style={{ padding: 40, textAlign: 'center', fontSize: 12 }}>
          Loading standings…
        </div>
      </div>
    );
  }

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Tournament</div>
          <h1 className="page-title">Standings</h1>
          <div className="subtitle">{subtitles[phase]}</div>
        </div>
        <div className="day-toggle">
          <button className={tab === 'groups'   ? 'active' : ''} onClick={() => setTab('groups')}>
            Groups
          </button>
          <button className={tab === 'knockout' ? 'active' : ''} onClick={() => setTab('knockout')}>
            Knockout
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
          Could not load standings: {error}
        </div>
      )}

      {tab === 'groups'   && <GroupsTab standings={groupStandings} />}
      {tab === 'knockout' && <KnockoutTab matches={koMatches} />}
    </div>
  );
}

// ── Groups tab ────────────────────────────────────────────────

function GroupsTab({ standings }) {
  if (!standings) return null;
  return (
    <div className="st-groups-grid">
      {GROUP_LETTERS.map(g =>
        standings[g] ? <GroupTable key={g} group={g} rows={standings[g]} /> : null
      )}
    </div>
  );
}

function GroupTable({ group, rows }) {
  const byCode = window.WC_DATA?.byCode || {};

  return (
    <div className="st-group">
      <div className="st-group-head">Group {group}</div>
      <table className="st-table">
        <thead>
          <tr>
            <th className="st-c-rank">#</th>
            <th className="st-c-team">Team</th>
            <th className="st-c-num" title="Played">P</th>
            <th className="st-c-num" title="Won">W</th>
            <th className="st-c-num" title="Drawn">D</th>
            <th className="st-c-num" title="Lost">L</th>
            <th className="st-c-num st-hide-sm" title="Goals for">GF</th>
            <th className="st-c-num st-hide-sm" title="Goals against">GA</th>
            <th className="st-c-num" title="Goal difference">GD</th>
            <th className="st-c-pts" title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const team = byCode[row.code];
            const zone = i < 2 ? 'qualify' : i === 2 ? 'third' : 'out';
            const gd   = row.gf - row.ga;
            return (
              <tr key={row.code} className={`st-row st-zone-${zone}`}>
                <td className="st-c-rank">{i + 1}</td>
                <td className="st-c-team">
                  {team && <span className={`fi fi-${team.iso} st-flag`} />}
                  <span className="st-name">{team?.name || row.code}</span>
                  <span className="st-code muted mono">{row.code}</span>
                </td>
                <td className="st-c-num">{row.p}</td>
                <td className="st-c-num">{row.w}</td>
                <td className="st-c-num">{row.d}</td>
                <td className="st-c-num">{row.l}</td>
                <td className="st-c-num st-hide-sm">{row.gf}</td>
                <td className="st-c-num st-hide-sm">{row.ga}</td>
                <td className="st-c-num">{gd > 0 ? `+${gd}` : gd}</td>
                <td className="st-c-pts">{row.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="st-legend">
        <span className="st-legend-dot qualify" /> Advance to R32
        <span className="st-legend-dot third"   style={{ marginLeft: 10 }} /> 3rd place contender
      </div>
    </div>
  );
}

// ── Knockout tab ──────────────────────────────────────────────

function KnockoutTab({ matches }) {
  const byStage = useMemo(() => {
    const map = {};
    matches.forEach(m => {
      if (!map[m.stage]) map[m.stage] = [];
      map[m.stage].push(m);
    });
    return map;
  }, [matches]);

  const hasResults = matches.some(m => m.status === 'ft' || m.status === 'live' || m.status === 'ht');

  if (!hasResults) {
    return (
      <div className="card padded" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>Knockout stage not started</div>
        <div className="muted" style={{ fontSize: 13 }}>
          Round of 32 begins <strong>June 28, 2026</strong>. Check back once the group stage concludes.
        </div>
      </div>
    );
  }

  return (
    <div className="st-ko-rounds">
      {KO_ROUNDS.map(({ stage, label }) => {
        const round = (byStage[stage] || []).filter(
          m => m.status === 'ft' || m.status === 'live' || m.status === 'ht'
        );
        if (!round.length) return null;
        return <KoRound key={stage} label={label} stage={stage} matches={round} />;
      })}
    </div>
  );
}

function KoRound({ label, stage, matches }) {
  return (
    <div className="st-ko-round">
      <div className="st-ko-round-head">
        <span className={`st-stage-dot st-stage-dot--${stage}`} />
        {label}
        <span className="muted mono" style={{ fontSize: 11, marginLeft: 8 }}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </span>
      </div>
      <div className="st-ko-grid">
        {matches.map(m => <KoMatchCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}

function KoMatchCard({ m }) {
  const byCode   = window.WC_DATA?.byCode || {};
  const home     = byCode[m.home_code];
  const away     = byCode[m.away_code];
  const ft       = m.status === 'ft';
  const live     = m.status === 'live' || m.status === 'ht';
  const homeWon  = ft && m.home_score > m.away_score;
  const awayWon  = ft && m.away_score > m.home_score;
  const homeName = home?.name || m.home_code || '—';
  const awayName = away?.name || m.away_code || '—';

  return (
    <div className="st-ko-card">
      <div className={`st-ko-team${homeWon ? ' winner' : awayWon ? ' loser' : ''}`}>
        {home && <span className={`fi fi-${home.iso}`} style={{ marginRight: 6 }} />}
        <span className="st-ko-tname">{homeName}</span>
        {(ft || live) && (
          <span className={`st-ko-score${homeWon ? ' winner' : ''}`}>{m.home_score ?? '—'}</span>
        )}
      </div>
      <div className={`st-ko-team${awayWon ? ' winner' : homeWon ? ' loser' : ''}`}>
        {away && <span className={`fi fi-${away.iso}`} style={{ marginRight: 6 }} />}
        <span className="st-ko-tname">{awayName}</span>
        {(ft || live) && (
          <span className={`st-ko-score${awayWon ? ' winner' : ''}`}>{m.away_score ?? '—'}</span>
        )}
      </div>
      {live && (
        <div className="st-ko-live">
          <span className="live-dot sm" /> Live
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Standings });
