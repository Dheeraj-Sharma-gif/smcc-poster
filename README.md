# SMCC — Social Media Command Center

A premium, single-admin **Mission Control** dashboard that aggregates analytics
from **Instagram Business, Facebook Page, LinkedIn Company Page, YouTube Channel
and X (Twitter)** using their official APIs — with AI insights, historical
snapshots, and PDF/CSV/Excel reports.

Built for WFYI Technology. Next.js 15 · TypeScript · Tailwind v4 · Recharts ·
Framer Motion · Supabase · Vercel.

---

## Runs today, live tomorrow

Every platform uses a **provider pattern**: when its API credentials are present
in the environment it pulls **live official-API data**; otherwise it renders
realistic, deterministic **sample data** and clearly labels it "Sample". So the
whole dashboard is fully explorable right now, and each channel flips to live the
moment you add its keys — no code changes.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then edit .env.local (see SETUP_GUIDE.md)
npm run dev                    # http://localhost:3000
```

Default login (change these in `.env.local`):

- **Username:** `admin`
- **Password:** `admin123`

Then follow **SETUP_GUIDE.md** to add each platform's API credentials and connect
Supabase for historical snapshots.

---

## Features

- **Mission Control dashboard** — 8 KPI cards, 0–100 health score with breakdown,
  best/weakest platform, AI morning brief, today's action center, multi-metric
  growth chart (7/30/90-day), and per-platform overview cards with sparklines.
- **Five platform pages** — full metric tiles + trend chart + top content for
  Instagram, Facebook, LinkedIn, YouTube and X.
- **AI Insights** — executive summary, recommendations, best posting times,
  posting-consistency scores, trend detection, action items, top content. Model
  narrative via Anthropic when a key is set; high-quality templated narrative
  otherwise. All analytics are computed deterministically so they always work.
- **Reports** — daily/weekly/monthly/custom ranges, interactive charts, and one
  click **PDF / Excel / CSV** export.
- **Historical snapshots** — a daily snapshot per platform stored in Supabase
  (via `/api/sync`, wired to a Vercel Cron).
- **Notifications** — follower milestones, reach up/down, low posting frequency,
  top content.
- **Polish** — dark-first glassmorphism UI, Light/System themes, auto-refresh
  (5/10/30 min), skeleton loaders, smooth Framer Motion animations, fully
  responsive.

## Architecture

```
app/
  (app)/            authenticated pages (share sidebar + topbar shell)
    dashboard/  instagram/ facebook/ linkedin/ youtube/ x/
    reports/  insights/  settings/
  api/              route handlers (overview, timeseries, sync, insights, …)
  login/            single-admin login
components/          ui primitives, layout, dashboard, charts, platform, icons
lib/
  config.ts         platform registry — add a new source here
  auth.ts           signed-cookie session (single admin)
  services/
    platforms/      one service per platform (real API + mock fallback) + aggregator
    ai/             insights engine (deterministic + optional model narrative)
    snapshots.ts    Supabase persistence (degrades to no-op without DB)
    notifications.ts / settings.ts
  export/           PDF / XLSX / CSV exporters
  supabase/         server client
supabase/schema.sql database schema
```

**Extending later** (GA4, Google/Meta Ads, Search Console, email reports): add a
config entry in `lib/config.ts` and a matching service in
`lib/services/platforms/`. The dashboard, reports and AI layers pick it up
automatically.

## Deploy (Vercel)

1. Push this folder to a Git repo and import it in Vercel.
2. Add every variable from `.env.example` in Vercel → Project → Settings →
   Environment Variables.
3. `vercel.json` already registers a daily cron that calls `/api/sync` to store
   the historical snapshot (protected by `CRON_SECRET`).

## Notes

- Some deeper metrics (YouTube watch-time / average view duration, LinkedIn
  per-post detail, X organic impressions) require the respective platform's
  OAuth analytics scope or a paid API tier. Those fields degrade gracefully and
  are documented inline in each service file.
- No `localStorage`/`sessionStorage` is used; all state is in-memory or in
  Supabase.
