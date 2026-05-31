// admin.jsx — Admin panel: sync scores, manual overrides, lock brackets.

function AdminPanel({ user, nav }) {
  const [matches, setMatches]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [syncingLive, setSyncingLive] = useState(false);
  const [syncMsg, setSyncMsg]     = useState('');
  const [editMatch, setEditMatch] = useState(null);
  const [locked, setLocked]       = useState(false);

  useEffect(() => {
    loadMatches();
    loadSettings();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await window.SB.Matches.getAll();
      setMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await window.SB.sb.from('app_settings')
        .select('value').eq('key', 'brackets_locked').single();
      setLocked(!!data?.value);
    } catch (e) {}
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const count = await window.SB.Admin.syncMatches();
      setSyncMsg(`✓ Synced ${count} matches from API-Football.`);
      await loadMatches();
    } catch (e) {
      setSyncMsg(`✗ Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const syncLiveNow = async () => {
    setSyncingLive(true);
    setSyncMsg('');
    try {
      const rows = await window.SB.Matches.syncLive();
      setSyncMsg(rows.length
        ? `✓ Updated ${rows.length} live match${rows.length === 1 ? '' : 'es'}.`
        : '✓ No live matches right now.');
      if (rows.length) await loadMatches();
    } catch (e) {
      setSyncMsg(`✗ Live sync failed: ${e.message}`);
    } finally {
      setSyncingLive(false);
    }
  };

  const toggleLock = async () => {
    const next = !locked;
    await window.SB.Admin.lockBrackets(next);
    setLocked(next);
  };

  const saveEdit = async () => {
    if (!editMatch) return;
    await window.SB.Admin.setMatchScore(
      editMatch.id,
      Number(editMatch.home_score),
      Number(editMatch.away_score),
      editMatch.status,
    );
    setEditMatch(null);
    await loadMatches();
  };

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    matches.forEach(m => {
      const day = m.kickoff ? m.kickoff.slice(0, 10) : 'unknown';
      if (!map[day]) map[day] = [];
      map[day].push(m);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  const statusColor = { ft: 'var(--fg-3)', live: 'oklch(0.62 0.22 25)', ht: 'var(--gold)', upcoming: 'var(--fg-2)' };

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Admin Panel</div>
          <h1 className="page-title">Score management</h1>
          <div className="subtitle">
            Live scores auto-sync every 15 min during match hours via Netlify.
            Use the buttons below for a full sync or to trigger an immediate live update.
          </div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => nav({ screen: 'dashboard' })}>← Dashboard</button>
        </div>
      </div>

      {/* ── Control strip ── */}
      <div className="card padded" style={{ marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn accent" onClick={syncNow} disabled={syncing || syncingLive}>
          {syncing ? '⟳ Syncing…' : '⟳ Full sync'}
        </button>
        <button className="btn" onClick={syncLiveNow} disabled={syncing || syncingLive}
          style={{ background: 'color-mix(in oklch, oklch(0.62 0.22 25) 15%, var(--bg))', border: '1px solid oklch(0.62 0.22 25)', color: 'oklch(0.62 0.22 25)' }}>
          {syncingLive ? '⟳ Syncing live…' : '⟳ Sync live now'}
        </button>
        <button className={`btn ${locked ? 'primary' : ''}`} onClick={toggleLock}>
          {locked ? '🔒 Brackets locked — click to unlock' : '🔓 Brackets open — click to lock'}
        </button>
        <div className="muted mono" style={{ fontSize: 11 }}>
          Last sync: {matches[0]?.synced_at ? new Date(matches[0].synced_at).toLocaleString() : 'Never'}
        </div>
        {syncMsg && (
          <div style={{
            fontSize: 13, padding: '6px 12px', borderRadius: 'var(--r-md)',
            background: syncMsg.startsWith('✓') ? 'color-mix(in oklch, var(--accent) 15%, var(--bg))' : 'color-mix(in oklch, var(--danger) 15%, var(--bg))',
            border: `1px solid ${syncMsg.startsWith('✓') ? 'var(--accent)' : 'var(--danger)'}`,
            color: syncMsg.startsWith('✓') ? 'var(--accent-ink)' : 'var(--danger)',
          }}>
            {syncMsg}
          </div>
        )}
      </div>

      {/* ── No matches yet ── */}
      {!loading && matches.length === 0 && (
        <div className="card padded" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No matches yet</div>
          <div className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
            Click "Sync from API-Football" to pull the WC 2026 fixture list.<br />
            If the tournament isn't in the API yet, you can add matches manually.
          </div>
        </div>
      )}

      {/* ── Match list ── */}
      {loading ? (
        <div className="muted mono" style={{ fontSize: 12, padding: 20 }}>Loading matches…</div>
      ) : (
        grouped.map(([day, dayMatches]) => (
          <div key={day} style={{ marginBottom: 24 }}>
            <div className="sched-section-head">
              <h2>{new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <span className="muted mono" style={{ fontSize: 11 }}>{dayMatches.length} matches</span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {dayMatches.map(m => (
                <div key={m.id} className="card" style={{
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr auto 1fr auto auto',
                  gap: 12,
                  alignItems: 'center',
                }}>
                  <span className="mono" style={{ fontSize: 11, color: statusColor[m.status] || 'var(--fg-3)' }}>
                    {m.status?.toUpperCase()} {m.minute ? `${m.minute}'` : ''}
                  </span>
                  <div style={{ fontWeight: 500, fontSize: 13, textAlign: 'right' }}>
                    {m.home_name || m.home_code}
                  </div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700, minWidth: 60, textAlign: 'center' }}>
                    {m.home_score ?? '—'} – {m.away_score ?? '—'}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {m.away_name || m.away_code}
                  </div>
                  <span className="tag muted" style={{ fontSize: 10 }}>{m.group_label}</span>
                  <button className="btn sm" onClick={() => setEditMatch({ ...m })}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── Edit modal ── */}
      {editMatch && (
        <Modal
          title={`Edit: ${editMatch.home_name || editMatch.home_code} vs ${editMatch.away_name || editMatch.away_code}`}
          onClose={() => setEditMatch(null)}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
              <label className="field">
                <span className="lbl">{editMatch.home_name || editMatch.home_code}</span>
                <input className="input mono" type="number" min="0" max="20"
                  value={editMatch.home_score ?? ''}
                  onChange={(e) => setEditMatch(m => ({ ...m, home_score: e.target.value }))} />
              </label>
              <span className="muted" style={{ paddingTop: 20 }}>–</span>
              <label className="field">
                <span className="lbl">{editMatch.away_name || editMatch.away_code}</span>
                <input className="input mono" type="number" min="0" max="20"
                  value={editMatch.away_score ?? ''}
                  onChange={(e) => setEditMatch(m => ({ ...m, away_score: e.target.value }))} />
              </label>
            </div>
            <label className="field">
              <span className="lbl">Status</span>
              <select className="select" value={editMatch.status}
                onChange={(e) => setEditMatch(m => ({ ...m, status: e.target.value }))}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="ht">Half time</option>
                <option value="ft">Full time</option>
              </select>
            </label>
            {editMatch.status === 'live' && (
              <label className="field">
                <span className="lbl">Minute</span>
                <input className="input mono" type="number" min="1" max="120"
                  value={editMatch.minute ?? ''}
                  onChange={(e) => setEditMatch(m => ({ ...m, minute: e.target.value }))} />
              </label>
            )}
          </div>
          <div className="actions">
            <button className="btn ghost" onClick={() => setEditMatch(null)}>Cancel</button>
            <button className="btn primary" onClick={saveEdit}>Save score</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { AdminPanel });
