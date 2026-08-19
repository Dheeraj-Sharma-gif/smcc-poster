# SMCC — Railway Deployment Guide

No code changes are needed. This is pure configuration. Follow top-to-bottom.

---

## 1. Get the code onto Railway

**Option A — GitHub (recommended):**
1. Push the `smcc` folder to a **private** GitHub repo (keep it private — even though `.env.local` is git-ignored, keep the repo private).
2. Railway → **New Project → Deploy from GitHub repo** → pick the repo.
3. Railway auto-detects Next.js (Nixpacks). Build = `npm run build`, Start = `npm run start` (already correct in package.json).

**Option B — Railway CLI:**
```
npm i -g @railway/cli
railway login
railway init        # inside the smcc folder
railway up
```

> Next.js `next start` reads Railway's `PORT` automatically. If the app ever fails to bind, change the start script to: `"start": "next start -p ${PORT:-3000}"`.

---

## 2. Add Environment Variables (Railway → Variables)

Copy every value from your local `.env.local`. **Do not skip any** — a missing key makes that platform fall back to sample data or breaks login.

| Variable | Value source | Notes |
|---|---|---|
| `ADMIN_USERNAME` | your choice | login user |
| `ADMIN_PASSWORD` | **set a STRONG one** | app is now public — don't reuse the weak dev password |
| `AUTH_SECRET` | from `.env.local` | session signing key |
| `ADMIN_NAME` | `Sinu Gupta` | shown in UI |
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` | |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` | keep secret |
| `GEMINI_API_KEY` | from `.env.local` | AI narrative |
| `GEMINI_MODEL` | `gemini-flash-latest` | |
| `ANTHROPIC_API_KEY` | (optional, blank ok) | |
| `ANTHROPIC_MODEL` | `claude-3-5-haiku-latest` | |
| `META_ACCESS_TOKEN` | from `.env.local` (Page token) | works from any server — no domain lock |
| `FACEBOOK_PAGE_ID` | `996611560195961` | |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | `17841479684615752` | |
| `YOUTUBE_API_KEY` | from `.env.local` | |
| `YOUTUBE_CHANNEL_ID` | `UCWj7fByez7nEE7Iq68VPptA` | |
| `YOUTUBE_OAUTH_CLIENT_ID` | from `.env.local` | |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | from `.env.local` | |
| `LINKEDIN_ACCESS_TOKEN` | (add after LinkedIn approval) | leave unset for now → shows Sample |
| `LINKEDIN_ORGANIZATION_ID` | (add after approval) | |
| `LINKEDIN_API_VERSION` | `202405` | |
| `CRON_SECRET` | from `.env.local` | used by the daily snapshot cron |
| `NEXT_PUBLIC_APP_URL` | **your Railway URL** | e.g. `https://smcc-production.up.railway.app` (set AFTER you get the domain in step 3) |

---

## 3. Get your public domain

Railway → your service → **Settings → Networking → Generate Domain**.
You'll get something like `https://smcc-production.up.railway.app`.

Now go back and set `NEXT_PUBLIC_APP_URL` to that exact URL, then redeploy.

---

## 4. Update OAuth redirect URIs (important for re-connects)

- **YouTube (Google Cloud Console → your OAuth client → Authorized redirect URIs):**
  add `https://<your-railway-domain>/api/youtube/oauth/callback`
  (YouTube already connected via the stored refresh token, so analytics keeps working even before this — this is only needed if you ever re-connect.)

- **LinkedIn (after approval, developer app → Auth):**
  add `https://<your-railway-domain>/api/linkedin/oauth/callback`

---

## 5. Daily history snapshot (optional)

Live data is real-time on every page load — this is only for the historical trend charts.
Snapshots already save automatically whenever you (the admin) have the dashboard open (auto-refresh).
For a guaranteed daily snapshot even when the app is closed, add ONE of:

- **External cron** (easiest): a free scheduler (e.g. cron-job.org) that does a daily
  `GET https://<your-railway-domain>/api/sync?secret=<your CRON_SECRET value>`
- **Railway Cron**: a small cron service that runs
  `curl "https://<your-railway-domain>/api/sync?secret=<your CRON_SECRET value>"`

(The `/api/sync` route already validates `?secret=` against `CRON_SECRET` — no code change needed.)

---

## 6. Verify after deploy

1. Open your Railway URL → log in with your admin credentials.
2. Check Instagram / Facebook / YouTube pages show **"Live API"** (green) with real numbers.
3. LinkedIn shows **"Sample data"** until you add its token — that's expected.
4. Dashboard totals reflect only the connected platforms.

That's it. Everything else (Supabase, Gemini, Meta, YouTube) works from Railway with no changes.
