// 48 teams for World Cup 2026.
// Groups reflect the official December 2025 draw.
window.WC_DATA = (function () {
  const T = (code, name, pot, conf, iso) => ({ code, name, pot, conf, iso });

  // 48 teams, exactly 12 per pot.
  const TEAMS = [
    // POT 1 (12) — hosts + top seeds
    T('MEX', 'Mexico',        1, 'CONCACAF', 'mx'),
    T('CAN', 'Canada',        1, 'CONCACAF', 'ca'),
    T('USA', 'United States', 1, 'CONCACAF', 'us'),
    T('FRA', 'France',        1, 'UEFA',     'fr'),
    T('ENG', 'England',       1, 'UEFA',     'gb-eng'),
    T('GER', 'Germany',       1, 'UEFA',     'de'),
    T('ESP', 'Spain',         1, 'UEFA',     'es'),
    T('POR', 'Portugal',      1, 'UEFA',     'pt'),
    T('NED', 'Netherlands',   1, 'UEFA',     'nl'),
    T('BEL', 'Belgium',       1, 'UEFA',     'be'),
    T('ARG', 'Argentina',     1, 'CONMEBOL', 'ar'),
    T('BRA', 'Brazil',        1, 'CONMEBOL', 'br'),
    // POT 2 (12)
    T('CRO', 'Croatia',       2, 'UEFA',     'hr'),
    T('SUI', 'Switzerland',   2, 'UEFA',     'ch'),
    T('AUT', 'Austria',       2, 'UEFA',     'at'),
    T('URU', 'Uruguay',       2, 'CONMEBOL', 'uy'),
    T('COL', 'Colombia',      2, 'CONMEBOL', 'co'),
    T('ECU', 'Ecuador',       2, 'CONMEBOL', 'ec'),
    T('JPN', 'Japan',         2, 'AFC',      'jp'),
    T('KOR', 'South Korea',   2, 'AFC',      'kr'),
    T('IRN', 'Iran',          2, 'AFC',      'ir'),
    T('AUS', 'Australia',     2, 'AFC',      'au'),
    T('MAR', 'Morocco',       2, 'CAF',      'ma'),
    T('SEN', 'Senegal',       2, 'CAF',      'sn'),
    // POT 3 (12)
    T('RSA', 'South Africa',  3, 'CAF',      'za'),
    T('QAT', 'Qatar',         3, 'AFC',      'qa'),
    T('SCO', 'Scotland',      3, 'UEFA',     'gb-sct'),
    T('PAR', 'Paraguay',      3, 'CONMEBOL', 'py'),
    T('CIV', 'Ivory Coast',   3, 'CAF',      'ci'),
    T('SWE', 'Sweden',        3, 'UEFA',     'se'),
    T('EGY', 'Egypt',         3, 'CAF',      'eg'),
    T('KSA', 'Saudi Arabia',  3, 'AFC',      'sa'),
    T('NOR', 'Norway',        3, 'UEFA',     'no'),
    T('ALG', 'Algeria',       3, 'CAF',      'dz'),
    T('UZB', 'Uzbekistan',    3, 'AFC',      'uz'),
    T('GHA', 'Ghana',         3, 'CAF',      'gh'),
    // POT 4 (12)
    T('CZE', 'Czechia',       4, 'UEFA',     'cz'),
    T('BIH', 'Bosnia-Herz.',  4, 'UEFA',     'ba'),
    T('HAI', 'Haiti',         4, 'CONCACAF', 'ht'),
    T('TUR', 'Türkiye',       4, 'UEFA',     'tr'),
    T('CUW', 'Curaçao',       4, 'CONCACAF', 'cw'),
    T('TUN', 'Tunisia',       4, 'CAF',      'tn'),
    T('NZL', 'New Zealand',   4, 'OFC',      'nz'),
    T('CPV', 'Cape Verde',    4, 'CAF',      'cv'),
    T('IRQ', 'Iraq',          4, 'AFC',      'iq'),
    T('JOR', 'Jordan',        4, 'AFC',      'jo'),
    T('COD', 'Congo DR',      4, 'CAF',      'cd'),
    T('PAN', 'Panama',        4, 'CONCACAF', 'pa'),
  ];

  const byCode = Object.fromEntries(TEAMS.map(t => [t.code, t]));

  const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');

  // Groups reflect the official December 2025 FIFA World Cup draw.
  const buildSeededGroups = () => [
    { letter: 'A', teams: ['MEX', 'KOR', 'RSA', 'CZE'] },
    { letter: 'B', teams: ['CAN', 'SUI', 'QAT', 'BIH'] },
    { letter: 'C', teams: ['BRA', 'MAR', 'SCO', 'HAI'] },
    { letter: 'D', teams: ['USA', 'AUS', 'PAR', 'TUR'] },
    { letter: 'E', teams: ['GER', 'ECU', 'CIV', 'CUW'] },
    { letter: 'F', teams: ['NED', 'JPN', 'SWE', 'TUN'] },
    { letter: 'G', teams: ['BEL', 'IRN', 'EGY', 'NZL'] },
    { letter: 'H', teams: ['ESP', 'URU', 'KSA', 'CPV'] },
    { letter: 'I', teams: ['FRA', 'SEN', 'NOR', 'IRQ'] },
    { letter: 'J', teams: ['ARG', 'AUT', 'ALG', 'JOR'] },
    { letter: 'K', teams: ['POR', 'COL', 'UZB', 'COD'] },
    { letter: 'L', teams: ['ENG', 'CRO', 'GHA', 'PAN'] },
  ];

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
