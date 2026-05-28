// Knockout bracket — 32 → 16 → 8 → 4 → 2 → 1, classic left-to-right tree.
// Clicking a team in a match picks them as the winner; advances automatically.

(function () {
  // R32 seeding template — 16 matches × 2 source slots.
  // Each source is { kind, ...meta }:
  //   { kind:'group', letter:'A', rank:0|1 }  → group winner / runner-up
  //   { kind:'third', idx:0..7 }              → best-3rds (auto-derived)
  const R32_SEED = [
    [{ kind: 'group', letter: 'A', rank: 0 }, { kind: 'third', idx: 0 }],
    [{ kind: 'group', letter: 'B', rank: 0 }, { kind: 'group', letter: 'C', rank: 1 }],
    [{ kind: 'group', letter: 'C', rank: 0 }, { kind: 'third', idx: 1 }],
    [{ kind: 'group', letter: 'D', rank: 0 }, { kind: 'group', letter: 'A', rank: 1 }],
    [{ kind: 'group', letter: 'E', rank: 0 }, { kind: 'third', idx: 2 }],
    [{ kind: 'group', letter: 'F', rank: 0 }, { kind: 'group', letter: 'G', rank: 1 }],
    [{ kind: 'group', letter: 'G', rank: 0 }, { kind: 'third', idx: 3 }],
    [{ kind: 'group', letter: 'H', rank: 0 }, { kind: 'group', letter: 'E', rank: 1 }],
    [{ kind: 'group', letter: 'I', rank: 0 }, { kind: 'third', idx: 4 }],
    [{ kind: 'group', letter: 'J', rank: 0 }, { kind: 'group', letter: 'K', rank: 1 }],
    [{ kind: 'group', letter: 'K', rank: 0 }, { kind: 'third', idx: 5 }],
    [{ kind: 'group', letter: 'L', rank: 0 }, { kind: 'group', letter: 'I', rank: 1 }],
    [{ kind: 'group', letter: 'B', rank: 1 }, { kind: 'third', idx: 6 }],
    [{ kind: 'group', letter: 'D', rank: 1 }, { kind: 'group', letter: 'J', rank: 1 }],
    [{ kind: 'group', letter: 'F', rank: 1 }, { kind: 'third', idx: 7 }],
    [{ kind: 'group', letter: 'H', rank: 1 }, { kind: 'group', letter: 'L', rank: 1 }],
  ];
  // 8 best-3rds: take the 3rd-ranked pick from groups A–H.
  const THIRD_GROUPS = 'ABCDEFGH'.split('');

  function getThirdCode(bracket, idx) {
    const letter = THIRD_GROUPS[idx];
    const g = bracket.groups.find(x => x.letter === letter);
    return g?.picks[2] || null;
  }

  function resolveSlot(bracket, round, matchIdx, slot) {
    if (round === 'r32') {
      const src = R32_SEED[matchIdx][slot];
      if (src.kind === 'group') {
        const g = bracket.groups.find(x => x.letter === src.letter);
        return g?.picks[src.rank] || null;
      }
      return getThirdCode(bracket, src.idx);
    }
    // For R16+, source is the winner of the prior round's pair.
    const prev = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf', third: 'sf' }[round];
    if (round === 'third') {
      // 3rd-place playoff = SF losers
      const sfWinner = bracket.knockout.sf?.[slot]; // 'slot' here is sf match idx 0 or 1
      if (!sfWinner) return null;
      const sfMatch = matchSources(bracket, 'sf', slot);
      return sfMatch.find(c => c && c !== sfWinner) || null;
    }
    const prevMatchIdx = matchIdx * 2 + slot;
    return bracket.knockout[prev]?.[prevMatchIdx] || null;
  }
  function matchSources(bracket, round, matchIdx) {
    return [resolveSlot(bracket, round, matchIdx, 0), resolveSlot(bracket, round, matchIdx, 1)];
  }

  const ROUNDS = [
    { key: 'r32', label: 'Round of 32',  matches: 16 },
    { key: 'r16', label: 'Round of 16',  matches: 8 },
    { key: 'qf',  label: 'Quarter-finals', matches: 4 },
    { key: 'sf',  label: 'Semi-finals', matches: 2 },
    { key: 'final', label: 'Final',     matches: 1 },
  ];

  function Knockout({ bracket, dispatch, nav }) {
    const groupsDone = bracket.groups.every(g => g.picks.every(Boolean));

    // Cascade clear: if a downstream slot referenced a now-different team, clear it.
    const pickWinner = (round, matchIdx, code) => {
      dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => {
        const ko = { ...b.knockout, r32: { ...b.knockout.r32 }, r16: { ...b.knockout.r16 },
                     qf: { ...b.knockout.qf }, sf: { ...b.knockout.sf } };
        if (round === 'final')      ko.final = code;
        else if (round === 'third') ko.third = code;
        else                        ko[round][matchIdx] = code;

        // Cascade: clear downstream picks that are no longer in their match.
        const downstream = { r32: ['r16','qf','sf','final','third'], r16: ['qf','sf','final','third'],
                             qf: ['sf','final','third'], sf: ['final','third'], final: [], third: [] };
        downstream[round].forEach(rd => {
          if (rd === 'third') { ko.third = null; return; }
          if (rd === 'final') { ko.final = null; return; }
          const n = ROUNDS.find(r => r.key === rd).matches;
          for (let i = 0; i < n; i++) {
            const sources = matchSources({ ...b, knockout: ko }, rd, i);
            const cur = ko[rd]?.[i];
            if (cur && !sources.includes(cur)) ko[rd][i] = null;
          }
        });

        // Step only advances to 2 (review) when user clicks the CTA — not automatically.
        return { ...b, knockout: ko, step: Math.max(b.step, 1) };
      }});
    };

    const pickFinal = (code) => pickWinner('final', 0, code);
    const pickThird = (code) => {
      dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({
        ...b, knockout: { ...b.knockout, third: code },
      })});
    };

    const winner = bracket.knockout.final ? window.WC_DATA.byCode[bracket.knockout.final] : null;
    const thirdSources = useMemo(() => {
      const ko = bracket.knockout;
      const losers = [0, 1].map(i => {
        const w = ko.sf?.[i];
        const srcs = matchSources(bracket, 'sf', i);
        return srcs.find(c => c && c !== w) || null;
      });
      return losers;
    }, [bracket]);

    if (!groupsDone) {
      return (
        <div className="main wide fade-in">
          <div className="card padded" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Finish the group stage first</div>
            <div className="muted" style={{ margin: '6px 0 16px' }}>
              All 12 groups need to be fully ranked (1st–4th) before the knockout opens.
            </div>
            <button className="btn primary" onClick={() => nav({ screen: 'group-stage', bracketId: bracket.id })}>
              ← Back to groups
            </button>
          </div>
        </div>
      );
    }

    const koDone =
      Object.values(bracket.knockout.r32 || {}).filter(Boolean).length === 16 &&
      Object.values(bracket.knockout.r16 || {}).filter(Boolean).length === 8 &&
      Object.values(bracket.knockout.qf  || {}).filter(Boolean).length === 4 &&
      Object.values(bracket.knockout.sf  || {}).filter(Boolean).length === 2 &&
      bracket.knockout.final && bracket.knockout.third;

    return (
      <div className="main wide fade-in">
        <div className="page-head">
          <div>
            <div className="eyebrow">{bracket.name} · Step 2 of 3</div>
            <h1 className="page-title">Knockout bracket</h1>
            <div className="subtitle">
              Click a team in each match to pick the winner. Picks cascade — your champion will
              appear in the final.
            </div>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => nav({ screen: 'group-stage', bracketId: bracket.id })}>
              ← Groups
            </button>
            <button className="btn primary" disabled={!koDone} onClick={() => {
              dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({ ...b, step: 2 }) });
              nav({ screen: 'summary', bracketId: bracket.id });
            }} style={{ opacity: koDone ? 1 : 0.5, cursor: koDone ? 'pointer' : 'not-allowed' }}>
              Review & submit →
            </button>
          </div>
        </div>

        <Stepper steps={['Group stage', 'Knockout', 'Review & submit']} current={1} />

        {koDone && (
          <div className="complete-banner fade-in">
            <div>
              <div className="cb-eyebrow mono">BRACKET COMPLETE</div>
              <div className="cb-title">
                Your champion is {window.WC_DATA.byCode[bracket.knockout.final]?.name}.
              </div>
              <div className="cb-sub">
                Looks good? Lock it in by reviewing and submitting to a pool.
              </div>
            </div>
            <button className="btn accent" onClick={() => {
              dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({ ...b, step: 2 }) });
              nav({ screen: 'summary', bracketId: bracket.id });
            }}>
              Continue to review →
            </button>
          </div>
        )}

        <div className="bracket-scroll">
          <BracketTree bracket={bracket} pickWinner={pickWinner} thirdSources={thirdSources} pickThird={pickThird} />
        </div>
      </div>
    );
  }

  function BracketTree({ bracket, pickWinner, thirdSources, pickThird }) {
    // Grid: 5 columns × 16 rows. Each match spans 2^round rows centered.
    return (
      <div className="bracket-tree" style={{ gridTemplateRows: 'repeat(16, 92px)' }}>
        {ROUNDS.map((rd, rdi) => {
          const span = Math.pow(2, rdi);
          return Array.from({ length: rd.matches }).map((_, mi) => {
            const sources = matchSources(bracket, rd.key, mi);
            const teams = sources.map(c => c ? window.WC_DATA.byCode[c] : null);
            const winnerCode = rd.key === 'final'
              ? bracket.knockout.final
              : bracket.knockout[rd.key]?.[mi];
            const rowStart = mi * span + 1;
            return (
              <MatchBox
                key={`${rd.key}-${mi}`}
                rd={rd}
                idx={mi}
                teams={teams}
                winnerCode={winnerCode}
                onPick={(code) => pickWinner(rd.key, mi, code)}
                style={{
                  gridColumn: rdi + 1,
                  gridRow: `${rowStart} / span ${span}`,
                }}
              />
            );
          });
        })}
        {/* Third-place playoff after the final column */}
        <ThirdPlace
          bracket={bracket}
          sources={thirdSources}
          onPick={pickThird}
          style={{ gridColumn: 5, gridRow: '14 / span 2', marginTop: 20 }}
        />
        <RoundLabels />
      </div>
    );
  }

  function RoundLabels() {
    return (
      <>
        {ROUNDS.map((rd, i) => (
          <div key={rd.key} className="lbl"
            style={{ gridColumn: i + 1, gridRow: '1', marginTop: -28 }}>
            {rd.label}
          </div>
        ))}
      </>
    );
  }

  function MatchBox({ rd, idx, teams, winnerCode, onPick, style }) {
    const isFinal = rd.key === 'final';
    return (
      <div className={`match ${rd.key} ${isFinal ? 'final' : ''} ${winnerCode ? 'set' : ''}`} style={style}>
        <div className="mh">
          <span>{rd.label.split('-')[0]} · {idx + 1}</span>
          {winnerCode && <span style={{ color: 'var(--accent)' }}>● set</span>}
        </div>
        {teams.map((t, i) => {
          const code = t?.code;
          const picked = code && code === winnerCode;
          const tbd = !t;
          return (
            <div key={i}
              className={`slot-row ${tbd ? 'tbd' : ''} ${picked ? 'picked' : ''}`}
              onClick={() => !tbd && onPick(code)}>
              <Flag team={t} w={isFinal ? 24 : 18} h={isFinal ? 16 : 12} />
              <span className="nm">{t ? t.name : '— TBD —'}</span>
              <span className="code">{t ? t.code : ''}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function ThirdPlace({ sources, bracket, onPick, style }) {
    const teams = sources.map(c => c ? window.WC_DATA.byCode[c] : null);
    const pick = bracket.knockout.third;
    return (
      <div style={{ ...style, alignSelf: 'start' }}>
        <div className="lbl" style={{ textAlign: 'center', marginBottom: 6 }}>3rd-place playoff</div>
        <div className="match set" style={{ borderColor: 'var(--line-2)' }}>
          <div className="mh">
            <span>Bronze final</span>
            {pick && <span style={{ color: 'var(--gold)' }}>● set</span>}
          </div>
          {teams.map((t, i) => (
            <div key={i}
              className={`slot-row ${!t ? 'tbd' : ''} ${pick && t?.code === pick ? 'picked' : ''}`}
              onClick={() => t && onPick(t.code)}>
              <Flag team={t} w={18} h={12} />
              <span className="nm">{t ? t.name : '— SF loser —'}</span>
              <span className="code">{t ? t.code : ''}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  Object.assign(window, { Knockout, R32_SEED });
})();
