// app.jsx — Main app shell wired to Supabase auth + DB.

const { useState, useEffect, useReducer, useRef, useMemo, useCallback } = React;

// Apply default theme/font once on load
document.documentElement.dataset.theme = 'light';
document.documentElement.dataset.font  = 'geist';

// ── Loading spinner ───────────────────────────────────────
function Spinner({ message = 'Loading…' }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid var(--line)',
          borderTopColor: 'var(--fg)',
          animation: 'spin 0.7s linear infinite',
          margin: '0 auto 12px',
        }} />
        <div className="muted mono" style={{ fontSize: 12 }}>{message}</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
function App() {
  const [authUser, setAuthUser] = useState(undefined); // undefined = loading
  const [profile, setProfile]   = useState(null);
  const [brackets, setBrackets] = useState([]);
  const [pools, setPools]       = useState([]);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [route, setRoute]       = useState({ screen: 'dashboard' });
  const [loading, setLoading]   = useState(true);

  useEffect(() => { window.__nav = setRoute; }, []);

  // ── Auth listener ─────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = window.SB.Auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        await loadUserData(session.user);
      } else {
        setAuthUser(null);
        setProfile(null);
        setBrackets([]);
        setPools([]);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (user) => {
    setLoading(true);
    try {
      const [prof, bracks, poolList, adminFlag] = await Promise.all([
        window.SB.Profiles.get(user.id),
        window.SB.Brackets.list(user.id),
        window.SB.Pools.listForUser(user.id),
        window.SB.Admin.isAdmin(user.id),
      ]);
      setProfile(prof);
      setBrackets(bracks.map(normalizeBracket));
      setPools(poolList.map(p => normalizePool(p, user.id, prof)));
      setIsAdmin(adminFlag);
    } catch (e) {
      console.error('loadUserData error', e);
    } finally {
      setLoading(false);
    }
  };

  function normalizeBracket(row) {
    return {
      id:          row.id,
      name:        row.name,
      createdAt:   new Date(row.created_at).getTime(),
      groups:      row.groups,
      knockout:    row.knockout,
      step:        row.step,
      done:        row.done,
      submittedTo: row.submitted_to,
      submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    };
  }

  function normalizePool(row, myUserId, prof) {
    const members = (row.pool_members || []).map(m => ({
      id:     m.user_id,
      name:   m.profiles?.name || 'Unknown',
      avatar: m.profiles?.avatar || '??',
      score:  m.score || 0,
      you:    m.user_id === myUserId,
    }));
    return {
      id:      row.id,
      name:    row.name,
      code:    row.code,
      owner:   row.owner_id === myUserId ? (prof?.name || 'You') : 'Other',
      members,
    };
  }

  // ── Bracket mutations ─────────────────────────────────
  const bracketOps = {
    async add(name) {
      const groups = window.WC_DATA.buildSeededGroups().map(g => ({
        ...g, picks: [null, null, null, null],
      }));
      const row = await window.SB.Brackets.create(authUser.id, name, groups);
      const b = normalizeBracket(row);
      setBrackets(prev => [...prev, b]);
      return b;
    },

    async update(id, patch) {
      const dbPatch = {};
      if ('groups'      in patch) dbPatch.groups       = patch.groups;
      if ('knockout'    in patch) dbPatch.knockout      = patch.knockout;
      if ('step'        in patch) dbPatch.step          = patch.step;
      if ('done'        in patch) dbPatch.done          = patch.done;
      if ('submittedTo' in patch) dbPatch.submitted_to  = patch.submittedTo;
      if ('submittedAt' in patch) dbPatch.submitted_at  = patch.submittedAt
        ? new Date(patch.submittedAt).toISOString() : null;
      const row = await window.SB.Brackets.update(id, dbPatch);
      const b = normalizeBracket(row);
      setBrackets(prev => prev.map(x => x.id === id ? b : x));
      return b;
    },

    async delete(id) {
      await window.SB.Brackets.delete(id);
      setBrackets(prev => prev.filter(x => x.id !== id));
    },
  };

  // ── Pool mutations ────────────────────────────────────
  const poolOps = {
    async create(poolName) {
      const pool = await window.SB.Pools.create(authUser.id, profile?.name, poolName);
      const full = await window.SB.Pools.getWithMembers(pool.id);
      setPools(prev => [...prev, normalizePool(full, authUser.id, profile)]);
      return pool;
    },

    async join(code) {
      const pool = await window.SB.Pools.join(authUser.id, code);
      const full = await window.SB.Pools.getWithMembers(pool.id);
      setPools(prev => {
        if (prev.find(p => p.id === pool.id)) return prev;
        return [...prev, normalizePool(full, authUser.id, profile)];
      });
      return pool;
    },

    async refresh(poolId) {
      const full = await window.SB.Pools.getWithMembers(poolId);
      setPools(prev => prev.map(p => p.id === poolId ? normalizePool(full, authUser.id, profile) : p));
    },
  };

  // ── dispatch shim ─────────────────────────────────────
  const dispatch = useCallback(async (action) => {
    try {
      switch (action.type) {
        case 'ADD_BRACKET': {
          const b = await bracketOps.add(action.bracket.name);
          action._resolve?.(b);
          break;
        }
        case 'UPDATE_BRACKET': {
          const current = brackets.find(x => x.id === action.id);
          if (!current) break;
          const next = typeof action.patch === 'function'
            ? action.patch(current)
            : { ...current, ...action.patch };
          setBrackets(prev => prev.map(x => x.id === action.id ? next : x));
          await bracketOps.update(action.id, next);
          break;
        }
        case 'DELETE_BRACKET': {
          await bracketOps.delete(action.id);
          break;
        }
        case 'ADD_POOL': {
          const p = await poolOps.create(action.pool.name);
          action._resolve?.(p);
          break;
        }
        case 'JOIN_POOL': {
          const p = await poolOps.join(action.code);
          action._resolve?.(p);
          break;
        }
        case 'POOL_SUBMIT': {
          await poolOps.refresh(action.poolId);
          break;
        }
        case 'SIGN_OUT': {
          await window.SB.Auth.signOut();
          setRoute({ screen: 'dashboard' });
          break;
        }
        default:
          console.warn('Unhandled dispatch action:', action.type);
      }
    } catch (e) {
      console.error('dispatch error:', action.type, e);
      alert(`Error: ${e.message}`);
    }
  }, [brackets, authUser]);

  const nav = (r) => setRoute(r);

  // ── Render ────────────────────────────────────────────
  if (authUser === undefined || loading) return <Spinner message="Loading Brackt…" />;

  if (!authUser) {
    return (
      <SignIn
        onSignIn={async ({ name, email, password, isNew }) => {
          if (isNew) {
            await window.SB.Auth.signUp(email, password, name);
          } else {
            await window.SB.Auth.signIn(email, password);
          }
        }}
      />
    );
  }

  const user = {
    name:   profile?.name   || authUser.email,
    avatar: profile?.avatar || '??',
    id:     authUser.id,
    email:  authUser.email,
  };

  const state = { user, brackets, pools };
  const activeBracket = route.bracketId ? brackets.find(b => b.id === route.bracketId) : null;
  const activePool    = route.poolId    ? pools.find(p => p.id === route.poolId)        : null;

  let screen = null;
  switch (route.screen) {
    case 'dashboard':
      screen = <Dashboard user={user} state={state} dispatch={dispatch} nav={nav} />;
      break;
    case 'group-stage':
      screen = activeBracket
        ? <GroupStage bracket={activeBracket} dispatch={dispatch} nav={nav} />
        : <NotFound nav={nav} />;
      break;
    case 'knockout':
      screen = activeBracket
        ? <Knockout bracket={activeBracket} dispatch={dispatch} nav={nav} />
        : <NotFound nav={nav} />;
      break;
    case 'summary':
      screen = activeBracket
        ? <Summary bracket={activeBracket} dispatch={dispatch} nav={nav} state={state} />
        : <NotFound nav={nav} />;
      break;
    case 'pool':
      screen = activePool
        ? <PoolDetail pool={activePool} user={user} state={state} dispatch={dispatch} nav={nav} />
        : <NotFound nav={nav} />;
      break;
    case 'schedule':
      screen = <Schedule nav={nav} />;
      break;
    case 'admin':
      screen = isAdmin
        ? <AdminPanel user={user} nav={nav} />
        : <NotFound nav={nav} />;
      break;
    default:
      screen = <NotFound nav={nav} />;
  }

  return (
    <div className="app">
      <TopBar user={user} route={route} nav={nav}
        dispatch={dispatch} pools={pools} brackets={brackets} isAdmin={isAdmin} />
      {screen}
    </div>
  );
}

// ── NotFound ──────────────────────────────────────────────
function NotFound({ nav }) {
  return (
    <div className="main fade-in">
      <div className="card padded" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Not found</div>
        <div className="muted" style={{ marginBottom: 16 }}>This item doesn't exist anymore.</div>
        <button className="btn primary" onClick={() => nav({ screen: 'dashboard' })}>← Dashboard</button>
      </div>
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────
function TopBar({ user, route, nav, dispatch, pools, brackets, isAdmin }) {
  const active = (r) => route.screen === r ||
    (r === 'pools'    && route.screen === 'pool') ||
    (r === 'schedule' && route.screen === 'schedule') ||
    (r === 'brackets' && ['group-stage','knockout','summary'].includes(route.screen));

  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark"></span>
        <span>Brackt</span>
        <span className="tag muted" style={{ marginLeft: 6 }}>WC '26</span>
      </div>
      <nav className="nav">
        <button className={active('dashboard') ? 'active' : ''} onClick={() => nav({ screen: 'dashboard' })}>
          Dashboard
        </button>
        <button className={active('brackets') ? 'active' : ''}
          onClick={() => {
            const last = brackets[brackets.length - 1];
            if (last) nav({ screen: last.step >= 2 ? 'summary' : (last.step === 1 ? 'knockout' : 'group-stage'), bracketId: last.id });
            else nav({ screen: 'dashboard' });
          }}>
          Brackets <span className="mono muted" style={{ fontSize: 10, marginLeft: 4 }}>{brackets.length}</span>
        </button>
        <button className={active('pools') ? 'active' : ''}
          onClick={() => {
            if (pools[0]) nav({ screen: 'pool', poolId: pools[0].id });
            else nav({ screen: 'dashboard' });
          }}>
          Pools <span className="mono muted" style={{ fontSize: 10, marginLeft: 4 }}>{pools.length}</span>
        </button>
        <button className={active('schedule') ? 'active' : ''}
          onClick={() => nav({ screen: 'schedule' })}>
          Schedule <span className="live-dot sm inline" />
        </button>
        {isAdmin && (
          <button className={active('admin') ? 'active' : ''}
            onClick={() => nav({ screen: 'admin' })}
            style={{ color: 'var(--accent-ink)', background: 'color-mix(in oklch, var(--accent) 20%, var(--bg))' }}>
            ⚙ Admin
          </button>
        )}
      </nav>
      <div className="user-chip">
        <span className="av">{user.avatar}</span>
        <span>{user.name}</span>
        <button className="signout" onClick={() => {
          if (confirm('Sign out?')) dispatch({ type: 'SIGN_OUT' });
        }}>
          Sign out
        </button>
      </div>
    </header>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
