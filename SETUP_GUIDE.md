# SMCC — API Credentials Setup Guide

This is your step-by-step checklist for getting **live** data into the dashboard.
You can add platforms one at a time — anything you haven't connected yet keeps
showing labelled sample data. Put every value into `.env.local` (copy it from
`.env.example`) and restart `npm run dev`.

> Tip: after adding keys, open **Settings → Platform Connections** in the app.
> Each platform shows a green **Live** badge once its credentials are detected.

---

## 0. Admin login + session secret (do this first)

```
ADMIN_USERNAME=your-username
ADMIN_PASSWORD=a-strong-password
AUTH_SECRET=<paste a long random string>
```

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 1. Instagram Business + Facebook Page (Meta Graph API)

Both share one Meta app and one access token.

1. Your Instagram account must be a **Business/Creator** account, connected to a
   **Facebook Page**.
2. Go to **developers.facebook.com** → **My Apps** → **Create App** → type
   **Business**.
3. Add the **Instagram Graph API** and **Facebook Login** / **Pages** products.
4. In **Graph API Explorer**, generate a **User Access Token** with these
   permissions: `pages_show_list`, `pages_read_engagement`,
   `read_insights`, `instagram_basic`, `instagram_manage_insights`,
   `business_management`.
5. Exchange it for a **long-lived token** (60 days):
   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN
   ```
   (For a token that doesn't expire, generate a **Page access token** from the
   long-lived user token — see Meta docs.)
6. Find your **Page ID**: `https://graph.facebook.com/v21.0/me/accounts?access_token=TOKEN`
7. Find your **Instagram Business Account ID**:
   `https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=TOKEN`

```
META_ACCESS_TOKEN=EAAG...
FACEBOOK_PAGE_ID=1234567890
INSTAGRAM_BUSINESS_ACCOUNT_ID=1789xxxxxxxxx
```

---

## 2. LinkedIn Company Page (Marketing API)

1. Create an app at **linkedin.com/developers** and associate it with your
   Company Page.
2. Request the **Community Management API** (a.k.a. Marketing Developer
   Platform) access. Approval can take a few days.
3. Complete OAuth to get an access token with scopes:
   `r_organization_social`, `rw_organization_admin`, `r_organization_admin`.
4. Your **Organization ID** is the number in your admin page URL:
   `linkedin.com/company/<id>/admin/`.

```
LINKEDIN_ACCESS_TOKEN=AQV...
LINKEDIN_ORGANIZATION_ID=12345678
LINKEDIN_API_VERSION=202405
```

> Note: LinkedIn access approval is the slowest of the five. The page shows
> sample data until it's granted, then flips to live automatically.

---

## 3. YouTube Channel (Data API v3)

1. Go to **console.cloud.google.com** → create/select a project.
2. **APIs & Services → Library →** enable **YouTube Data API v3**.
3. **Credentials → Create Credentials → API key**. Restrict it to the YouTube
   Data API.
4. Find your **Channel ID**: YouTube Studio → **Settings → Channel → Advanced**,
   or the `UC…` id in your channel URL.

```
YOUTUBE_API_KEY=AIza...
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxx
```

> Subscribers, views, likes, comments and top videos come from the API key.
> **Watch time** and **average view duration** need the OAuth-based *YouTube
> Analytics API*; those two fields use a documented estimate until OAuth is
> added.

---

## 4. X / Twitter (API v2)

1. Apply at **developer.x.com** and create a Project + App.
2. Copy the **Bearer Token** from the app's Keys & Tokens.
3. Find your numeric **User ID** (e.g. via `https://api.twitter.com/2/users/by/username/YOUR_HANDLE`).

```
X_BEARER_TOKEN=AAAAAAAA...
X_USER_ID=1490000000000000000
```

> Follower count, recent tweets, likes/replies/reposts work on the Basic tier.
> **Organic impressions** for your own tweets require the user-context
> (OAuth 1.0a/2.0) and a paid tier; the field degrades gracefully otherwise.

---

## 5. Supabase (historical snapshots + settings + notifications)

Without Supabase the app still runs — it just won't persist day-over-day history.

1. Create a project at **supabase.com**.
2. **SQL Editor →** paste and run the contents of `supabase/schema.sql`.
3. **Project Settings → API →** copy the **Project URL** and the
   **service_role** key (server-side only — keep it secret).

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 6. AI narrative (optional)

Enables model-written Executive Summary and Morning Brief. Everything else in
AI Insights already works without it.

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

Get a key at **console.anthropic.com**.

---

## 7. Daily snapshot cron (production only)

`vercel.json` already schedules `/api/sync` daily. Protect it:

```
CRON_SECRET=<another long random string>
```

---

## Verify

1. `npm run dev`
2. Log in.
3. Open **Settings → Platform Connections** — each configured platform shows a
   green **Live** badge; the rest stay on **Sample**.
4. Click **Refresh** in the top bar to pull fresh data and store a snapshot.

That's it. Add keys as they come in — no redeploys or code changes required.
