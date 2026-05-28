// Group stage picker — drag teams from a 4-team pool into 1st/2nd slots.
// HTML5 drag and drop. Tap-to-place fallback also wired for accessibility.

function GroupStage({ bracket, dispatch, nav }) {
  const [dragging, setDragging] = useState(null); // { code, fromGroup }
  const [over, setOver] = useState(null); // 'groupL-rk'

  const updatePick = (groupIdx, rk, code) => {
    dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => {
      const groups = b.groups.map((g, i) => i === groupIdx ? {
        ...g,
        // Place `code` at rank rk; if it already occupied another rank, swap.
        picks: (() => {
          const next = [...g.picks];
          const existingRk = next.indexOf(code);
          const displaced = next[rk];
          next[rk] = code;
          if (existingRk !== -1 && existingRk !== rk) next[existingRk] = displaced || null;
          return next;
        })(),
      } : g);
      return { ...b, groups };
    }});
  };

  const clearPick = (groupIdx, rk) => {
    dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({
      ...b,
      groups: b.groups.map((g, i) => i === groupIdx ? {
        ...g, picks: g.picks.map((p, j) => j === rk ? null : p),
      } : g),
    })});
  };

  const groupsDone = bracket.groups.filter(g => g.picks.every(Boolean)).length;
  const allDone = groupsDone === 12;

  const goNext = () => {
    if (!allDone) return;
    // Seed R32: cross-group pairings (1st of A vs 2nd of B, etc.)
    const r32 = {};
    bracket.groups.forEach((g, i) => {
      // Pair group i.1st with group (i+1 mod 12).2nd → 12 first-stage hosts; but
      // R32 needs 16. We'll use both placements + 8 best-3rds simulated.
    });
    dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({ ...b, step: Math.max(b.step, 1) }) });
    nav({ screen: 'knockout', bracketId: bracket.id });
  };

  return (
    <div className="main wide fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">{bracket.name} · Step 1 of 3</div>
          <h1 className="page-title">Group stage</h1>
          <div className="subtitle">
            Drag teams into rank slots — <strong>1st</strong> through <strong>4th</strong>. The top
            two advance directly; the 3rd-placed team is a best-of qualifier.
          </div>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => nav({ screen: 'dashboard' })}>← Save & exit</button>
          <button className="btn primary" disabled={!allDone} onClick={goNext}
            style={{ opacity: allDone ? 1 : 0.5, cursor: allDone ? 'pointer' : 'not-allowed' }}>
            Continue to knockout →
          </button>
        </div>
      </div>

      <Stepper steps={['Group stage', 'Knockout', 'Review & submit']} current={0} />

      <div className="gs-layout">
        <aside className="gs-rail">
          <h3>Progress</h3>
          <div className="h-sub">{groupsDone} / 12 groups complete</div>
          <div className="rail-progress">
            {bracket.groups.map(g => {
              const done = g.picks[0] && g.picks[1];
              return <div key={g.letter} className={`rp ${done ? 'done' : ''}`}>{g.letter}</div>;
            })}
          </div>
          <div className="rail-tip">
            <strong>How to pick.</strong> Each group has 4 teams. Rank them 1st–4th by dragging or
            tapping. <span style={{ color: 'var(--fg-3)' }}>Top 2 advance, 3rd is a best-of
            qualifier, 4th is out.</span>
          </div>
          <hr className="hr" />
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Scoring
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.6 }}>
            <div className="spread"><span>Group rank (exact position)</span><span className="mono">+1</span></div>
            <div className="spread"><span>R32 winner</span><span className="mono">+10</span></div>
            <div className="spread"><span>R16 winner</span><span className="mono">+20</span></div>
            <div className="spread"><span>Quarter-final</span><span className="mono">+40</span></div>
            <div className="spread"><span>Semi-final</span><span className="mono">+80</span></div>
            <div className="spread"><span>Champion</span><span className="mono">+160</span></div>
          </div>
        </aside>

        <div className="groups-grid">
          {bracket.groups.map((g, gi) => (
            <GroupCard
              key={g.letter}
              group={g}
              groupIdx={gi}
              dragging={dragging}
              setDragging={setDragging}
              over={over}
              setOver={setOver}
              onPick={updatePick}
              onClear={clearPick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group, groupIdx, dragging, setDragging, over, setOver, onPick, onClear }) {
  const teams = group.teams.map(c => window.WC_DATA.byCode[c]);
  const pickSet = new Set(group.picks.filter(Boolean));
  const complete = group.picks.every(Boolean);
  const unassigned = teams.filter(t => !pickSet.has(t.code));
  const RANK_LABELS = ['1st', '2nd', '3rd', '4th'];

  const handleClickTeam = (code) => {
    // tap-to-fill next empty rank
    if (pickSet.has(code)) return;
    const next = group.picks.findIndex(p => p == null);
    if (next >= 0) onPick(groupIdx, next, code);
  };

  return (
    <div className={`group ${complete ? 'complete' : ''}`}>
      <div className="gh">
        <div className="gl">{group.letter}</div>
        <div className="gt">Group {group.letter}</div>
        <div className="gs">{group.picks.filter(Boolean).length}/4</div>
      </div>

      <div className="slots stacked">
        {[0, 1, 2, 3].map(rk => {
          const code = group.picks[rk];
          const t = code ? window.WC_DATA.byCode[code] : null;
          const key = `${groupIdx}-${rk}`;
          const fateTag = rk < 2 ? 'ADV' : rk === 2 ? '3RD-Q' : 'OUT';
          return (
            <div key={rk}
              className={`slot rank-row ${t ? 'filled' : ''} ${over === key ? 'over' : ''} ${rk < 2 ? 'adv' : rk === 2 ? 'third' : 'out'}`}
              onDragOver={(e) => { e.preventDefault(); setOver(key); }}
              onDragLeave={() => setOver(o => o === key ? null : o)}
              onDrop={(e) => {
                e.preventDefault();
                const code = e.dataTransfer.getData('text/plain');
                if (code && group.teams.includes(code)) onPick(groupIdx, rk, code);
                setOver(null);
                setDragging(null);
              }}>
              <span className="rank-num">{RANK_LABELS[rk]}</span>
              {t ? (
                <div className="rank-team"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', t.code);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragging({ code: t.code, fromGroup: groupIdx });
                  }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}>
                  <Flag team={t} w={20} h={13} />
                  <span className="nm">{t.name}</span>
                  <button className="x" onClick={(e) => { e.stopPropagation(); onClear(groupIdx, rk); }} aria-label="clear">×</button>
                </div>
              ) : (
                <span className="rank-empty mono">drop a team</span>
              )}
              <span className={`rank-fate ${rk < 2 ? 'adv' : rk === 2 ? 'third' : 'out'}`}>{fateTag}</span>
            </div>
          );
        })}
      </div>

      <div className="pool">
        <div className="ph">
          {unassigned.length > 0 ? 'Unassigned' : <span style={{ color: 'var(--accent)' }}>✓ Group ranked</span>}
        </div>
        {unassigned.length > 0 && (
          <div className="pl">
            {unassigned.map(t => (
              <div key={t.code}
                className={`team-tile ${dragging?.code === t.code ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', t.code);
                  e.dataTransfer.effectAllowed = 'move';
                  setDragging({ code: t.code, fromGroup: groupIdx });
                }}
                onDragEnd={() => { setDragging(null); setOver(null); }}
                onClick={() => handleClickTeam(t.code)}>
                <Flag team={t} w={18} h={12} />
                <span className="nm">{t.name}</span>
                <span className="code">{t.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { GroupStage });
