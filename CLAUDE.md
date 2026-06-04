# Brackt — FIFA World Cup 2026 Bracket App

Dashboard app for friends/family to build WC 2026 brackets and compete in pools.

## Deployment (two branches, two targets)

- **`test` branch → GitHub Pages.** Deployed via GitHub Actions
  (`.github/workflows/deploy-pages.yml`), which generates `config.js` from repo
  secrets at deploy time. Pages source must be set to "GitHub Actions" in repo settings.
- **`master` branch → Netlify.** Build step (`generate-config.js`) creates `config.js`
  from Netlify env vars; scheduled functions (score sync) only run on Netlify.
- Day-to-day changes are pushed to `test` first; treat GitHub Pages as the live test
  environment. Note GitHub Pages **caches aggressively** (unlike Netlify, which has
  no-cache headers) — hard-refresh when verifying changes there.

## Architecture (important — no build tooling)

- **No bundler, no npm, no JSX compile step.** React 18 + Babel Standalone are loaded
  from CDNs in `index.html`. All `.jsx` files are transpiled in the browser at runtime.
- **No imports/exports.** Every file is a plain `<script>` tag. Components and helpers are
  shared via globals (`window.SB`, `window.WC_DATA`, `window.AppConfig`, and
  `Object.assign(window, {...})` in `ui-shared.jsx`).
- **Script load order matters** and is defined in `index.html`:
  `config.js → data.js → supabase.js → ui-shared.jsx → screens/*.jsx → app.jsx`.
  New files must be added to `index.html` in the right position.
- Backend is **Supabase** (auth + Postgres with RLS). Live scores come from
  **API-Football** via a scheduled Netlify function (`netlify/functions/sync-live.js`).

## File map

| File | Purpose |
|---|---|
| `index.html` | Entry point; CDN deps + script load order |
| `config.js` | Supabase/API keys. **Gitignored** — exists locally only; generated at deploy by `generate-config.js` (Netlify env vars on `master`, GitHub Actions secrets on `test`). `config.example.js` is the template |
| `data.js` | `window.WC_DATA` — 48 teams, official group draw, `buildSeededGroups()` |
| `supabase.js` | `window.SB` — Supabase client + all DB helpers (`Auth`, `Profiles`, `Brackets`, `Pools`, `Matches`, `Admin`) + API-Football fixture mapping |
| `app.jsx` | App shell: auth listener, routing, dispatch, `TopBar`, `Spinner` (globe loader), `NotFound` |
| `ui-shared.jsx` | Shared components: `Flag`, `TeamChip`, `Stepper`, `Modal`, `fmtDate` |
| `styles.css` | All styling; CSS custom properties, light/dark themes via `data-theme` |
| `screens/*.jsx` | One file per screen |
| `schema.sql` | Full Supabase schema + RLS policies (run in Supabase SQL editor) |
| `netlify/functions/sync-live.js` | Scheduled score sync (every 15 min during match hours) |
| `SETUP.md` | Deployment/setup guide |
| `bug list.txt` | User's running bug list |

## Routing & state (read before adding a screen)

- Routing is a simple state object: `route = { screen: 'name', bracketId?, poolId? }`.
  Navigate with the `nav(route)` prop (pushes history state, sets `document.title`).
- All app state lives in `App` (app.jsx): `user`, `brackets`, `pools`, `isAdmin`.
  Screens receive `state`, `dispatch`, `nav` as props — no context, no redux.
- Mutations go through `dispatch({ type: 'ACTION', ... })` in app.jsx, which calls
  `bracketOps`/`poolOps` → `window.SB.*` → Supabase, then updates local state.
  Async results return via an `action._resolve` callback pattern.

### To add a new screen
1. Create `screens/my-screen.jsx` defining a global component function (no export).
2. Add `<script type="text/babel" src="screens/my-screen.jsx"></script>` to `index.html`
   **before** `app.jsx`.
3. In `app.jsx`: add a `case` to the route `switch`, a title to the `titles` map in `nav()`,
   and (if it needs a nav button) an entry in `TopBar`.
4. If it needs new data: add a helper in `supabase.js` (and `schema.sql` + RLS policy
   if a new table), plus a `dispatch` action in app.jsx if it mutates state.

## Conventions

- DB rows are snake_case; app state is camelCase. Convert in `normalizeBracket`/
  `normalizePool` (app.jsx) — follow that pattern for new entities.
- Styling: use existing CSS variables (`--bg`, `--fg`, `--accent`, `--line`, etc.) and
  utility classes (`card`, `padded`, `btn primary`, `muted`, `mono`, `spread`, `main fade-in`).
  Colors are oklch. Both light and dark theme blocks in styles.css must be considered.
- Flags use the flag-icons CDN library via the `Flag` component (`team.iso` codes).
- Hooks are destructured from the global `React` at the top of files that need them.
- Errors in dispatch surface via `alert()`; screens use local `err` state for form errors.

## Domain rules

- 48 teams, 12 groups (A–L), 4 per group. Bracket flow: group stage picks → knockout
  picks → review & submit to a pool.
- **Pool leaderboards are bracket-centric, not member-centric**: one row per submitted
  bracket (bracket name primary, owner name beneath). A user may submit multiple
  brackets to the same pool. Scores live on `brackets.score`/`brackets.correct` —
  `pool_members.score` is deprecated. Any future scoring engine must write to brackets.
- **Guest brackets**: `brackets.guest_name` marks a bracket an account holder manages
  for someone without an account; the guest's name displays as owner everywhere.
- Limit: 10 brackets per account (enforced in dashboard/brackets-list UI only).
- `migration-guest-brackets.sql` must be run once in the Supabase SQL editor on
  existing databases (adds guest_name/score/correct, re-points brackets.user_id FK
  to profiles so PostgREST can embed owner profiles).
- Lock times: group picks lock **midnight CDT June 11, 2026**; knockout picks lock
  **noon CDT June 28, 2026** (hardcoded in screens — search for these dates when changing).
- Scoring: group rank +1, 3rd-place qualifier +5, R32 +10, R16 +20, QF +40, SF +80,
  champion +160 (shown in TopBar help modal).
- Admin access = user UUID listed in `app_settings.admin_ids` (see SETUP.md).

## Gotchas

- API-Football **free tier does not include season 2026** — full sync fails with a plan
  error (bug list #6). Mock/manual data paths exist for pre-tournament use.
- Supabase fires `SIGNED_IN` on tab-visibility changes; `loadedForRef` in app.jsx guards
  against re-fetch loops. Don't remove it.
- Pool deletion has had RLS-related bugs (stale pools reappearing on reload) — verify
  RLS policies in schema.sql when touching pools.
- No localStorage for app state; everything persists to Supabase.
- Babel Standalone means **no TypeScript, no JSX fragments shorthand issues, no modern
  syntax beyond what Babel preset supports** — keep code browser-compatible.
- Netlify headers disable caching for html/js/jsx/css, so deploys take effect immediately.

## Workflow expectations (from user)

- Plan out any major changes before implementing; present alternative options when a
  solution isn't obvious.
- User is relatively new to Python/JS — explain non-obvious decisions briefly.
- Check `bug list.txt` for known issues before changing related areas.
