// Brackets list — shows all of the user's brackets with create / delete actions.

function BracketList({ state, dispatch, nav }) {
  const [modal, setModal]           = useState(false);
  const [bracketName, setBracketName] = useState('');
  const [guestName, setGuestName]   = useState('');
  const [busy, setBusy]             = useState(false);
  const [err, setErr]               = useState('');
  const [deleting, setDeleting]     = useState(null);

  const brackets = state.brackets || [];

  const openBracket = (b) => {
    const screen = b.step >= 2 ? 'summary' : (b.step === 1 ? 'knockout' : 'group-stage');
    nav({ screen, bracketId: b.id });
  };

  const createBracket = async () => {
    setBusy(true); setErr('');
    try {
      const id = await new Promise((resolve, reject) => {
        dispatch({
          type: 'ADD_BRACKET',
          bracket: {
            name: bracketName.trim() || `My Bracket ${brackets.length + 1}`,
            guestName: guestName.trim() || null,
          },
          _resolve: (b) => resolve(b.id),
        }).catch(reject);
      });
      setModal(false); setBracketName(''); setGuestName('');
      nav({ screen: 'group-stage', bracketId: id });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="main fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Brackets</div>
          <h1 className="page-title">My Brackets</h1>
          <div className="subtitle">
            Build up to 10 brackets — including guest brackets for friends and family
            without accounts — and submit them to pools.
          </div>
        </div>
        {brackets.length < 10 && (
          <button className="btn accent" onClick={() => setModal(true)}>
            + New bracket
          </button>
        )}
      </div>

      {brackets.length === 0 ? (
        <div className="card padded" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No brackets yet</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            Create your first bracket to get started.
          </div>
          <button className="btn accent" onClick={() => setModal(true)}>
            + Create bracket
          </button>
        </div>
      ) : (
        <div className="bracket-grid">
          {brackets.map(b => (
            <BracketCard key={b.id} b={b}
              onClick={() => openBracket(b)}
              onDelete={() => setDeleting(b)}
            />
          ))}
          {brackets.length < 10 && (
            <button className="bracket-card new" onClick={() => setModal(true)}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 300, marginBottom: 4 }}>+</div>
                <div style={{ fontSize: 13 }}>New bracket</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>
                  Up to 10 per account — incl. guest brackets
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {modal && (
        <Modal title="Create a new bracket"
          body="Pick group stage outcomes, then build the knockout tree."
          onClose={() => { setModal(false); setErr(''); setGuestName(''); }}>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <label className="field">
            <span className="lbl">Bracket name</span>
            <input className="input" autoFocus value={bracketName}
              onChange={(e) => setBracketName(e.target.value)}
              placeholder={`My Bracket ${brackets.length + 1}`}
              onKeyDown={(e) => e.key === 'Enter' && createBracket()} />
          </label>
          <label className="field">
            <span className="lbl">For someone else? (optional)</span>
            <input className="input" value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Grandma — no account needed"
              onKeyDown={(e) => e.key === 'Enter' && createBracket()} />
            <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Their name shows as the bracket's owner on pool leaderboards. You manage their picks.
            </span>
          </label>
          <div className="actions">
            <button className="btn ghost" onClick={() => { setModal(false); setErr(''); setGuestName(''); }}>Cancel</button>
            <button className="btn primary" onClick={createBracket} disabled={busy}>
              {busy ? 'Creating…' : 'Create bracket →'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <div className="modal-bg" onClick={() => setDeleting(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete "{deleting.name}"?</h3>
            <p>
              {deleting.submittedTo
                ? 'This bracket is submitted to a pool. Deleting it will remove it from the pool leaderboard.'
                : 'This bracket will be permanently deleted.'}
              {' '}This cannot be undone.
            </p>
            <div className="actions">
              <button className="btn ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn danger" onClick={() => {
                dispatch({ type: 'DELETE_BRACKET', id: deleting.id });
                setDeleting(null);
              }}>
                Delete bracket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BracketList });
