-- ============================================================
-- FIFA World Cup 2026 — Complete fixture insert
-- Times are in LOCAL venue time with UTC offset.
-- Source: Wikipedia group stage articles (verified).
-- Run in Supabase SQL Editor.
-- ============================================================

TRUNCATE public.matches;

INSERT INTO public.matches
  (kickoff, home_code, away_code, home_name, away_name,
   group_label, stage, venue, status)
VALUES

-- ── GROUP A  (MEX · KOR · RSA · CZE) ─────────────────────
-- Matchday 1
('2026-06-11 13:00-06','MEX','RSA','Mexico','South Africa',             'A','group','Estadio Azteca, Mexico City','upcoming'),
('2026-06-11 20:00-06','KOR','CZE','South Korea','Czechia',             'A','group','Estadio Akron, Guadalajara','upcoming'),
-- Matchday 2
('2026-06-18 12:00-04','CZE','RSA','Czechia','South Africa',            'A','group','Mercedes-Benz Stadium, Atlanta','upcoming'),
('2026-06-18 19:00-06','MEX','KOR','Mexico','South Korea',              'A','group','Estadio Akron, Guadalajara','upcoming'),
-- Matchday 3
('2026-06-24 19:00-06','CZE','MEX','Czechia','Mexico',                  'A','group','Estadio Azteca, Mexico City','upcoming'),
('2026-06-24 19:00-06','RSA','KOR','South Africa','South Korea',        'A','group','Estadio BBVA, Monterrey','upcoming'),

-- ── GROUP B  (CAN · SUI · QAT · BIH) ─────────────────────
-- Matchday 1
('2026-06-12 15:00-04','CAN','BIH','Canada','Bosnia & Herzegovina',     'B','group','BMO Field, Toronto','upcoming'),
('2026-06-13 12:00-07','QAT','SUI','Qatar','Switzerland',               'B','group','Levi''s Stadium, San Francisco','upcoming'),
-- Matchday 2
('2026-06-18 12:00-07','SUI','BIH','Switzerland','Bosnia & Herzegovina','B','group','SoFi Stadium, Los Angeles','upcoming'),
('2026-06-18 15:00-07','CAN','QAT','Canada','Qatar',                    'B','group','BC Place, Vancouver','upcoming'),
-- Matchday 3
('2026-06-24 12:00-07','SUI','CAN','Switzerland','Canada',              'B','group','BC Place, Vancouver','upcoming'),
('2026-06-24 12:00-07','BIH','QAT','Bosnia & Herzegovina','Qatar',      'B','group','Lumen Field, Seattle','upcoming'),

-- ── GROUP C  (BRA · MAR · SCO · HAI) ─────────────────────
-- Matchday 1
('2026-06-13 18:00-04','BRA','MAR','Brazil','Morocco',                  'C','group','MetLife Stadium, East Rutherford','upcoming'),
('2026-06-13 21:00-04','HAI','SCO','Haiti','Scotland',                  'C','group','Gillette Stadium, Boston','upcoming'),
-- Matchday 2
('2026-06-19 18:00-04','SCO','MAR','Scotland','Morocco',                'C','group','Gillette Stadium, Boston','upcoming'),
('2026-06-19 20:30-04','BRA','HAI','Brazil','Haiti',                    'C','group','Lincoln Financial Field, Philadelphia','upcoming'),
-- Matchday 3
('2026-06-24 18:00-04','SCO','BRA','Scotland','Brazil',                 'C','group','Hard Rock Stadium, Miami','upcoming'),
('2026-06-24 18:00-04','MAR','HAI','Morocco','Haiti',                   'C','group','Mercedes-Benz Stadium, Atlanta','upcoming'),

-- ── GROUP D  (USA · AUS · PAR · TUR) ─────────────────────
-- Matchday 1
('2026-06-12 18:00-07','USA','PAR','United States','Paraguay',          'D','group','SoFi Stadium, Los Angeles','upcoming'),
('2026-06-13 21:00-07','AUS','TUR','Australia','Türkiye',               'D','group','BC Place, Vancouver','upcoming'),
-- Matchday 2
('2026-06-19 12:00-07','USA','AUS','United States','Australia',         'D','group','Lumen Field, Seattle','upcoming'),
('2026-06-19 20:00-07','TUR','PAR','Türkiye','Paraguay',                'D','group','Levi''s Stadium, San Francisco','upcoming'),
-- Matchday 3
('2026-06-25 19:00-07','TUR','USA','Türkiye','United States',           'D','group','SoFi Stadium, Los Angeles','upcoming'),
('2026-06-25 19:00-07','PAR','AUS','Paraguay','Australia',              'D','group','Levi''s Stadium, San Francisco','upcoming'),

-- ── GROUP E  (GER · ECU · CIV · CUW) ─────────────────────
-- Matchday 1
('2026-06-14 12:00-05','GER','CUW','Germany','Curaçao',                 'E','group','NRG Stadium, Houston','upcoming'),
('2026-06-14 19:00-04','CIV','ECU','Ivory Coast','Ecuador',             'E','group','Lincoln Financial Field, Philadelphia','upcoming'),
-- Matchday 2
('2026-06-20 16:00-04','GER','CIV','Germany','Ivory Coast',             'E','group','BMO Field, Toronto','upcoming'),
('2026-06-20 19:00-05','ECU','CUW','Ecuador','Curaçao',                 'E','group','Arrowhead Stadium, Kansas City','upcoming'),
-- Matchday 3
('2026-06-25 16:00-04','CUW','CIV','Curaçao','Ivory Coast',            'E','group','Lincoln Financial Field, Philadelphia','upcoming'),
('2026-06-25 16:00-04','ECU','GER','Ecuador','Germany',                 'E','group','MetLife Stadium, East Rutherford','upcoming'),

-- ── GROUP F  (NED · JPN · SWE · TUN) ─────────────────────
-- Matchday 1
('2026-06-14 15:00-05','NED','JPN','Netherlands','Japan',               'F','group','AT&T Stadium, Arlington','upcoming'),
('2026-06-14 20:00-06','SWE','TUN','Sweden','Tunisia',                  'F','group','Estadio BBVA, Monterrey','upcoming'),
-- Matchday 2
('2026-06-20 12:00-05','NED','SWE','Netherlands','Sweden',              'F','group','NRG Stadium, Houston','upcoming'),
('2026-06-20 22:00-06','TUN','JPN','Tunisia','Japan',                   'F','group','Estadio BBVA, Monterrey','upcoming'),
-- Matchday 3
('2026-06-25 18:00-05','JPN','SWE','Japan','Sweden',                    'F','group','AT&T Stadium, Arlington','upcoming'),
('2026-06-25 18:00-05','TUN','NED','Tunisia','Netherlands',             'F','group','Arrowhead Stadium, Kansas City','upcoming'),

-- ── GROUP G  (BEL · IRN · EGY · NZL) ─────────────────────
-- Matchday 1
('2026-06-15 12:00-07','BEL','EGY','Belgium','Egypt',                   'G','group','Lumen Field, Seattle','upcoming'),
('2026-06-15 18:00-07','IRN','NZL','Iran','New Zealand',                'G','group','SoFi Stadium, Los Angeles','upcoming'),
-- Matchday 2
('2026-06-21 12:00-07','BEL','IRN','Belgium','Iran',                    'G','group','SoFi Stadium, Los Angeles','upcoming'),
('2026-06-21 18:00-07','NZL','EGY','New Zealand','Egypt',               'G','group','BC Place, Vancouver','upcoming'),
-- Matchday 3
('2026-06-26 20:00-07','EGY','IRN','Egypt','Iran',                      'G','group','Lumen Field, Seattle','upcoming'),
('2026-06-26 20:00-07','NZL','BEL','New Zealand','Belgium',             'G','group','BC Place, Vancouver','upcoming'),

-- ── GROUP H  (ESP · URU · KSA · CPV) ─────────────────────
-- Matchday 1
('2026-06-15 12:00-04','ESP','CPV','Spain','Cape Verde',                'H','group','Mercedes-Benz Stadium, Atlanta','upcoming'),
('2026-06-15 18:00-04','KSA','URU','Saudi Arabia','Uruguay',            'H','group','Hard Rock Stadium, Miami','upcoming'),
-- Matchday 2
('2026-06-21 12:00-04','ESP','KSA','Spain','Saudi Arabia',              'H','group','Mercedes-Benz Stadium, Atlanta','upcoming'),
('2026-06-21 18:00-04','URU','CPV','Uruguay','Cape Verde',              'H','group','Hard Rock Stadium, Miami','upcoming'),
-- Matchday 3
('2026-06-26 19:00-05','CPV','KSA','Cape Verde','Saudi Arabia',        'H','group','NRG Stadium, Houston','upcoming'),
('2026-06-26 18:00-06','URU','ESP','Uruguay','Spain',                   'H','group','Estadio Akron, Guadalajara','upcoming'),

-- ── GROUP I  (FRA · SEN · NOR · IRQ) ─────────────────────
-- Matchday 1
('2026-06-16 15:00-04','FRA','SEN','France','Senegal',                  'I','group','MetLife Stadium, East Rutherford','upcoming'),
('2026-06-16 18:00-04','IRQ','NOR','Iraq','Norway',                     'I','group','Gillette Stadium, Boston','upcoming'),
-- Matchday 2
('2026-06-22 17:00-04','FRA','IRQ','France','Iraq',                     'I','group','Lincoln Financial Field, Philadelphia','upcoming'),
('2026-06-22 20:00-04','NOR','SEN','Norway','Senegal',                  'I','group','MetLife Stadium, East Rutherford','upcoming'),
-- Matchday 3
('2026-06-26 15:00-04','NOR','FRA','Norway','France',                   'I','group','Gillette Stadium, Boston','upcoming'),
('2026-06-26 15:00-04','SEN','IRQ','Senegal','Iraq',                    'I','group','BMO Field, Toronto','upcoming'),

-- ── GROUP J  (ARG · AUT · ALG · JOR) ─────────────────────
-- Matchday 1
('2026-06-16 20:00-05','ARG','ALG','Argentina','Algeria',               'J','group','Arrowhead Stadium, Kansas City','upcoming'),
('2026-06-16 21:00-07','AUT','JOR','Austria','Jordan',                  'J','group','Levi''s Stadium, San Francisco','upcoming'),
-- Matchday 2
('2026-06-22 12:00-05','ARG','AUT','Argentina','Austria',               'J','group','AT&T Stadium, Arlington','upcoming'),
('2026-06-22 20:00-07','JOR','ALG','Jordan','Algeria',                  'J','group','Levi''s Stadium, San Francisco','upcoming'),
-- Matchday 3
('2026-06-27 21:00-05','ALG','AUT','Algeria','Austria',                 'J','group','Arrowhead Stadium, Kansas City','upcoming'),
('2026-06-27 21:00-05','JOR','ARG','Jordan','Argentina',                'J','group','AT&T Stadium, Arlington','upcoming'),

-- ── GROUP K  (POR · COL · UZB · COD) ─────────────────────
-- Matchday 1
('2026-06-17 12:00-05','POR','COD','Portugal','Congo DR',               'K','group','NRG Stadium, Houston','upcoming'),
('2026-06-17 20:00-06','UZB','COL','Uzbekistan','Colombia',             'K','group','Estadio Azteca, Mexico City','upcoming'),
-- Matchday 2
('2026-06-23 12:00-05','POR','UZB','Portugal','Uzbekistan',             'K','group','NRG Stadium, Houston','upcoming'),
('2026-06-23 20:00-06','COL','COD','Colombia','Congo DR',               'K','group','Estadio Akron, Guadalajara','upcoming'),
-- Matchday 3
('2026-06-27 19:30-04','COL','POR','Colombia','Portugal',               'K','group','Hard Rock Stadium, Miami','upcoming'),
('2026-06-27 19:30-04','COD','UZB','Congo DR','Uzbekistan',             'K','group','Mercedes-Benz Stadium, Atlanta','upcoming'),

-- ── GROUP L  (ENG · CRO · GHA · PAN) ─────────────────────
-- Matchday 1
('2026-06-17 15:00-05','ENG','CRO','England','Croatia',                 'L','group','AT&T Stadium, Arlington','upcoming'),
('2026-06-17 19:00-04','GHA','PAN','Ghana','Panama',                    'L','group','BMO Field, Toronto','upcoming'),
-- Matchday 2
('2026-06-23 16:00-04','ENG','GHA','England','Ghana',                   'L','group','Gillette Stadium, Boston','upcoming'),
('2026-06-23 19:00-04','PAN','CRO','Panama','Croatia',                  'L','group','BMO Field, Toronto','upcoming'),
-- Matchday 3
('2026-06-27 17:00-04','PAN','ENG','Panama','England',                  'L','group','MetLife Stadium, East Rutherford','upcoming'),
('2026-06-27 17:00-04','CRO','GHA','Croatia','Ghana',                   'L','group','Lincoln Financial Field, Philadelphia','upcoming'),

-- ═══════════════════════════════════════════════════════════
-- ROUND OF 32  (M73–M88) — TBD teams, admin updates after groups
-- ═══════════════════════════════════════════════════════════
('2026-06-28 12:00-07','TBD','TBD','2nd Group A','2nd Group B',        'R32','r32','SoFi Stadium, Los Angeles','upcoming'),       -- M73
('2026-06-29 12:00-05','TBD','TBD','1st Group C','2nd Group F',        'R32','r32','NRG Stadium, Houston','upcoming'),            -- M76
('2026-06-29 15:30-04','TBD','TBD','1st Group E','3rd (A/B/C/D/F)',    'R32','r32','Gillette Stadium, Boston','upcoming'),        -- M74
('2026-06-29 19:00-06','TBD','TBD','1st Group F','2nd Group C',        'R32','r32','Estadio BBVA, Monterrey','upcoming'),         -- M75
('2026-06-30 12:00-05','TBD','TBD','2nd Group E','2nd Group I',        'R32','r32','AT&T Stadium, Arlington','upcoming'),         -- M78
('2026-06-30 17:00-04','TBD','TBD','1st Group I','3rd (C/D/F/G/H)',    'R32','r32','MetLife Stadium, East Rutherford','upcoming'),-- M77
('2026-06-30 19:00-06','TBD','TBD','1st Group A','3rd (C/E/F/H/I)',    'R32','r32','Estadio Azteca, Mexico City','upcoming'),     -- M79
('2026-07-01 12:00-04','TBD','TBD','1st Group L','3rd (E/H/I/J/K)',    'R32','r32','Mercedes-Benz Stadium, Atlanta','upcoming'),  -- M80
('2026-07-01 13:00-07','TBD','TBD','1st Group G','3rd (A/E/H/I/J)',    'R32','r32','Lumen Field, Seattle','upcoming'),            -- M82
('2026-07-01 17:00-07','TBD','TBD','1st Group D','3rd (B/E/F/I/J)',    'R32','r32','Levi''s Stadium, San Francisco','upcoming'),  -- M81
('2026-07-02 12:00-07','TBD','TBD','1st Group H','2nd Group J',        'R32','r32','SoFi Stadium, Los Angeles','upcoming'),       -- M84
('2026-07-02 19:00-04','TBD','TBD','2nd Group K','2nd Group L',        'R32','r32','BMO Field, Toronto','upcoming'),              -- M83
('2026-07-02 20:00-07','TBD','TBD','1st Group B','3rd (E/F/G/I/J)',    'R32','r32','BC Place, Vancouver','upcoming'),             -- M85
('2026-07-03 13:00-05','TBD','TBD','2nd Group D','2nd Group G',        'R32','r32','AT&T Stadium, Arlington','upcoming'),         -- M88
('2026-07-03 18:00-04','TBD','TBD','1st Group J','2nd Group H',        'R32','r32','Hard Rock Stadium, Miami','upcoming'),        -- M86
('2026-07-03 20:30-05','TBD','TBD','1st Group K','3rd (D/E/I/J/L)',    'R32','r32','Arrowhead Stadium, Kansas City','upcoming'),  -- M87

-- ═══════════════════════════════════════════════════════════
-- ROUND OF 16  (M89–M96)
-- ═══════════════════════════════════════════════════════════
('2026-07-04 12:00-05','TBD','TBD','Winner M73','Winner M75',          'R16','r16','NRG Stadium, Houston','upcoming'),            -- M90
('2026-07-04 17:00-04','TBD','TBD','Winner M74','Winner M77',          'R16','r16','Lincoln Financial Field, Philadelphia','upcoming'),-- M89
('2026-07-05 16:00-04','TBD','TBD','Winner M76','Winner M78',          'R16','r16','MetLife Stadium, East Rutherford','upcoming'), -- M91
('2026-07-05 18:00-06','TBD','TBD','Winner M79','Winner M80',          'R16','r16','Estadio Azteca, Mexico City','upcoming'),     -- M92
('2026-07-06 14:00-05','TBD','TBD','Winner M83','Winner M84',          'R16','r16','AT&T Stadium, Arlington','upcoming'),         -- M93
('2026-07-06 17:00-07','TBD','TBD','Winner M81','Winner M82',          'R16','r16','Lumen Field, Seattle','upcoming'),            -- M94
('2026-07-07 12:00-04','TBD','TBD','Winner M86','Winner M88',          'R16','r16','Mercedes-Benz Stadium, Atlanta','upcoming'),  -- M95
('2026-07-07 13:00-07','TBD','TBD','Winner M85','Winner M87',          'R16','r16','BC Place, Vancouver','upcoming'),             -- M96

-- ═══════════════════════════════════════════════════════════
-- QUARTER-FINALS  (M97–M100)
-- ═══════════════════════════════════════════════════════════
('2026-07-09 16:00-04','TBD','TBD','Winner M89','Winner M90',          'QF','qf','Gillette Stadium, Boston','upcoming'),          -- M97
('2026-07-10 12:00-07','TBD','TBD','Winner M93','Winner M94',          'QF','qf','SoFi Stadium, Los Angeles','upcoming'),         -- M98
('2026-07-11 17:00-04','TBD','TBD','Winner M91','Winner M92',          'QF','qf','Hard Rock Stadium, Miami','upcoming'),          -- M99
('2026-07-11 20:00-05','TBD','TBD','Winner M95','Winner M96',          'QF','qf','Arrowhead Stadium, Kansas City','upcoming'),    -- M100

-- ═══════════════════════════════════════════════════════════
-- SEMI-FINALS  (M101–M102)
-- ═══════════════════════════════════════════════════════════
('2026-07-14 14:00-05','TBD','TBD','Winner M97','Winner M98',          'SF','sf','AT&T Stadium, Arlington','upcoming'),           -- M101
('2026-07-15 15:00-04','TBD','TBD','Winner M99','Winner M100',         'SF','sf','Mercedes-Benz Stadium, Atlanta','upcoming'),    -- M102

-- ═══════════════════════════════════════════════════════════
-- 3RD PLACE + FINAL  (M103–M104)
-- ═══════════════════════════════════════════════════════════
('2026-07-18 17:00-04','TBD','TBD','SF Loser 1','SF Loser 2',          '3rd','third','Hard Rock Stadium, Miami','upcoming'),      -- M103
('2026-07-19 15:00-04','TBD','TBD','Winner M101','Winner M102',        'Final','final','MetLife Stadium, East Rutherford','upcoming'); -- M104
