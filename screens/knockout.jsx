// Knockout bracket — official FIFA WC 2026 format.
// R32 seeding and bracket path verified against FIFA official schedule (Wikipedia).
// Third-place qualifier slots require the user to pick which eligible group's 3rd advances.

(function () {
  // Official FIFA WC 2026 R32 bracket pairings (corrected).
  // Consecutive pairs feed the same R16 match:
  //   [0,1]→R16[0]=M89  [2,3]→R16[1]=M90  [4,5]→R16[2]=M93  [6,7]→R16[3]=M94
  //   [8,9]→R16[4]=M91  [10,11]→R16[5]=M92  [12,13]→R16[6]=M95  [14,15]→R16[7]=M96
  const R32_SEED = [
    [{ kind:'group', letter:'E', rank:0 }, { kind:'third', slotIdx:0, eligible:['A','B','C','D','F'] }], // M74
    [{ kind:'group', letter:'I', rank:0 }, { kind:'third', slotIdx:1, eligible:['C','D','F','G','H'] }], // M77
    [{ kind:'group', letter:'A', rank:1 }, { kind:'group', letter:'B', rank:1 }],                        // M73
    [{ kind:'group', letter:'F', rank:0 }, { kind:'group', letter:'C', rank:1 }],                        // M75
    [{ kind:'group', letter:'K', rank:1 }, { kind:'group', letter:'L', rank:1 }],                        // M83
    [{ kind:'group', letter:'H', rank:0 }, { kind:'group', letter:'J', rank:1 }],                        // M84
    [{ kind:'group', letter:'D', rank:0 }, { kind:'third', slotIdx:2, eligible:['B','E','F','I','J'] }], // M81
    [{ kind:'group', letter:'G', rank:0 }, { kind:'third', slotIdx:3, eligible:['A','E','H','I','J'] }], // M82
    [{ kind:'group', letter:'C', rank:0 }, { kind:'group', letter:'F', rank:1 }],                        // M76
    [{ kind:'group', letter:'E', rank:1 }, { kind:'group', letter:'I', rank:1 }],                        // M78
    [{ kind:'group', letter:'A', rank:0 }, { kind:'third', slotIdx:4, eligible:['C','E','F','H','I'] }], // M79
    [{ kind:'group', letter:'L', rank:0 }, { kind:'third', slotIdx:5, eligible:['E','H','I','J','K'] }], // M80
    [{ kind:'group', letter:'J', rank:0 }, { kind:'group', letter:'H', rank:1 }],                        // M86
    [{ kind:'group', letter:'D', rank:1 }, { kind:'group', letter:'G', rank:1 }],                        // M88
    [{ kind:'group', letter:'B', rank:0 }, { kind:'third', slotIdx:6, eligible:['E','F','G','I','J'] }], // M85
    [{ kind:'group', letter:'K', rank:0 }, { kind:'third', slotIdx:7, eligible:['D','E','I','J','L'] }], // M87
  ];

  // Official FIFA match numbers by round and bracket index.
  const FIFA_MATCH_NUMS = {
    r32:   [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
    r16:   [89, 90, 93, 94, 91, 92, 95, 96],
    qf:    [97, 98, 99, 100],
    sf:    [101, 102],
    final: [104],
    third: [103],
  };

  function getThirdCode(bracket, slotIdx) {
    const letter = bracket.knockout.thirdSrc?.[slotIdx];
    if (!letter) return null;
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
      return getThirdCode(bracket, src.slotIdx);
    }
    const prev = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf', third: 'sf' }[round];
    if (round === 'third') {
      const sfWinner = bracket.knockout.sf?.[slot];
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
    { key: 'r32',   label: 'Round of 32',    matches: 16 },
    { key: 'r16',   label: 'Round of 16',    matches: 8  },
    { key: 'qf',    label: 'Quarter-finals', matches: 4  },
    { key: 'sf',    label: 'Semi-finals',    matches: 2  },
    { key: 'final', label: 'Final',          matches: 1  },
  ];

  function Knockout({ bracket, dispatch, nav }) {
    const groupsDone = bracket.groups.every(g => g.picks.every(Boolean));

    const pickWinner = (round, matchIdx, code) => {
      dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => {
        const ko = { ...b.knockout, r32: { ...b.knockout.r32 }, r16: { ...b.knockout.r16 },
                     qf: { ...b.knockout.qf }, sf: { ...b.knockout.sf } };
        if (round === 'final')      ko.final = code;
        else if (round === 'third') ko.third = code;
        else                        ko[round][matchIdx] = code;

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

        return { ...b, knockout: ko, step: Math.max(b.step, 1) };
      }});
    };

    // Change which group's 3rd-place team fills a third-place R32 slot.
    // Pass null to clear the selection and reset downstream picks.
    const pickThirdSrc = (slotIdx, groupLetterOrNull) => {
      dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => {
        const ko = { ...b.knockout, r32: { ...b.knockout.r32 }, r16: { ...b.knockout.r16 },
                     qf: { ...b.knockout.qf }, sf: { ...b.knockout.sf },
                     thirdSrc: [...(b.knockout.thirdSrc || Array(8).fill(null))] };
        ko.thirdSrc[slotIdx] = groupLetterOrNull;

        const matchIdx = R32_SEED.findIndex(pair =>
          pair.some(s => s.kind === 'third' && s.slotIdx === slotIdx)
        );
        if (matchIdx >= 0) {
          ko.r32[matchIdx] = null;
          ['r16', 'qf', 'sf'].forEach(rd => {
            const n = ROUNDS.find(r => r.key === rd).matches;
            for (let i = 0; i < n; i++) {
              const srcs = matchSources({ ...b, knockout: ko }, rd, i);
              if (ko[rd]?.[i] && !srcs.includes(ko[rd][i])) ko[rd][i] = null;
            }
          });
          ko.final = null;
          ko.third = null;
        }

        return { ...b, knockout: ko };
      }});
    };

    const pickThird = (code) => {
      dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({
        ...b, knockout: { ...b.knockout, third: code },
      })});
    };

    const thirdSources = useMemo(() => {
      const ko = bracket.knockout;
      return [0, 1].map(i => {
        const w = ko.sf?.[i];
        const srcs = matchSources(bracket, 'sf', i);
        return srcs.find(c => c && c !== w) || null;
      });
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
              Click a team in each match to pick the winner. For 3rd-place qualifier slots,
              first choose which eligible group's 3rd-place team advances.
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
          <BracketTree bracket={bracket} pickWinner={pickWinner} pickThirdSrc={pickThirdSrc}
            thirdSources={thirdSources} pickThird={pickThird} />
        </div>
      </div>
    );
  }

  function BracketTree({ bracket, pickWinner, pickThirdSrc, thirdSources, pickThird }) {
    return (
      <div className="bracket-tree" style={{ gridTemplateRows: 'repeat(16, 92px)' }}>
        {ROUNDS.map((rd, rdi) => {
          const span = Math.pow(2, rdi);
          return Array.from({ length: rd.matches }).map((_, mi) => {
            const rawSlots = rd.key === 'r32' ? R32_SEED[mi] : null;
            const sources = matchSources(bracket, rd.key, mi);
            const teams = sources.map(c => c ? window.WC_DATA.byCode[c] : null);
            const winnerCode = rd.key === 'final'
              ? bracket.knockout.final
              : bracket.knockout[rd.key]?.[mi];
            const rowStart = mi * span + 1;
            return (
              <MatchBox
                key={`${rd.key}-${mi}`}
                rd={rd} idx={mi}
                teams={teams}
                rawSlots={rawSlots}
                bracket={bracket}
                winnerCode={winnerCode}
                onPick={(code) => pickWinner(rd.key, mi, code)}
                onPickThirdSrc={pickThirdSrc}
                style={{ gridColumn: rdi + 1, gridRow: `${rowStart} / span ${span}` }}
              />
            );
          });
        })}
        <ThirdPlace
          bracket={bracket} sources={thirdSources} onPick={pickThird}
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

  function MatchBox({ rd, idx, teams, rawSlots, bracket, winnerCode, onPick, onPickThirdSrc, style }) {
    const isFinal = rd.key === 'final';
    const mNum = FIFA_MATCH_NUMS[rd.key]?.[idx] ?? '?';

    return (
      <div className={`match ${rd.key} ${isFinal ? 'final' : ''} ${winnerCode ? 'set' : ''}`} style={style}>
        <div className="mh">
          <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>M{mNum}</span>
          {winnerCode && <span style={{ color: 'var(--accent)' }}>● set</span>}
        </div>
        {teams.map((t, i) => {
          const rawSlot = rawSlots?.[i];
          const isThirdSlot = rawSlot?.kind === 'third';
          const srcPicked = isThirdSlot ? (bracket.knockout.thirdSrc?.[rawSlot.slotIdx] || null) : null;

          if (isThirdSlot && !srcPicked) {
            return (
              <ThirdSrcPicker key={i} slotIdx={rawSlot.slotIdx} eligible={rawSlot.eligible}
                bracket={bracket} onPick={onPickThirdSrc} />
            );
          }

          const code = t?.code;
          const picked = code && code === winnerCode;
          const tbd = !t;
          return (
            <div key={i} className={`slot-row ${tbd ? 'tbd' : ''} ${picked ? 'picked' : ''}`}
              onClick={() => !tbd && onPick(code)}>
              <Flag team={t} w={isFinal ? 24 : 18} h={isFinal ? 16 : 12} />
              <span className="nm">{t ? t.name : '— TBD —'}</span>
              <span className="code">{t ? t.code : ''}</span>
              {isThirdSlot && srcPicked && (
                <span className="third-src-tag"
                  title={`3rd from Group ${srcPicked} — click to change`}
                  onClick={e => { e.stopPropagation(); onPickThirdSrc(rawSlot.slotIdx, null); }}>
                  3{srcPicked} ×
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function ThirdSrcPicker({ slotIdx, eligible, bracket, onPick }) {
    return (
      <div className="slot-row third-src-row">
        <span className="third-src-lbl">3rd place from:</span>
        <div className="third-src-opts">
          {eligible.map(letter => {
            const g = bracket.groups.find(x => x.letter === letter);
            const teamCode = g?.picks[2];
            const team = teamCode ? window.WC_DATA.byCode[teamCode] : null;
            return (
              <button key={letter} className="third-src-opt" disabled={!teamCode}
                title={team ? `${team.name} (3rd in Group ${letter})` : `Group ${letter} 3rd not picked yet`}
                onClick={e => { e.stopPropagation(); onPick(slotIdx, letter); }}>
                {team && <Flag team={team} w={13} h={9} />}
                <span>3{letter}</span>
              </button>
            );
          })}
        </div>
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
            <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>M103</span>
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
