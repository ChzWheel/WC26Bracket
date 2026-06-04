# Manual To-Do — Steps Only You Can Do

Everything below comes from this session's changes. Do them in order.

## 1. Run the database migration (required — app breaks without it)

1. Go to https://supabase.com → your project → **SQL Editor**
2. Open `migration-guest-brackets.sql` from this folder
3. Paste the entire contents and click **Run**

Until this runs, creating a bracket will error (the app now writes a `guest_name`
column that doesn't exist yet in your database).

## 2. Rotate your API-Football key (security)

Your old key is permanently visible in the GitHub repo's history.

1. Log in to your API-Football / RapidAPI dashboard
2. Regenerate the API key
3. Update it in your **local `config.js`** (it's gitignored now, so this stays local)

## 3. Add GitHub repo secrets (required for Pages deploys)

Repo: https://github.com/ChzWheel/WC26Bracket → **Settings** →
**Secrets and variables** → **Actions** → **New repository secret**. Add three:

| Secret name | Value |
|---|---|
| `SUPABASE_URL` | copy from your local `config.js` |
| `SUPABASE_ANON` | copy from your local `config.js` |
| `RAPIDAPI_KEY` | the NEW key from step 2 |

## 4. Switch GitHub Pages to deploy via Actions

Repo **Settings** → **Pages** → **Build and deployment** → **Source**:
change "Deploy from a branch" to **"GitHub Actions"**.

(Pages now deploys through `.github/workflows/deploy-pages.yml`, which builds
`config.js` from the secrets in step 3.)

## 5. Update the Netlify env var

Netlify dashboard → your site → **Site configuration** → **Environment variables**:
set `RAPIDAPI_KEY` to the new key from step 2. (`SUPABASE_URL` / `SUPABASE_ANON`
should already be there — verify while you're in there.)

## 6. Commit and push to test

```
git add -A
git commit -m "Guest brackets, bracket-centric leaderboards, Pages deploy via Actions"
git push origin test
```

Note: the commit will show `config.js` as deleted — that's correct. It's only
removed from git tracking; your local file is untouched.

## 7. Verify the deploy

1. Repo → **Actions** tab → watch "Deploy test site to GitHub Pages" go green
2. Open the Pages site and **hard-refresh** (Ctrl+Shift+R — Pages caches aggressively)
3. Quick feature check:
   - Create a bracket with the "For someone else?" field filled in → their name
     shows on the bracket card
   - Submit two brackets to the same pool → leaderboard shows two rows, bracket
     name on top, owner name beneath

## 8. Later — when test looks good

Merge/push to `master` so Netlify picks it up. The migration (step 1) already
covers both since they share one Supabase database.
