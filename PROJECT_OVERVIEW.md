# SMCC — Project Overview & Changelog

_Social Media Command Center for WFYI Technology — built for Sinu Gupta (admin)._

This file summarises everything in the project and what was set up.

---

## What it is

A premium, single-admin **Mission Control** dashboard that aggregates analytics
from **Instagram, Facebook, LinkedIn, YouTube and X** using official APIs — with
AI insights, historical snapshots, reports, and a content studio.

Stack: **Next.js 15 · TypeScript · Tailwind v4 · Recharts · Framer Motion ·
Supabase · Gemini (free AI)**. Dark-first glassmorphism UI, fully responsive.

---

## Pages (left sidebar)

**Core**
- **Mission Control** — 8 KPI cards, health score (0–100), best/weakest platform,
  personalised morning brief, action center, growth chart (7/30/90-day),
  per-platform overview cards. Greets you by name.
- **Instagram / Facebook / LinkedIn / YouTube / X** — per-platform metrics,
  trend chart, and top content. Now with a **7 / 30 / 90 / custom date-range**
  selector on each page.

**Tools (new)**
- **Content Studio** — AI post ideas + captions + hashtags, tuned to your
  tax/finance brand and audience. Pick platform, topic, tone → copy-ready posts.
- **Compare** — all platforms overlaid on one metric chart + a leaderboard.
- **Competitors** — track rival accounts (ClearTax, Groww, Zerodha…) vs you.
- **Inbox** — recent comments across channels with one-click AI reply drafts.

**Other**
- **Reports** — daily/weekly/monthly/custom ranges + PDF / Excel / CSV export.
- **AI Insights** — executive summary, recommendations, best posting times,
  consistency score, trend detection, action items.
- **Settings** — theme, auto-refresh, connection status, YouTube Analytics
  connect button.

---

## Set up for you this session

| Thing | Status |
|---|---|
| Full app (all pages, DB schema, API integration code) | ✅ Built |
| Supabase (project "SMCC" + schema + new tables) | ✅ Connected & verified |
| AI narrative — **free Google Gemini** (`gemini-flash-latest`) | ✅ Configured |
| Admin login — username `Srbrother`, password `wearebrothers`, `AUTH_SECRET` | ✅ Set |
| Personalisation — your name across sidebar, topbar, dashboard, login, AI brief | ✅ Done |

> AI note: the free Gemini quota resets daily. Heavy testing exhausted today's
> allowance; for your 2–3 uses/day it's plenty and works from tomorrow onward.
> Until AI quota is available, AI sections show smart templated output.

---

## What's live vs pending

- **Live today:** whole UI, Compare, date-ranges, reports, Supabase history,
  personalisation. (AI features: live once daily Gemini quota is available.)
- **Live once you add platform API keys:** all real Instagram/Facebook/LinkedIn/
  YouTube/X data, competitor real stats, real comments. Until then: labelled
  sample data. See `SETUP_GUIDE.md`.
- **Needs a one-time setup:** YouTube Analytics (watch-time / avg-duration) needs
  a Google Cloud OAuth client — connect from Settings after adding the keys.

---

## Project structure (for VS Code)

```
smcc/
  app/
    (app)/            authenticated pages (dashboard, platforms, tools, reports…)
    api/              backend routes (overview, sync, insights, content,
                      compare, competitors, inbox, youtube/oauth, …)
    login/            single-admin login
  components/         ui/, layout/, dashboard/, charts/, platform/, icons/
  lib/
    config.ts         platform registry (add a new source here)
    auth.ts           signed-cookie session + admin name
    services/
      platforms/      one service per platform (real API + mock fallback)
      ai/             insights + content generator (Gemini/Groq/Anthropic)
      competitors.ts  comments.ts  snapshots.ts  settings.ts  notifications.ts
      youtube-oauth.ts
    export/           PDF / XLSX / CSV
  supabase/schema.sql database schema
  .env.local          your secrets (git-ignored)
  SETUP_GUIDE.md      how to get each platform's API keys
```

---

## Run it

```bash
cd smcc
npm run dev        # http://localhost:3000  → login: Srbrother / wearebrothers
```

To change your display name later: edit `ADMIN_NAME` in `.env.local` and restart.
