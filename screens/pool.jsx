// Pool detail — leaderboard + member picks + invite code.

function PoolDetail({ pool, user, state, dispatch, nav }) {
  const [tab, setTab] = useState('leaderboard');
  const [copied, setCopied] = useState(false);

  if (!pool) {
    return (
      <div className="main fade-in">
        <div className="card padded">Pool not found.</div>
      </div>
    );
  }

  const sorted = [...pool.members].sort((a, b) => b.score - a.score);
  const myEntry = sorted.find(m => m.you);
  const myRank = myEntry ? sorted.indexOf(myEntry) + 1 : null;
  const leader = sorted[0];
  const submittedBrackets = state.brackets.filter(b => b.submittedTo === pool.id);

  const copyCode = () => {
    navigator.clipboard?.writeText(pool.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Pool · {pool.members.length} members</div>
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
          <button className="btn primary" onClick={() => nav({ screen: 'dashboard' })}>
            ← Dashboard
          </button>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi">
          <div className="k">Your rank</div>
          <div className="v num">#{myRank || '—'}</div>
          <div className="d">of {pool.members.length}</div>
        </div>
        <div className="kpi">
          <div className="k">Your points</div>
          <div className="v num">{myEntry?.score || 0}</div>
          <div className="d">{leader ? `${leader.score - (myEntry?.score || 0)} behind leader` : '—'}</div>
        </div>
        <div className="kpi">
          <div className="k">Leader</div>
          <div className="v" style={{ fontSize: 18, fontWeight: 600 }}>{leader?.name || '—'}</div>
          <div className="d">{leader?.score || 0} points</div>
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
                <th>Member</th>
                <th style={{ width: 120 }}>Champion pick</th>
                <th style={{ width: 80, textAlign: 'right' }}>Correct</th>
                <th style={{ width: 80, textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => {
                const champPick = m.you
                  ? (submittedBrackets[0]?.knockout?.final
                      ? window.WC_DATA.byCode[submittedBrackets[0].knockout.final] : null)
                  : window.WC_DATA.byCode[m.championPick || ['ARG','BRA','FRA','ENG','GER','ESP','POR','NED'][i % 8]];
                const correct = m.correct ?? Math.max(0, Math.round((m.score || 0) / 8));
                return (
                  <tr key={m.id} className={m.you ? 'me' : ''}>
                    <td className={`pos ${i < 3 ? 'top' : ''}`}>{i + 1}</td>
                    <td>
                      <div className="nm">
                        <div className="av">{m.avatar || m.name.split(' ').map(s => s[0]).join('')}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{m.name}{m.you && <span className="tag accent" style={{ marginLeft: 8 }}>YOU</span>}</div>
                          <div className="muted mono" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
                            {m.you && pool.owner === user.name ? 'OWNER' : (m.id === 'me' && !m.you ? '' : '')}
                          </div>
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
                        <span className="muted mono" style={{ fontSize: 11 }}>NO BRACKET</span>
                      )}
                    </td>
                    <td className="pts muted">{correct}/64</td>
                    <td className="pts">{m.score || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'picks' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {sorted.map(m => {
            const ch = m.you
              ? (submittedBrackets[0]?.knockout?.final
                  ? window.WC_DATA.byCode[submittedBrackets[0].knockout.final] : null)
              : window.WC_DATA.byCode[m.championPick || ['ARG','BRA','FRA','ENG','GER','ESP','POR','NED'][sorted.indexOf(m) % 8]];
            return (
              <div key={m.id} className="card" style={{ padding: '14px 18px', display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto auto', gap: 16, alignItems: 'center' }}>
                <div className="av" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)',
                  display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                  {m.avatar || m.name.split(' ').map(s => s[0]).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{m.name}{m.you && <span className="tag accent" style={{ marginLeft: 8 }}>YOU</span>}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>Submitted {fmtDate(Date.now() - (sorted.indexOf(m) + 1) * 86400000)}</div>
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
                  <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{m.score || 0}</div>
                </div>
                <button className="btn sm">View bracket</button>
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
              <tr style={{ fontWeight: 600 }}><td>Maximum</td><td></td><td className="pts" style={{ fontWeight: 700 }}>888</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PoolDetail });
