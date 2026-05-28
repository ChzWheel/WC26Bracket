// dashboard.jsx — Wired to async Supabase dispatch.
// Key change: dispatch is async, so createBracket/createPool await it.

function Dashboard({ user, state, dispatch, nav }) {
  const [modal, setModal]         = useState(null);
  const [bracketName, setBracketName] = useState('');
  const [poolName, setPoolName]   = useState('');
  const [poolCode, setPoolCode]   = useState('');
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState('');

  const myBrackets = state.brackets || [];
  const myPools    = state.pools    || [];

  const createBracket = async () => {
    setBusy(true); setErr('');
    try {
      const id = await new Promise((resolve, reject) => {
        dispatch({
          type: 'ADD_BRACKET',
          bracket: { name: bracketName || `My Bracket ${myBrackets.length + 1}` },
          _resolve: (b) => resolve(b.id),
        }).catch(reject);
      });
      setModal(null); setBracketName('');
      nav({ screen: 'group-stage', bracketId: id });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const createPool = async () => {
    setBusy(true); setErr('');
    try {
      const pool = await new Promise((resolve, reject) => {
        dispatch({
          type: 'ADD_POOL',
          pool: { name: poolName || 'New Pool' },
          _resolve: resolve,
        }).catch(reject);
      });
      setModal(null); setPoolName('');
      nav({ screen: 'pool', poolId: pool.id });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const joinPool = async () => {
    if (!poolCode.trim()) return;
    setBusy(true); setErr('');
    try {
      const pool = await new Promise((resolve, reject) => {
        dispatch({
          type: 'JOIN_POOL',
          code: poolCode,
          _resolve: resolve,
        }).catch(reject);
      });
      setModal(null); setPoolCode('');
      nav({ screen: 'pool', poolId: pool.id });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const totalCompleted = myBrackets.filter(b => b.done).length;
  const totalPoints    = myPools.reduce((s, p) =>
    s + (p.members.find(m => m.you)?.score || 0), 0);
  const bestRank = myPools.length ? Math.min(...myPools.map(p => {
    const sorted = [...p.members].sort((a, b) => b.score - a.score);
    return sorted.findIndex(m => m.you) + 1;
  })) : null;

  const closeModal = () => { setModal(null); setErr(''); };

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1 className="page-title">Welcome back, {user.name.split(' ')[0]}.</h1>
          <div className="subtitle">
            World Cup 2026 kicks off June 11. Build brackets, run pools, and chase the title.
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setModal('join-pool')}>Join pool</button>
          <button className="btn accent" onClick={() => setModal('new-bracket')}>
            + New bracket
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi k="Brackets"    v={String(myBrackets.length)} d={`${totalCompleted} submitted`} />
        <Kpi k="Pools"       v={String(myPools.length)}    d="active" />
        <Kpi k="Total points" v={String(totalPoints)}      d="across all pools" />
        <Kpi k="Best rank"   v={bestRank ? `#${bestRank}` : '—'} d={bestRank ? 'this season' : 'join a pool'} />
      </div>

      <div className="section-head">
        <h2>Your brackets</h2>
        <span className="tag muted">{myBrackets.length} total</span>
      </div>
      <div className="bracket-grid">
        {myBrackets.map(b => (
          <BracketCard key={b.id} b={b} onClick={() =>
            nav({ screen: b.step >= 2 ? 'summary' : (b.step === 1 ? 'knockout' : 'group-stage'), bracketId: b.id })
          } />
        ))}
        <button className="bracket-card new" onClick={() => setModal('new-bracket')}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 300, marginBottom: 4 }}>+</div>
            <div style={{ fontSize: 13 }}>New bracket</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>
              Up to 5 per account
            </div>
          </div>
        </button>
      </div>

      <div className="section-head" style={{ marginTop: 36 }}>
        <h2>Your pools</h2>
        <div className="row">
          <button className="btn sm" onClick={() => setModal('join-pool')}>Join</button>
          <button className="btn sm" onClick={() => setModal('new-pool')}>+ New pool</button>
        </div>
      </div>
      {myPools.length === 0 ? (
        <div className="card padded" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No pools yet</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Pools let you submit brackets and compete on a leaderboard.
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setModal('join-pool')}>Join with code</button>
            <button className="btn primary" onClick={() => setModal('new-pool')}>+ Create a pool</button>
          </div>
        </div>
      ) : (
        <div className="pool-grid">
          {myPools.map(p => {
            const sorted = [...p.members].sort((a, b) => b.score - a.score);
            const my      = sorted.findIndex(m => m.you) + 1;
            const myScore = sorted.find(m => m.you)?.score || 0;
            return (
              <div key={p.id} className="pool-row" onClick={() => nav({ screen: 'pool', poolId: p.id })}>
                <div className="badge">{p.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="pnm">{p.name}</div>
                  <div className="psub">{p.members.length} members · code {p.code}</div>
                </div>
                <div>
                  <div className="prank">RANK</div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
                    #{my} <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>/ {p.members.length}</span>
                  </div>
                </div>
                <div>
                  <div className="prank">POINTS</div>
                  <div className="pscore">{myScore}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'new-bracket' && (
        <Modal title="Create a new bracket"
          body="Pick group stage outcomes, then build the knockout tree."
          onClose={closeModal}>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <label className="field">
            <span className="lbl">Bracket name</span>
            <input className="input" autoFocus value={bracketName}
              onChange={(e) => setBracketName(e.target.value)}
              placeholder={`My Bracket ${myBrackets.length + 1}`}
              onKeyDown={(e) => e.key === 'Enter' && createBracket()} />
          </label>
          <div className="actions">
            <button className="btn ghost" onClick={closeModal}>Cancel</button>
            <button className="btn primary" onClick={createBracket} disabled={busy}>
              {busy ? 'Creating…' : 'Create bracket →'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'new-pool' && (
        <Modal title="Create a pool"
          body="Invite friends with a code. Submit brackets and a leaderboard auto-updates."
          onClose={closeModal}>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <label className="field">
            <span className="lbl">Pool name</span>
            <input className="input" autoFocus value={poolName}
              onChange={(e) => setPoolName(e.target.value)} placeholder="e.g. Office League"
              onKeyDown={(e) => e.key === 'Enter' && createPool()} />
          </label>
          <div className="actions">
            <button className="btn ghost" onClick={closeModal}>Cancel</button>
            <button className="btn primary" onClick={createPool} disabled={busy}>
              {busy ? 'Creating…' : 'Create →'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'join-pool' && (
        <Modal title="Join a pool"
          body="Enter the 5-character code your pool host shared with you."
          onClose={closeModal}>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <label className="field">
            <span className="lbl">Pool code</span>
            <input className="input mono" autoFocus value={poolCode} maxLength={6}
              onChange={(e) => setPoolCode(e.target.value.toUpperCase())}
              placeholder="X7K2P" style={{ letterSpacing: '0.2em', fontSize: 16 }}
              onKeyDown={(e) => e.key === 'Enter' && joinPool()} />
          </label>
          <div className="actions">
            <button className="btn ghost" onClick={closeModal}>Cancel</button>
            <button className="btn primary" onClick={joinPool} disabled={busy}>
              {busy ? 'Joining…' : 'Join →'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Kpi({ k, v, d }) {
  return (
    <div className="kpi">
      <div className="k">{k}</div>
      <div className="v num">{v}</div>
      <div className="d">{d}</div>
    </div>
  );
}

function BracketCard({ b, onClick }) {
  const groupsDone  = b.groups.filter(g => g.picks.every(Boolean)).length;
  const groupPicks  = b.groups.reduce((s, g) => s + g.picks.filter(Boolean).length, 0);
  const koPicks     =
    Object.values(b.knockout.r32 || {}).filter(Boolean).length +
    Object.values(b.knockout.r16 || {}).filter(Boolean).length +
    Object.values(b.knockout.qf  || {}).filter(Boolean).length +
    Object.values(b.knockout.sf  || {}).filter(Boolean).length +
    (b.knockout.third ? 1 : 0) +
    (b.knockout.final ? 1 : 0);
  const pct = Math.round(((groupPicks + koPicks) / (48 + 16 + 8 + 4 + 2 + 1 + 1)) * 100);
  const winner = b.knockout.final ? window.WC_DATA.byCode[b.knockout.final] : null;

  return (
    <div className={`bracket-card ${b.done ? 'completed' : ''}`} onClick={onClick}>
      <div className="head">
        <div>
          <div className="nm">{b.name}</div>
          <div className="meta">
            {b.done ? 'Submitted' : `${pct}% complete`} · {fmtDate(b.createdAt)}
          </div>
        </div>
        {b.done ? <span className="tag accent">Locked</span> : <span className="tag">Draft</span>}
      </div>
      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
      <div className="footer">
        <span className="muted">Groups {groupsDone}/12</span>
        {winner ? (
          <span className="winner-stack">
            <Flag team={winner} w={18} h={12} />
            <span className="mono" style={{ fontSize: 11 }}>{winner.code}</span>
          </span>
        ) : (
          <span className="muted mono" style={{ fontSize: 11 }}>NO WINNER</span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
