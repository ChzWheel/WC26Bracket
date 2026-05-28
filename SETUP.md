# Brackt WC26 — Setup & Deployment Guide

## Step 1: Run the database schema in Supabase

1. Go to https://supabase.com → your project → **SQL Editor**
2. Open `schema.sql` from this folder
3. Paste the entire contents and click **Run**
4. You should see "Success" — this creates all tables and security rules

---

## Step 2: Make yourself an admin

After your first login to the app, grab your user ID from Supabase:

1. Go to Supabase → **Authentication** → **Users**
2. Find your email, copy the **UUID** (looks like `abc123de-...`)
3. Go back to **SQL Editor** and run:

```sql
update app_settings
set value = '["YOUR-UUID-HERE"]'::jsonb
where key = 'admin_ids';
```

Replace `YOUR-UUID-HERE` with your actual UUID. After this, you'll see an ⚙ Admin
link in the top nav when logged in.

---

## Step 3: Disable email confirmation (optional but recommended for family use)

By default Supabase requires email confirmation. To skip this:

1. Go to Supabase → **Authentication** → **Providers** → **Email**
2. Toggle **"Confirm email"** OFF
3. Save

This lets family members sign up and log in immediately without checking email.

---

## Step 4: Assemble your project files

Your final folder structure should look like this:

```
brackt/
├── Brackt.html          ← (from this output)
├── app.jsx              ← (from this output)
├── supabase.js          ← (from this output)
├── data.js              ← (UNCHANGED from original)
├── styles.css           ← (UNCHANGED from original)
├── ui-shared.jsx        ← (UNCHANGED from original)
├── tweaks-panel.jsx     ← (UNCHANGED from original)
└── screens/
    ├── sign-in.jsx      ← (from this output)
    ├── dashboard.jsx    ← (from this output)
    ├── schedule.jsx     ← (from this output)
    ├── admin.jsx        ← (from this output)
    ├── group-stage.jsx  ← (UNCHANGED from original — copy into screens/)
    ├── knockout.jsx     ← (UNCHANGED from original — copy into screens/)
    ├── summary.jsx      ← (UNCHANGED from original — copy into screens/)
    └── pool.jsx         ← (UNCHANGED from original — copy into screens/)
```

**Important:** The original group-stage, knockout, summary, and pool screens
don't need code changes — just move them into the `screens/` subfolder.

---

## Step 5: Deploy to Netlify (free, shareable link)

1. Go to https://netlify.com → sign up free
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag your entire `brackt/` folder onto the upload area
4. Netlify gives you a URL like `https://random-name-123.netlify.app`
5. Optional: Go to **Site settings** → **Domain** to set a custom name like
   `https://brackt-wc26.netlify.app`

Share that URL with your family — they can sign up and start building brackets!

---

## Step 6: Syncing scores during the tournament

### Option A — Automatic hourly sync (recommended)
Set up a free cron job at https://cron-job.org to hit a sync URL once per hour.
(This requires a small Netlify serverless function — ask for help setting this up
when the tournament gets closer.)

### Option B — Manual sync from the admin panel
1. Log in as admin
2. Click **⚙ Admin** in the top nav
3. Click **"⟳ Sync from API-Football now"**
4. Done — scores update for all users instantly

### Option C — Manual override
In the admin panel, click **Edit** next to any match to type in the score directly.
Useful for fixing incorrect API data.

---

## Notes on API-Football free tier

- Free plan: **100 requests/day**
- Each sync = 1 request (fetches all WC fixtures at once)
- 100 requests/day is plenty for hourly syncing (24/day) with room to spare
- The 2026 WC fixtures may not appear in the API until closer to the tournament —
  the app shows mock/preview data until then

---

## Troubleshooting

**"Invalid API key" on sync:** Double-check your RapidAPI key in `supabase.js`

**Users can't sign up:** Check Supabase → Authentication → make sure Email provider is enabled

**Bracket changes not saving:** Open browser DevTools → Console and look for errors.
Most likely a Supabase RLS (row-level security) policy issue — make sure you ran
the full schema.sql

**Admin panel not showing:** Make sure you ran the SQL in Step 2 with your exact UUID
