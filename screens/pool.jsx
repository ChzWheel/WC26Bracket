// Pool detail — leaderboard + member picks + invite code.

const KO_STAGES = [
  { key: 'r32', reward: 10, count: 16 },
  { key: 'r16', reward: 20, count: 8  },
  { key: 'qf',  reward: 40, count: 4  },
  { key: 'sf',  reward: 80, count: 2  },
];

// Returns max additional points a bracket can still earn given current eliminations.
// knockedOut = teams eliminated in r32/r16/qf/3rd-place (fully out).
// sfLosers   = teams that lost in SF (can still play 3rd place, not the final).
function calcRemaining(knockout, knockedOut, sfLosers) {
  if (!knockout) return null;
  let pts = 0;
  // 5 pts per 3rd-place qualifier pick that hasn't been knocked out yet
  for (const code of knockout.thirdQualifiers || []) {
    if (!knockedOut.has(code)) pts += 5;
  }
  for (const { key, reward, count } of KO_STAGES) {
    const picks = knockout[key] || {};
    for (let i = 0; i < count; i++) {
      const t = picks[i];
      if (t && !knockedOut.has(t) && !sfLosers.has(t)) pts += reward;
    }
  }
  if (knockout.final && !knockedOut.has(knockout.final) && !sfLosers.has(knockout.final)) pts += 160;
  if (knockout.third && !knockedOut.has(knockout.third)) pts += 40;
  return pts;
}

function PoolDetail({ pool, user, state, dispatch, nav, isAdmin }) {
  const [tab, setTab] = useState('leaderboard');
  const [copied, setCopied] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [entries, setEntries] = useState([]);          // one per submitted bracket
  const [knockedOut, setKnockedOut] = useState(new Set());
  const [sfLosers, setSfLosers] = useState(new Set());
  const [confirm, setConfirm] = useState(null); // 'delete' | 'leave' | null

  useEffect(() => {
    if (!pool?.id) return;
    Promise.all([
      window.SB.Brackets.getAllForPool(pool.id),
      window.SB.Matches.getKnockoutResults(),
    ]).then(([brackets, results]) => {
      // Leaderboard entries are brackets, not members — a user can submit
      // several brackets (including ones managed for guests without accounts).
      setEntries(brackets.map(b => {
        const ownerName = b.guest_name || b.profiles?.name || 'Unknown';
        return {
          id:          b.id,
          name:        b.name,
          ownerName,
          isGuest:     !!b.guest_name,
          avatar:      b.guest_name
            ? b.guest_name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()
            : (b.profiles?.avatar || '??'),
          mine:        b.user_id === user.id,
          score:       b.score   || 0,
          correct:     b.correct || 0,
          groups:      b.groups,
          knockout:    b.knockout,
          submittedAt: b.submitted_at,
        };
      }));

      const out = new Set();
      const sf  = new Set();
      for (const m of results) {
        if (m.home_score == null || m.away_score == null || m.home_score === m.away_score) continue;
        const loser = m.home_score > m.away_score ? m.away_code : m.home_code;
        if (['r32', 'r16', 'qf', 'third'].includes(m.stage)) out.add(loser);
        else if (m.stage === 'sf') sf.add(loser);
      }
      setKnockedOut(out);
      setSfLosers(sf);
    }).catch(console.error);
  }, [pool?.id]);

  if (!pool) {
    return (
      <div className="main fade-in">
        <div className="card padded">Pool not found.</div>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => b.score - a.score);
  // "Your" stats use your own (non-guest) best bracket; fall back to any of yours.
  const myEntry = sorted.find(e => e.mine && !e.isGuest) || sorted.find(e => e.mine);
  const myRank = myEntry ? sorted.indexOf(myEntry) + 1 : null;
  const leader = sorted[0];
  const submittedBrackets = state.brackets.filter(b => b.submittedTo === pool.id);
  const canDelete = pool.isOwner || isAdmin;

  const getMaxPts = (entry) => {
    const rem = calcRemaining(entry.knockout, knockedOut, sfLosers);
    if (rem === null) return null;
    return { max: entry.score + rem, rem };
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(pool.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const openBracket = (entry) => {
    setViewing({
      bracket: { groups: entry.groups, knockout: entry.knockout },
      name: `${entry.name} — ${entry.ownerName}`,
    });
  };

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            Pool · {pool.members.length} members · {entries.length} bracket{entries.length === 1 ? '' : 's'}
          </div>
          <h1 className="page-title">{pool.name}</h1>
          <div className="subtitle">
            Hosted by {pool.owner === user.name ? 'you' : pool.owner}. Points double each round —
            picking the champion is worth +160.
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={copyCode}>
            <span className="mono" style={{ letterSpacing: '0.2em' }}>{pool.code}</span>
            <span className="kbd">{copied ? 'COPIED' : 'COPY'}</span>
          </button>
          {canDelete
            ? <button className="btn danger" onClick={() => setConfirm('delete')}>Delete pool</button>
            : <button className="btn ghost" onClick={() => setConfirm('leave')}>Leave pool</button>
          }
          <button className="btn primary" onClick={() => nav({ screen: 'dashboard' })}>
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi">
          <div className="k">Your rank</div>
          <div className="v num">#{myRank || '—'}</div>
          <div className="d">of {entries.length} brackets</div>
        </div>
        <div className="kpi">
          <div className="k">Your points</div>
          <div className="v num">{myEntry?.score || 0}</div>
          <div className="d">{leader ? `${leader.score - (myEntry?.score || 0)} behind leader` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="k">Leader</div>
          <div className="v" style={{ fontSize: 18, fontWeight: 600 }}>{leader?.name || '—'}</div>
          <div className="d">{leader ? `${leader.ownerName} · ${leader.score} pts` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="k">Submitted brackets</div>
          <div className="v num">{submittedBrackets.length}</div>
          <div className="d">of yours</div>
        </div>
      </div>

      <div className="pool-tabs">
        {['leaderboard', 'picks', 'rules'].map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'leaderboard' ? 'Leaderboard' : t === 'picks' ? 'Member picks' : 'Scoring rules'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <div className="card">
          <table className="lb-table">
            <thead>
              <tr>
                <th className="pos">#</th>
                <th>Bracket</th>
                <th style={{ width: 120 }}>Champion pick</th>
                <th style={{ width: 80, textAlign: 'right' }}>Correct</th>
                <th style={{ width: 80, textAlign: 'right' }}>Points</th>
                <th style={{ width: 90, textAlign: 'right' }}>Max pts</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => {
                const champCode = e.knockout?.final;
                const champPick = champCode ? window.WC_DATA.byCode[champCode] : null;
                return (
                  <tr key={e.id} className={e.mine ? 'me' : ''}>
                    <td className={`pos ${i < 3 ? 'top' : ''}`}>{i + 1}</td>
                    <td>
                      <div className="nm">
                        <div className="av">{e.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {e.name}
                            {e.mine && !e.isGuest && <span className="tag accent" style={{ marginLeft: 8 }}>YOU</span>}
                            {e.mine && e.isGuest && <span className="tag" style={{ marginLeft: 8 }}>MANAGED</span>}
                          </div>
                          <div className="muted" style={{ fontSize: 11 }}>{e.ownerName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {champPick ? (
                        <div className="row" style={{ gap: 8 }}>
                          <Flag team={champPick} w={18} h={12} />
                          <span style={{ fontSize: 12 }}>{champPick.name}</span>
                        </div>
                      ) : (
                        <span className="muted mono" style={{ fontSize: 11 }}>NO CHAMPION</span>
                      )}
                    </td>
                    <td className="pts muted">{e.correct}/64</td>
                    <td className="pts">{e.score}</td>
                    <td className="pts" style={{ textAlign: 'right' }}>
                      {(() => {
                        const mp = getMaxPts(e);
                        if (!mp) return <span className="muted">—</span>;
                        return (
                          <div>
                            <div>{mp.max}</div>
                            <div className="muted mono" style={{ fontSize: 10 }}>+{mp.rem} left</div>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'picks' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {sorted.map(e => {
            const ch = e.knockout?.final ? window.WC_DATA.byCode[e.knockout.final] : null;
            return (
              <div key={e.id} className="card" style={{ padding: '14px 18px', display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto auto', gap: 16, alignItems: 'center' }}>
                <div className="av" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)',
                  display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                  {e.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {e.name}
                    {e.mine && !e.isGuest && <span className="tag accent" style={{ marginLeft: 8 }}>YOU</span>}
                    {e.mine && e.isGuest && <span className="tag" style={{ marginLeft: 8 }}>MANAGED</span>}
                  </div>
                  <div className="muted mono" style={{ fontSize: 11 }}>
                    {e.ownerName}{e.submittedAt ? ` · submitted ${fmtDate(e.submittedAt)}` : ''}
                  </div>
                </div>
                <div>
                  <div className="muted mono" style={{ fontSize: 10, textTransform: 'uppercase' }}>Champion</div>
                  {ch ? (
                    <div className="row" style={{ gap: 6, marginTop: 2 }}>
                      <Flag team={ch} w={18} h={12} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{ch.name}</span>
                    </div>
                  ) : <span className="muted">—</span>}
                </div>
                <div>
                  <div className="muted mono" style={{ fontSize: 10, textTransform: 'uppercase' }}>Pts</div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{e.score}</div>
                </div>
                <button className="btn sm" onClick={() => openBracket(e)}>
                  View bracket
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'rules' && (
        <div className="card padded" style={{ maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>Scoring</h3>
          <p className="muted">Group ranks score 1 point per exact position. Knockout points double each round.</p>
          <table className="lb-table" style={{ marginTop: 12 }}>
            <thead><tr><th>Stage</th><th style={{ textAlign: 'right' }}>Per correct pick</th><th style={{ textAlign: 'right' }}>Total possible</th></tr></thead>
            <tbody>
              {[
                ['Group rank (exact position)', 1,  48],
                ['3rd-place qualifier (×8)',    5,  40],
                ['Round of 32', 10, 160],
                ['Round of 16', 20, 160],
                ['Quarter-final', 40, 160],
                ['Semi-final', 80, 160],
                ['Champion', 160, 160],
                ['3rd place', 40, 40],
              ].map(([s, p, t]) => (
                <tr key={s}><td>{s}</td><td className="pts">+{p}</td><td className="pts muted">{t}</td></tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600 }}><td>Maximum</td><td></td><td className="pts" style={{ fontWeight: 700 }}>928</td></tr>
            </tfoot>
          </table>
        </div>
      )}

      {viewing && (
        <BracketViewModal
          bracket={viewing.bracket}
          memberName={viewing.name}
          onClose={() => setViewing(null)}
        />
      )}

      {confirm === 'delete' && (
        <div className="modal-bg" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete "{pool.name}"?</h3>
            <p>
              This permanently removes the pool and unsubmits all {pool.members.length} members'
              brackets. This cannot be undone.
            </p>
            <div className="actions">
              <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn danger" onClick={() => {
                setConfirm(null);
                dispatch({ type: 'DELETE_POOL', poolId: pool.id });
              }}>
                Delete pool
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm === 'leave' && (
        <div className="modal-bg" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Leave "{pool.name}"?</h3>
            <p>
              You'll be removed from the pool and your submitted bracket will be unsubmitted.
              You can rejoin later with the pool code.
            </p>
            <div className="actions">
              <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn danger" onClick={() => {
                setConfirm(null);
                dispatch({ type: 'LEAVE_POOL', poolId: pool.id });
              }}>
                Leave pool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BracketViewModal({ bracket, memberName, onClose }) {
  const { groups = [], knockout = {} } = bracket;
  const WC = window.WC_DATA;
  const champion = knockout.final ? WC.byCode[knockout.final] : null;
  const third    = knockout.third ? WC.byCode[knockout.third] : null;

  const koStages = [
    { label: 'R32', key: 'r32', count: 16 },
    { label: 'R16', key: 'r16', count: 8  },
    { label: 'QF',  key: 'qf',  count: 4  },
    { label: 'SF',  key: 'sf',  count: 2  },
  ];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal modal-xl fade-in" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 2 }}>Bracket view</div>
            <h3 style={{ margin: 0 }}>{memberName}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {champion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-2)', borderRadius: 8, padding: '6px 12px' }}>
                <span style={{ fontSize: 16 }}>🏆</span>
                <Flag team={champion} w={22} h={15} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{champion.name}</span>
              </div>
            )}
            <button className="btn ghost sm" onClick={onClose} style={{ fontSize: 16, padding: '4px 10px' }}>✕</button>
          </div>
        </div>

        {/* Group stage */}
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 8 }}>
          GROUP STAGE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 24 }}>
          {groups.map(g => (
            <div key={g.letter} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', marginBottom: 6 }}>
                GROUP {g.letter}
              </div>
              {[0, 1, 2, 3].map(rank => {
                const team = g.picks?.[rank] ? WC.byCode[g.picks[rank]] : null;
                return (
                  <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: 5,
                    marginBottom: 3, opacity: rank < 2 ? 1 : 0.4 }}>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--fg-3)', width: 8 }}>{rank + 1}</span>
                    {team ? (
                      <>
                        <Flag team={team} w={14} h={9} />
                        <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {team.name}
                        </span>
                      </>
                    ) : <span className="muted" style={{ fontSize: 11 }}>—</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 3rd-place qualifiers */}
        <div style={{ marginBottom: 24 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 8 }}>
            3RD-PLACE QUALIFIERS ({knockout.thirdQualifiers?.length || 0}/8)
          </div>
          {(knockout.thirdQualifiers?.length > 0) ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {knockout.thirdQualifiers.map(code => {
                const team = WC.byCode[code];
                if (!team) return null;
                const g = groups.find(gr => gr.picks?.[2] === code);
                return (
                  <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6,
                    border: '1px solid var(--line)', borderRadius: 6, padding: '5px 9px',
                    background: 'var(--bg-2)' }}>
                    <Flag team={team} w={16} h={11} />
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{team.name}</span>
                    {g && <span className="mono" style={{ fontSize: 9, color: 'var(--fg-3)' }}>3{g.letter}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>Not selected</span>
          )}
        </div>

        {/* Knockout */}
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 8 }}>
          KNOCKOUT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {koStages.map(({ label, key, count }) => (
            <div key={key} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.06em', marginBottom: 6 }}>
                {label}
              </div>
              {Array.from({ length: count }).map((_, i) => {
                const team = knockout[key]?.[i] ? WC.byCode[knockout[key][i]] : null;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    {team ? (
                      <>
                        <Flag team={team} w={14} h={9} />
                        <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {team.name}
                        </span>
                      </>
                    ) : <span className="muted" style={{ fontSize: 11 }}>—</span>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Final column: champion + 3rd place */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.06em', marginBottom: 6 }}>
              FINAL
            </div>
            {champion ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>🥇</span>
                <Flag team={champion} w={16} h={11} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{champion.name}</span>
              </div>
            ) : <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>—</div>}
            <div className="mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.06em', marginBottom: 6 }}>
              3RD PLACE
            </div>
            {third ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13 }}>🥉</span>
                <Flag team={third} w={16} h={11} />
                <span style={{ fontSize: 12 }}>{third.name}</span>
              </div>
            ) : <div className="muted" style={{ fontSize: 11 }}>—</div>}
          </div>
        </div>

        <div className="actions">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PoolDetail });
