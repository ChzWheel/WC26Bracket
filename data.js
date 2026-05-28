// 48 teams for World Cup 2026. Flag stripes are simplified CSS gradients —
// vertical/horizontal/triband — not exact reproductions. No federation crests.
// Pots are illustrative seeding for the simulator.
window.WC_DATA = (function () {
  // h = horizontal stripes, v = vertical stripes
  // colors top→bottom (h) or left→right (v)
  const T = (code, name, dir, colors, pot, conf) => ({ code, name, dir, colors, pot, conf });

  // 48 teams, exactly 12 per pot.
  const TEAMS = [
    // POT 1 (12) — hosts + top seeds
    T('CAN', 'Canada',        'v', ['#d52b1e', '#ffffff', '#d52b1e'], 1, 'CONCACAF'),
    T('MEX', 'Mexico',        'v', ['#006847', '#ffffff', '#ce1126'], 1, 'CONCACAF'),
    T('USA', 'United States', 'h', ['#bf0a30', '#ffffff', '#bf0a30', '#ffffff', '#002868'], 1, 'CONCACAF'),
    T('ENG', 'England',       'h', ['#ffffff', '#cf142b', '#ffffff'], 1, 'UEFA'),
    T('FRA', 'France',        'v', ['#0055a4', '#ffffff', '#ef4135'], 1, 'UEFA'),
    T('GER', 'Germany',       'h', ['#000000', '#dd0000', '#ffce00'], 1, 'UEFA'),
    T('ESP', 'Spain',         'h', ['#aa151b', '#f1bf00', '#aa151b'], 1, 'UEFA'),
    T('POR', 'Portugal',      'v', ['#006600', '#ff0000'], 1, 'UEFA'),
    T('NED', 'Netherlands',   'h', ['#ae1c28', '#ffffff', '#21468b'], 1, 'UEFA'),
    T('BEL', 'Belgium',       'v', ['#000000', '#fdda24', '#ef3340'], 1, 'UEFA'),
    T('ARG', 'Argentina',     'h', ['#75aadb', '#ffffff', '#75aadb'], 1, 'CONMEBOL'),
    T('BRA', 'Brazil',        'h', ['#009c3b', '#ffdf00', '#009c3b'], 1, 'CONMEBOL'),
    // POT 2 (12)
    T('ITA', 'Italy',         'v', ['#008c45', '#f4f5f0', '#cd212a'], 2, 'UEFA'),
    T('CRO', 'Croatia',       'h', ['#ff0000', '#ffffff', '#171796'], 2, 'UEFA'),
    T('DEN', 'Denmark',       'h', ['#c8102e', '#c8102e', '#c8102e'], 2, 'UEFA'),
    T('SUI', 'Switzerland',   'h', ['#ff0000', '#ff0000', '#ff0000'], 2, 'UEFA'),
    T('URU', 'Uruguay',       'h', ['#ffffff', '#0038a8', '#ffffff', '#0038a8'], 2, 'CONMEBOL'),
    T('COL', 'Colombia',      'h', ['#fcd116', '#fcd116', '#003893', '#ce1126'], 2, 'CONMEBOL'),
    T('JPN', 'Japan',         'h', ['#ffffff', '#ffffff', '#ffffff'], 2, 'AFC'),
    T('KOR', 'South Korea',   'h', ['#ffffff', '#ffffff', '#ffffff'], 2, 'AFC'),
    T('IRN', 'Iran',          'h', ['#239f40', '#ffffff', '#da0000'], 2, 'AFC'),
    T('AUS', 'Australia',     'h', ['#012169', '#012169', '#012169'], 2, 'AFC'),
    T('SEN', 'Senegal',       'v', ['#00853f', '#fdef42', '#e31b23'], 2, 'CAF'),
    T('MAR', 'Morocco',       'h', ['#c1272d', '#c1272d', '#c1272d'], 2, 'CAF'),
    // POT 3 (12)
    T('POL', 'Poland',        'h', ['#ffffff', '#dc143c'], 3, 'UEFA'),
    T('AUT', 'Austria',       'h', ['#ed2939', '#ffffff', '#ed2939'], 3, 'UEFA'),
    T('UKR', 'Ukraine',       'h', ['#0057b7', '#ffd700'], 3, 'UEFA'),
    T('SRB', 'Serbia',        'h', ['#c6363c', '#0c4076', '#ffffff'], 3, 'UEFA'),
    T('ECU', 'Ecuador',       'h', ['#ffd700', '#ffd700', '#034ea2', '#ed1c24'], 3, 'CONMEBOL'),
    T('PAR', 'Paraguay',      'h', ['#d52b1e', '#ffffff', '#0038a8'], 3, 'CONMEBOL'),
    T('CHI', 'Chile',         'h', ['#ffffff', '#d52b1e'], 3, 'CONMEBOL'),
    T('KSA', 'Saudi Arabia',  'h', ['#006c35', '#006c35', '#006c35'], 3, 'AFC'),
    T('UZB', 'Uzbekistan',    'h', ['#0099b5', '#ffffff', '#1eb53a'], 3, 'AFC'),
    T('EGY', 'Egypt',         'h', ['#ce1126', '#ffffff', '#000000'], 3, 'CAF'),
    T('ALG', 'Algeria',       'v', ['#006233', '#ffffff'], 3, 'CAF'),
    T('NGA', 'Nigeria',       'v', ['#008751', '#ffffff', '#008751'], 3, 'CAF'),
    // POT 4 (12)
    T('SCO', 'Scotland',      'h', ['#005eb8', '#005eb8', '#005eb8'], 4, 'UEFA'),
    T('NOR', 'Norway',        'h', ['#ef2b2d', '#ef2b2d', '#ef2b2d'], 4, 'UEFA'),
    T('SWE', 'Sweden',        'h', ['#006aa7', '#fecc00', '#006aa7'], 4, 'UEFA'),
    T('QAT', 'Qatar',         'v', ['#ffffff', '#8a1538'], 4, 'AFC'),
    T('TUN', 'Tunisia',       'h', ['#e70013', '#e70013', '#e70013'], 4, 'CAF'),
    T('GHA', 'Ghana',         'h', ['#ce1126', '#fcd116', '#006b3f'], 4, 'CAF'),
    T('CIV', 'Ivory Coast',   'v', ['#f77f00', '#ffffff', '#009e60'], 4, 'CAF'),
    T('CMR', 'Cameroon',      'v', ['#007a5e', '#ce1126', '#fcd116'], 4, 'CAF'),
    T('RSA', 'South Africa',  'h', ['#007749', '#ffb612', '#000000', '#de3831'], 4, 'CAF'),
    T('NZL', 'New Zealand',   'h', ['#012169', '#012169', '#012169'], 4, 'OFC'),
    T('CRC', 'Costa Rica',    'h', ['#002b7f', '#ffffff', '#ce1126', '#ffffff', '#002b7f'], 4, 'CONCACAF'),
    T('PAN', 'Panama',        'h', ['#ffffff', '#005293', '#d21034', '#ffffff'], 4, 'CONCACAF'),
  ];

  const byCode = Object.fromEntries(TEAMS.map(t => [t.code, t]));

  // Build 12 groups of 4, snake-seeded across pots so each group has 1 from each pot.
  // Host nations occupy A1, B1, C1.
  const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');
  const buildSeededGroups = () => {
    const pots = [1,2,3,4].map(p => TEAMS.filter(t => t.pot === p).map(t => t.code));
    const groups = GROUP_LETTERS.map(L => ({ letter: L, teams: [] }));
    // Hosts to A/B/C
    groups[0].teams.push('CAN');
    groups[1].teams.push('MEX');
    groups[2].teams.push('USA');
    const p1 = pots[0].filter(c => !['CAN','MEX','USA'].includes(c));
    for (let i = 0; i < 9; i++) groups[i+3].teams.push(p1[i]);
    [pots[1], pots[2], pots[3]].forEach(pot => {
      const shuf = [...pot];
      for (let i = 0; i < 12; i++) groups[i].teams.push(shuf[i]);
    });
    return groups;
  };

  return {
    TEAMS,
    byCode,
    GROUP_LETTERS,
    buildSeededGroups,
    POOL_DEMO: [
      { id: 'u1', name: 'Maya R.',     avatar: 'MR', score: 142 },
      { id: 'u2', name: 'Devon K.',    avatar: 'DK', score: 138 },
      { id: 'u3', name: 'Priya S.',    avatar: 'PS', score: 134 },
      { id: 'u4', name: 'Theo W.',     avatar: 'TW', score: 128 },
      { id: 'u5', name: 'Lola B.',     avatar: 'LB', score: 121 },
      { id: 'u6', name: 'Ji-ho P.',    avatar: 'JP', score: 119 },
      { id: 'u7', name: 'Marcus A.',   avatar: 'MA', score: 112 },
      { id: 'u8', name: 'Greta H.',    avatar: 'GH', score: 104 },
    ],
  };
})();
