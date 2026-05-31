// Summary screen — review picks and submit to a pool.

const GROUP_LOCK_TS_S = new Date('2026-06-11T05:00:00.000Z').getTime();
const KNOCKOUT_LOCK_TS_S = new Date('2026-06-28T17:00:00.000Z').getTime();

function Summary({ bracket, dispatch, nav, state }) {
  const [submitTo, setSubmitTo] = useState(null);

  const winner = bracket.knockout.final ? window.WC_DATA.byCode[bracket.knockout.final] : null;
  const finalist = bracket.knockout.sf
    ? [bracket.knockout.sf[0], bracket.knockout.sf[1]]
        .find(c => c && c !== bracket.knockout.final)
    : null;
  const finalistTeam = finalist ? window.WC_DATA.byCode[finalist] : null;
  const third = bracket.knockout.third ? window.WC_DATA.byCode[bracket.knockout.third] : null;
  const fourth = bracket.knockout.sf && bracket.knockout.third
    ? (() => {
        const sfLosers = [];
        for (let i = 0; i < 2; i++) {
          const w = bracket.knockout.sf[i];
          // Source slot teams of SF i — pull from QF winners
          const a = bracket.knockout.qf?.[i * 2];
          const b = bracket.knockout.qf?.[i * 2 + 1];
          const loser = [a, b].find(c => c && c !== w);
          if (loser) sfLosers.push(loser);
        }
        const f = sfLosers.find(c => c !== bracket.knockout.third);
        return f ? window.WC_DATA.byCode[f] : null;
      })()
    : null;

  const submit = (poolId) => {
    dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({
      ...b, done: true, submittedTo: poolId, submittedAt: Date.now(),
    })});
    // Add submission to pool with a faux score for now (0 — tournament hasn't started)
    dispatch({ type: 'POOL_SUBMIT', poolId, bracketId: bracket.id });
    setSubmitTo(null);
    nav({ screen: 'pool', poolId });
  };

  const koDone = bracket.knockout.final && bracket.knockout.third;

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">{bracket.name} · Step 3 of 3</div>
          <h1 className="page-title">Review & submit</h1>
          <div className="subtitle">
            {Date.now() >= GROUP_LOCK_TS_S
              ? <><strong>Group picks are frozen.</strong> Knockout picks lock at <strong>noon CDT, June 28, 2026</strong> when the R32 begins.</>
              : <>Lock your picks in to a pool. <strong>Group picks freeze midnight CDT, June 11</strong> — knockout picks freeze <strong>noon CDT, June 28</strong>.</>
            }
          </div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => nav({ screen: 'knockout', bracketId: bracket.id })}>
            ← Edit knockout
          </button>
          <button className="btn accent" disabled={!koDone}
            onClick={() => setSubmitTo('open')}
            style={{ opacity: koDone ? 1 : 0.5, cursor: koDone ? 'pointer' : 'not-allowed' }}>
            {bracket.done ? 'Resubmit' : 'Submit to pool'} →
          </button>
        </div>
      </div>

      <Stepper steps={['Group stage', 'Knockout', 'Review & submit']} current={2} />

      <div className="summary-grid">
        <div>
          <div className="card padded" style={{ marginBottom: 16 }}>
            <div className="spread" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Champion</h3>
              {winner && <span className="tag accent">YOUR PICK</span>}
            </div>
            {winner ? (
              <div className="row" style={{ gap: 16 }}>
                <Flag team={winner} w={64} h={42} />
                <div>
                  <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{winner.name}</div>
                  <div className="mono muted" style={{ fontSize: 12 }}>{winner.code} · {winner.conf}</div>
                </div>
              </div>
            ) : (
              <div className="muted">Finish the knockout to set your champion.</div>
            )}
          </div>

          <div className="card padded" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13 }}>Group stage</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {bracket.groups.map(g => {
                const teams = g.picks.map(c => c ? window.WC_DATA.byCode[c] : null);
                return (
                  <div key={g.letter} style={{
                    border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
                      GROUP {g.letter}
                    </div>
                    <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                      {teams.map((t, i) => <SmallTeam key={i} team={t} label={String(i + 1)} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card padded" style={{ marginBottom: 16 }}>
            <div className="spread" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>3rd-place qualifiers</h3>
              <span className="mono muted" style={{ fontSize: 11 }}>
                {(bracket.knockout.thirdQualifiers?.length || 0)} / 8
              </span>
            </div>
            {(bracket.knockout.thirdQualifiers?.length > 0) ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {bracket.knockout.thirdQualifiers.map(code => {
                  const t = window.WC_DATA.byCode[code];
                  if (!t) return null;
                  const g = bracket.groups.find(gr => gr.picks[2] === code);
                  return (
                    <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 8,
                      border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px' }}>
                      <Flag team={t} w={20} h={14} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</div>
                        {g && <div className="mono muted" style={{ fontSize: 10 }}>3rd · Group {g.letter}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>
                No qualifiers picked yet.{' '}
                <button className="btn ghost sm" style={{ display: 'inline', padding: '2px 8px' }}
                  onClick={() => nav({ screen: 'knockout', bracketId: bracket.id })}>
                  Go to knockout →
                </button>
              </div>
            )}
          </div>

          <div className="card padded">
            <h3 style={{ margin: '0 0 14px', fontSize: 13 }}>Knockout picks</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <KORow label="ROUND OF 16" picks={bracket.knockout.r16} count={8} />
              <KORow label="QUARTER-FINALS" picks={bracket.knockout.qf} count={4} />
              <KORow label="SEMI-FINALS" picks={bracket.knockout.sf} count={2} />
            </div>
          </div>
        </div>

        <aside className="summary-aside">
          <div className="summary-block">
            <h3>Podium</h3>
            <div className="podium">
              <div className="pdm silver">
                <div className="rk">2ND</div>
                {finalistTeam ? (
                  <>
                    <Flag team={finalistTeam} w={28} h={18} style={{ margin: '6px auto' }} />
                    <div className="nm">{finalistTeam.name}</div>
                  </>
                ) : <div className="muted mono" style={{ fontSize: 10, marginTop: 16 }}>TBD</div>}
              </div>
              <div className="pdm gold">
                <div className="rk">1ST</div>
                {winner ? (
                  <>
                    <Flag team={winner} w={36} h={24} style={{ margin: '8px auto' }} />
                    <div className="nm">{winner.name}</div>
                  </>
                ) : <div className="muted mono" style={{ fontSize: 10, marginTop: 22 }}>TBD</div>}
              </div>
              <div className="pdm bronze">
                <div className="rk">3RD</div>
                {third ? (
                  <>
                    <Flag team={third} w={24} h={16} style={{ margin: '4px auto' }} />
                    <div className="nm">{third.name}</div>
                  </>
                ) : <div className="muted mono" style={{ fontSize: 10, marginTop: 10 }}>TBD</div>}
              </div>
            </div>
            {fourth && (
              <div style={{ marginTop: 14, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)' }}>
                4TH · <span style={{ color: 'var(--fg-2)' }}>{fourth.name}</span>
              </div>
            )}
          </div>

          <div className="summary-block">
            <h3>Submission status</h3>
            <div className="tag" style={{ marginBottom: 10, fontSize: 10 }}>
              {Date.now() >= GROUP_LOCK_TS_S ? 'FROZEN — TOURNAMENT UNDERWAY' : 'EDITABLE UNTIL JUN 11, 2026'}
            </div>
            {bracket.done ? (
              <>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="tag accent">SUBMITTED</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Submitted on {new Date(bracket.submittedAt).toLocaleString()}.
                </div>
              </>
            ) : (
              <>
                <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  Not yet submitted. Pick a pool below to lock it in.
                </div>
                {state.pools.length === 0 ? (
                  <div className="muted mono" style={{ fontSize: 11 }}>No pools yet — create or join one first.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {state.pools.map(p => (
                      <button key={p.id} className="btn" onClick={() => submit(p.id)}
                        style={{ justifyContent: 'space-between', width: '100%' }}>
                        <span>{p.name}</span>
                        <span className="mono muted" style={{ fontSize: 11 }}>{p.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {submitTo === 'open' && (
        <Modal title="Submit bracket"
          body={state.pools.length === 0
            ? 'Create or join a pool first, then submit your bracket there.'
            : 'Choose a pool — your bracket will be locked in for scoring.'}
          onClose={() => setSubmitTo(null)}>
          {state.pools.length === 0 ? (
            <div className="actions">
              <button className="btn ghost" onClick={() => setSubmitTo(null)}>Cancel</button>
              <button className="btn primary" onClick={() => { setSubmitTo(null); nav({ screen: 'dashboard' }); }}>
                Go to pools
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                {state.pools.map(p => (
                  <button key={p.id} className="btn" onClick={() => submit(p.id)}
                    style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span>{p.name}</span>
                    <span className="mono muted" style={{ fontSize: 11 }}>{p.members.length} members</span>
                  </button>
                ))}
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => setSubmitTo(null)}>Cancel</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function SmallTeam({ team, label }) {
  if (!team) {
    return (
      <div className="row muted mono" style={{ fontSize: 11, gap: 6 }}>
        <span style={{ width: 14 }}>{label}</span>—
      </div>
    );
  }
  return (
    <div className="row" style={{ fontSize: 12, gap: 8 }}>
      <span className="mono muted" style={{ width: 10, fontSize: 10 }}>{label}</span>
      <Flag team={team} w={16} h={11} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
    </div>
  );
}

function KORow({ label, picks, count }) {
  picks = picks || {};
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px' }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {Array.from({ length: count }).map((_, i) => {
          const code = picks[i];
          const t = code ? window.WC_DATA.byCode[code] : null;
          return (
            <div key={i} className="row" style={{ fontSize: 12, gap: 8 }}>
              <span className="mono muted" style={{ width: 14, fontSize: 10 }}>{i + 1}</span>
              {t ? <>
                <Flag team={t} w={16} h={11} />
                <span>{t.name}</span>
              </> : <span className="muted">—</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Summary });
