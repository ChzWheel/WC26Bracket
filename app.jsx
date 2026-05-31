// app.jsx — Main app shell wired to Supabase auth + DB.

const { useState, useEffect, useReducer, useRef, useMemo, useCallback } = React;

// Apply default theme/font once on load
document.documentElement.dataset.theme = 'light';
document.documentElement.dataset.font  = 'geist';

// ── Globe loader ──────────────────────────────────────────
function Spinner({ message = 'Loading…' }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof d3 === 'undefined' || typeof topojson === 'undefined') return;

    const svgNS      = "http://www.w3.org/2000/svg";
    const svgEl      = root.querySelector('.gl-main-svg');
    const earthLayer = root.querySelector('.gl-earth-layer');
    const ballLayer  = root.querySelector('.gl-ball-layer');
    const landLayer  = root.querySelector('.gl-land-layer');
    const gratLayer  = root.querySelector('.gl-grat-layer');
    const sparkleGroup = root.querySelector('.gl-sparkle-group');

    let rafId, cancelled = false;

    (async () => {
      const projection = d3.geoOrthographic()
        .scale(92).translate([100, 100]).clipAngle(90).rotate([0, -18, 0]);
      const path = d3.geoPath(projection);

      const graticule = d3.geoGraticule10();
      const gratEl = document.createElementNS(svgNS, "path");
      gratEl.setAttribute("class", "globe-graticule");
      gratLayer.appendChild(gratEl);

      let land;
      try {
        const world = await fetch("https://unpkg.com/world-atlas@2.0.2/countries-110m.json").then(r => r.json());
        land = topojson.feature(world, world.objects.countries);
      } catch (e) { return; }
      if (cancelled) return;

      const countryPaths = land.features.map(f => {
        const p = document.createElementNS(svgNS, "path");
        p.setAttribute("class", "globe-land");
        landLayer.appendChild(p);
        return { feature: f, el: p };
      });

      const D2R = Math.PI / 180, R2D = 180 / Math.PI;
      const toV   = (lng, lat) => { const f=lat*D2R,l=lng*D2R; return [Math.cos(f)*Math.cos(l),Math.cos(f)*Math.sin(l),Math.sin(f)]; };
      const toLL  = v => [Math.atan2(v[1],v[0])*R2D, Math.asin(Math.max(-1,Math.min(1,v[2])))*R2D];
      const norm  = v => { const m=Math.hypot(v[0],v[1],v[2]); return [v[0]/m,v[1]/m,v[2]/m]; };
      const slerp = (a,b,t) => {
        let d=Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
        const w=Math.acos(d); if(w<1e-6) return a.slice();
        const s=Math.sin(w),k0=Math.sin((1-t)*w)/s,k1=Math.sin(t*w)/s;
        return [a[0]*k0+b[0]*k1,a[1]*k0+b[1]*k1,a[2]*k0+b[2]*k1];
      };
      const dest = (lng,lat,brg,dist) => {
        const f=lat*D2R,l=lng*D2R,th=brg*D2R,dl=dist*D2R;
        const C=toV(lng,lat),E=norm([-Math.sin(l),Math.cos(l),0]);
        const N=[-Math.sin(f)*Math.cos(l),-Math.sin(f)*Math.sin(l),Math.cos(f)];
        const dir=[Math.cos(th)*N[0]+Math.sin(th)*E[0],Math.cos(th)*N[1]+Math.sin(th)*E[1],Math.cos(th)*N[2]+Math.sin(th)*E[2]];
        return [C[0]*Math.cos(dl)+dir[0]*Math.sin(dl),C[1]*Math.cos(dl)+dir[1]*Math.sin(dl),C[2]*Math.cos(dl)+dir[2]*Math.sin(dl)];
      };
      const RADIUS = 22;
      function pentagon(cLng, cLat, orient) {
        const verts = [];
        for (let k=0;k<5;k++) {
          const th=orient+k*72;
          if(cLat>89.99) verts.push(toV(th,90-RADIUS));
          else if(cLat<-89.99) verts.push(toV(th,-90+RADIUS));
          else verts.push(dest(cLng,cLat,th,RADIUS));
        }
        const ring=[],SEG=8;
        for(let i=0;i<5;i++){const a=verts[i],b=verts[(i+1)%5];for(let s=0;s<SEG;s++) ring.push(toLL(norm(slerp(a,b,s/SEG))));}
        ring.push(ring[0]);
        const feat={type:"Feature",geometry:{type:"Polygon",coordinates:[ring]}};
        if(d3.geoArea(feat)>2*Math.PI) ring.reverse();
        return feat;
      }
      const UP=R2D*Math.atan(0.5);
      const centres=[{lng:0,lat:90,o:0},{lng:0,lat:-90,o:36}];
      for(let i=0;i<5;i++){centres.push({lng:i*72,lat:UP,o:0});centres.push({lng:36+i*72,lat:-UP,o:180});}
      const ballPaths = centres.map(c => {
        const p=document.createElementNS(svgNS,"path");p.setAttribute("class","ball-pentagon");ballLayer.appendChild(p);return{feature:pentagon(c.lng,c.lat,c.o),el:p};
      });

      const REV=360,spinDur=1.55,hold=0.16,morph=0.34;
      const tl=[
        {dur:spinDur,rot:REV,surf:"earth"},{dur:hold,rot:0,surf:"earth"},
        {dur:morph,rot:0,from:"earth",to:"ball"},{dur:hold,rot:0,surf:"ball"},
        {dur:spinDur,rot:REV,surf:"ball"},{dur:hold,rot:0,surf:"ball"},
        {dur:morph,rot:0,from:"ball",to:"earth"},{dur:hold,rot:0,surf:"earth"}
      ];
      const total=tl.reduce((s,seg)=>s+seg.dur,0);
      const starts=[];let acc=0,rotAcc=0;
      for(const seg of tl){starts.push({t:acc,rot:rotAcc});acc+=seg.dur;rotAcc+=seg.rot;}
      const easeRot=p=>(p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2);
      const smooth=p=>p*p*(3-2*p);

      const sparkleD=(cx,cy,r)=>{const i=r*0.16;return `M${cx},${cy-r}L${cx+i},${cy-i}L${cx+r},${cy}L${cx+i},${cy+i}L${cx},${cy+r}L${cx-i},${cy+i}L${cx-r},${cy}L${cx-i},${cy-i}Z`;};
      const SPARKLES=11,sparklePool=[];
      const rand=(a,b)=>a+Math.random()*(b-a);
      for(let k=0;k<SPARKLES;k++){const el=document.createElementNS(svgNS,"path");el.setAttribute("class","sparkle");sparkleGroup.appendChild(el);sparklePool.push(el);}
      function sparkleBurst(){
        for(let k=0;k<SPARKLES;k++){
          const el=sparklePool[k];
          const ang=(k/SPARKLES)*2*Math.PI+rand(-0.35,0.35),dist=rand(102,126);
          const cx=100+Math.cos(ang)*dist,cy=100+Math.sin(ang)*dist,r=rand(3.5,8);
          el.setAttribute("d",sparkleD(cx,cy,r));
          el.animate([{offset:0,opacity:0},{offset:0.2,opacity:1},{offset:0.6,opacity:1},{offset:1,opacity:0}],{duration:rand(950,1300),delay:rand(0,200),easing:"ease-in-out",fill:"forwards"});
        }
      }

      let prevIdx=-1;
      const t0=performance.now();
      function frame(now){
        if(cancelled) return;
        const tt=((now-t0)/1000)%total;
        let idx=0;for(let i=0;i<tl.length;i++) if(tt>=starts[i].t) idx=i;
        const seg=tl[idx],local=(tt-starts[idx].t)/seg.dur;
        if(idx!==prevIdx){prevIdx=idx;if(seg.from) sparkleBurst();}
        const lambda=starts[idx].rot+seg.rot*easeRot(Math.min(1,local));
        projection.rotate([lambda,-18,0]);
        let eOp,bOp,scale=1;
        if(seg.from){const p=smooth(local);eOp=seg.from==="earth"?1-p:p;bOp=seg.from==="ball"?1-p:p;scale=1+0.085*Math.sin(Math.PI*local);}
        else{eOp=seg.surf==="earth"?1:0;bOp=seg.surf==="ball"?1:0;}
        earthLayer.style.opacity=eOp;
        ballLayer.style.opacity=bOp;
        svgEl.style.transform=scale===1?"":`scale(${scale})`;
        if(eOp>0.001){gratEl.setAttribute("d",path(graticule)||"");for(const{feature,el}of countryPaths)el.setAttribute("d",path(feature)||"");}
        if(bOp>0.001){for(const{feature,el}of ballPaths)el.setAttribute("d",path(feature)||"");}
        rafId=requestAnimationFrame(frame);
      }
      rafId=requestAnimationFrame(frame);
    })();

    return () => { cancelled=true; if(rafId) cancelAnimationFrame(rafId); };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="globe-loader" ref={rootRef} aria-label="Loading" role="status">
          <svg className="sparkle-layer" viewBox="0 0 200 200" aria-hidden="true">
            <g className="gl-sparkle-group"></g>
          </svg>
          <svg className="gl-main-svg" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="globe-sphere" cx="100" cy="100" r="92"></circle>
            <g className="gl-earth-layer">
              <g className="gl-grat-layer"></g>
              <g className="gl-land-layer"></g>
            </g>
            <g className="gl-ball-layer"></g>
          </svg>
        </div>
        <div className="muted mono" style={{ fontSize: 12, marginTop: 16 }}>{message}</div>
      </div>
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
  // Tracks which user ID we've already fetched data for. Using a ref so the
  // auth listener closure always reads the current value without stale-closure issues.
  const loadedForRef = useRef(null);

  useEffect(() => {
    window.history.replaceState({ screen: 'dashboard' }, '');
    window.__nav = (r) => { window.history.pushState(r, ''); setRoute(r); };
    const onPop = (e) => setRoute(e.state || { screen: 'dashboard' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Auth listener ─────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = window.SB.Auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        // Only fetch data once per unique user. Supabase fires SIGNED_IN (and
        // sometimes TOKEN_REFRESHED) on every tab-visibility change, which would
        // otherwise reset loading and re-fetch unnecessarily.
        if (loadedForRef.current !== session.user.id) {
          loadedForRef.current = session.user.id;
          await loadUserData(session.user);
        }
      } else {
        loadedForRef.current = null; // reset so next sign-in loads fresh data
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
      isOwner: row.owner_id === myUserId,
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

    async deletePool(poolId) {
      await window.SB.Pools.deletePool(poolId);
      setPools(prev => prev.filter(p => p.id !== poolId));
      setBrackets(prev => prev.map(b =>
        b.submittedTo === poolId ? { ...b, submittedTo: null, submittedAt: null } : b
      ));
    },

    async leave(poolId) {
      await window.SB.Pools.leave(poolId, authUser.id);
      setPools(prev => prev.filter(p => p.id !== poolId));
      setBrackets(prev => prev.map(b =>
        b.submittedTo === poolId ? { ...b, submittedTo: null, submittedAt: null } : b
      ));
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
        case 'DELETE_POOL': {
          await poolOps.deletePool(action.poolId);
          nav({ screen: 'dashboard' });
          break;
        }
        case 'LEAVE_POOL': {
          await poolOps.leave(action.poolId);
          nav({ screen: 'dashboard' });
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

  const nav = (r) => {
    window.history.pushState(r, '');
    window.scrollTo(0, 0);
    const titles = {
      'dashboard':   'Dashboard',
      'brackets':    'My Brackets',
      'group-stage': 'Group Stage',
      'knockout':    'Knockout',
      'summary':     'Review & Submit',
      'pool':        'Pool',
      'schedule':    'Schedule',
      'standings':   'Standings',
      'admin':       'Admin',
    };
    document.title = `${titles[r.screen] || 'Brackt'} · Brackt WC '26`;
    setRoute(r);
  };

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
    case 'brackets':
      screen = <BracketList state={state} dispatch={dispatch} nav={nav} />;
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
        ? <PoolDetail pool={activePool} user={user} state={state} dispatch={dispatch} nav={nav} isAdmin={isAdmin} />
        : <NotFound nav={nav} />;
      break;
    case 'schedule':
      screen = <Schedule nav={nav} />;
      break;
    case 'standings':
      screen = <Standings nav={nav} />;
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
  const [helpOpen, setHelpOpen] = useState(false);

  const active = (r) => route.screen === r ||
    (r === 'pools'     && route.screen === 'pool') ||
    (r === 'schedule'  && route.screen === 'schedule') ||
    (r === 'standings' && route.screen === 'standings') ||
    (r === 'brackets'  && ['brackets','group-stage','knockout','summary'].includes(route.screen));

  return (
    <>
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
          onClick={() => nav({ screen: 'brackets' })}>
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
        <button className={active('standings') ? 'active' : ''}
          onClick={() => nav({ screen: 'standings' })}>
          Standings
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
        <button className="help-btn" onClick={() => setHelpOpen(true)} title="Bracket help">?</button>
        <span className="av">{user.avatar}</span>
        <span>{user.name}</span>
        <button className="signout" onClick={() => {
          if (confirm('Sign out?')) dispatch({ type: 'SIGN_OUT' });
        }}>
          Sign out
        </button>
      </div>
    </header>
    {helpOpen && (
      <Modal title="Bracket deadlines & scoring" onClose={() => setHelpOpen(false)}>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-2)' }}>
          <p style={{ margin: '0 0 14px' }}>
            Picks are open for editing until the matches they cover begin.
          </p>
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>
                Group stage — <strong>midnight CDT, June 11, 2026</strong>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                The first match kicks off June 11. Group picks lock at this moment and cannot be changed.
              </div>
            </div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>
                Knockout stage — <strong>noon CDT, June 28, 2026</strong>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                The Round of 32 begins June 27–28. Knockout picks (R32 through the Final) lock at noon CDT on June 28.
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Scoring</div>
            <div style={{ display: 'grid', gap: 4, fontSize: 12 }}>
              <div className="spread"><span>Group rank (exact position)</span><span className="mono">+1 pt</span></div>
              <div className="spread"><span>3rd-place qualifier advance</span><span className="mono">+5 pts</span></div>
              <div className="spread"><span>Round of 32 winner</span><span className="mono">+10 pts</span></div>
              <div className="spread"><span>Round of 16 winner</span><span className="mono">+20 pts</span></div>
              <div className="spread"><span>Quarter-final winner</span><span className="mono">+40 pts</span></div>
              <div className="spread"><span>Semi-final winner</span><span className="mono">+80 pts</span></div>
              <div className="spread"><span>Champion (correct)</span><span className="mono">+160 pts</span></div>
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setHelpOpen(false)}>Got it</button>
        </div>
      </Modal>
    )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
