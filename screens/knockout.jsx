// Knockout bracket — official FIFA WC 2026 format.
// R32 seeding and bracket path verified against FIFA official schedule (Wikipedia).
// Third-place qualifiers: user picks 8 of 12; system assigns them to slots via
// constrained greedy matching (most-restricted slot first).

(function () {
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

  const FIFA_MATCH_NUMS = {
    r32:   [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
    r16:   [89, 90, 93, 94, 91, 92, 95, 96],
    qf:    [97, 98, 99, 100],
    sf:    [101, 102],
    final: [104],
    third: [103],
  };

  const THIRD_SLOT_INFO = Array.from({ length: 8 }, (_, slotIdx) => {
    const matchIdx = R32_SEED.findIndex(pair => pair.some(s => s.kind === 'third' && s.slotIdx === slotIdx));
    const src = R32_SEED[matchIdx].find(s => s.kind === 'third');
    return { matchIdx, eligible: src.eligible, mNum: FIFA_MATCH_NUMS.r32[matchIdx] };
  });

  // Given the user's 8 picked qualifier team codes, assign each qualifying group
  // to exactly one R32 third-place slot using most-constrained-first greedy matching.
  function assignQualifiersToSlots(bracket) {
    const qualifiers = bracket.knockout.thirdQualifiers || [];

    // Map team code → group letter for quick lookup
    const teamToGroup = {};
    for (const g of bracket.groups) {
      if (g.picks[2]) teamToGroup[g.picks[2]] = g.letter;
    }

    const qualifyingGroups = new Set(qualifiers.map(code => teamToGroup[code]).filter(Boolean));

    // Sort slots by how many of their eligible groups are qualifying (ascending = most constrained first)
    const slots = THIRD_SLOT_INFO.map(({ slotIdx, eligible }) => ({
      slotIdx,
      candidates: eligible.filter(l => qualifyingGroups.has(l)),
    })).sort((a, b) => a.candidates.length - b.candidates.length);

    const assignment = {}; // slotIdx → groupLetter
    const used = new Set();
    for (const { slotIdx, candidates } of slots) {
      for (const letter of candidates) {
        if (!used.has(letter)) {
          assignment[slotIdx] = letter;
          used.add(letter);
          break;
        }
      }
    }
    return assignment;
  }

  function getThirdCode(bracket, slotIdx) {
    const assignment = assignQualifiersToSlots(bracket);
    const letter = assignment[slotIdx];
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
    const [groupStageDone, setGroupStageDone] = useState(false);

    useEffect(() => {
      window.SB.Matches.isGroupStageDone()
        .then(done => setGroupStageDone(done))
        .catch(() => {});
    }, []);

    const qualifiers = bracket.knockout.thirdQualifiers || [];
    const qualifiersDone = qualifiers.length === 8;

    // Toggle a team code in/out of the 8 qualifier picks.
    const pickQualifier = (teamCode) => {
      dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => {
        const current = b.knockout.thirdQualifiers || [];
        let next;
        if (current.includes(teamCode)) {
          next = current.filter(c => c !== teamCode);
        } else {
          if (current.length >= 8) return b;
          next = [...current, teamCode];
        }

        const ko = {
          ...b.knockout,
          thirdQualifiers: next,
          r32: { ...b.knockout.r32 },
          r16: { ...b.knockout.r16 },
          qf:  { ...b.knockout.qf  },
          sf:  { ...b.knockout.sf  },
          final: null,
          third: null,
        };

        // Clear R32 winners for all third-place slots since the assignment may have changed.
        for (let mi = 0; mi < 16; mi++) {
          if (R32_SEED[mi].some(s => s.kind === 'third')) ko.r32[mi] = null;
        }

        // Cascade clear r16/qf/sf picks that are no longer sourced from their match.
        const tmp = { ...b, knockout: ko };
        ['r16', 'qf', 'sf'].forEach(rd => {
          const n = ROUNDS.find(r => r.key === rd).matches;
          for (let i = 0; i < n; i++) {
            const srcs = matchSources(tmp, rd, i);
            if (ko[rd]?.[i] && !srcs.includes(ko[rd][i])) ko[rd][i] = null;
          }
        });

        return { ...b, knockout: ko, step: Math.max(b.step, 1) };
      }});
    };

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

    // Gate: pick 8 qualifiers before showing the bracket.
    if (!qualifiersDone) {
      return (
        <ThirdQualifierPicker
          bracket={bracket}
          groupStageDone={groupStageDone}
          onPick={pickQualifier}
          nav={nav}
        />
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
              Click a team in each match to pick the winner.
            </div>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => nav({ screen: 'group-stage', bracketId: bracket.id })}>
              ← Groups
            </button>
            <button className="btn ghost" onClick={() => dispatch({ type: 'UPDATE_BRACKET', id: bracket.id, patch: (b) => ({ ...b, knockout: { ...b.knockout, thirdQualifiers: [] } }) })}>
              Edit qualifiers
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
          <BracketTree bracket={bracket} pickWinner={pickWinner}
            thirdSources={thirdSources} pickThird={pickThird} />
        </div>
      </div>
    );
  }

  function ThirdQualifierPicker({ bracket, groupStageDone, onPick, nav }) {
    const qualifiers = bracket.knockout.thirdQualifiers || [];
    const count = qualifiers.length;

    return (
      <div className="main fade-in">
        <div className="page-head">
          <div>
            <div className="eyebrow">{bracket.name} · Step 2 of 3</div>
            <h1 className="page-title">3rd-place qualifiers</h1>
            <div className="subtitle">
              The best 8 of 12 third-place teams advance to the Round of 32.
              Pick which 8 you think will make it.
            </div>
          </div>
          <button className="btn ghost" onClick={() => nav({ screen: 'group-stage', bracketId: bracket.id })}>
            ← Groups
          </button>
        </div>

        <Stepper steps={['Group stage', 'Knockout', 'Review & submit']} current={1} />

        {groupStageDone && (
          <div className="third-edit-banner">
            The group stage is complete — update your qualifier picks based on the actual results.
          </div>
        )}

        <div className="card padded" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Select 8 teams</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Each team earns you 5 points if they actually advance
              </div>
            </div>
            <div className={`qualifier-counter ${count === 8 ? 'done' : ''}`}>
              {count} <span style={{ opacity: 0.5 }}>/ 8</span>
            </div>
          </div>

          <div className="qualifier-grid">
            {bracket.groups.map(g => {
              const teamCode = g.picks[2];
              const team = teamCode ? window.WC_DATA.byCode[teamCode] : null;
              const selected = qualifiers.includes(teamCode);
              const disabled = !teamCode || (!selected && count >= 8);
              return (
                <button key={g.letter}
                  className={`qualifier-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                  disabled={disabled}
                  onClick={() => teamCode && onPick(teamCode)}>
                  <div className="qualifier-group-label">Group {g.letter}</div>
                  {team ? (
                    <>
                      <Flag team={team} w={32} h={22} />
                      <div className="qualifier-team-name">{team.name}</div>
                    </>
                  ) : (
                    <div className="qualifier-tbd">3rd not picked</div>
                  )}
                  {selected && <div className="qualifier-check">✓</div>}
                </button>
              );
            })}
          </div>
        </div>

        {count < 8 && (
          <div className="muted" style={{ fontSize: 12, textAlign: 'right' }}>
            Select {8 - count} more team{8 - count !== 1 ? 's' : ''} to unlock the bracket
          </div>
        )}
      </div>
    );
  }

  function BracketTree({ bracket, pickWinner, thirdSources, pickThird }) {
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
                rd={rd} idx={mi}
                teams={teams}
                winnerCode={winnerCode}
                onPick={(code) => pickWinner(rd.key, mi, code)}
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

  function MatchBox({ rd, idx, teams, winnerCode, onPick, style }) {
    const isFinal = rd.key === 'final';
    const mNum = FIFA_MATCH_NUMS[rd.key]?.[idx] ?? '?';
    return (
      <div className={`match ${rd.key} ${isFinal ? 'final' : ''} ${winnerCode ? 'set' : ''}`} style={style}>
        <div className="mh">
          <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>M{mNum}</span>
          {winnerCode && <span style={{ color: 'var(--accent)' }}>● set</span>}
        </div>
        {teams.map((t, i) => {
          const code = t?.code;
          const picked = code && code === winnerCode;
          return (
            <div key={i} className={`slot-row ${!t ? 'tbd' : ''} ${picked ? 'picked' : ''}`}
              onClick={() => t && onPick(code)}>
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
