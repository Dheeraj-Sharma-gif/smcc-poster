import { getSupabase } from "@/lib/supabase/client";
import { fetchJson } from "@/lib/services/platforms/base";

/**
 * YouTube Analytics API needs OAuth (not just an API key). This module runs the
 * OAuth2 "authorization code" flow, stores the refresh token in Supabase, and
 * exchanges it for short-lived access tokens to read watch-time / avg-duration.
 *
 * Setup (one-time) — see SETUP_GUIDE.md §3b:
 *  - Create an OAuth Client (Web) in Google Cloud, add redirect URI
 *    <app-origin>/api/youtube/oauth/callback
 *  - Set YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET in .env
 */

// Read analytics + reply to comments (force-ssl grants comment write).
const SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.force-ssl";
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";

export function isOAuthConfigured(): boolean {
  // Return mock data - real YouTube OAuth disabled
  return false;
}

function redirectUri(origin: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || origin;
  return `${base.replace(/\/$/, "")}/api/youtube/oauth/callback`;
}

export function getAuthUrl(origin: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH}?${params.toString()}`;
}

export async function exchangeCode(code: string, origin: string): Promise<boolean> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET!,
    redirect_uri: redirectUri(origin),
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) return false;
  const json = await res.json();
  if (!json.refresh_token) return false;
  await storeRefreshToken(json.refresh_token);
  return true;
}

async function storeRefreshToken(token: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.from("oauth_tokens").upsert({ provider: "youtube", refresh_token: token, updated_at: new Date().toISOString() });
}

async function getRefreshToken(): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from("oauth_tokens").select("refresh_token").eq("provider", "youtube").single();
  return data?.refresh_token || null;
}

export async function isYouTubeAnalyticsConnected(): Promise<boolean> {
  return Boolean(await getRefreshToken());
}

/** Exposed for actions that need a live access token (e.g. posting a reply). */
export async function getYouTubeAccessToken(): Promise<string | null> {
  return getAccessToken();
}

async function getAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh || !isOAuthConfigured()) return null;
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET!,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token || null;
}

export interface YtAnalytics {
  estimatedMinutesWatched: number;
  averageViewDuration: number; // seconds
  views: number;
}

/** Returns real watch-time analytics, or null if not connected/available. */
export async function getYouTubeAnalytics(days: number): Promise<YtAnalytics | null> {
  const access = await getAccessToken();
  if (!access) return null;
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  try {
    const data = await fetchJson<any>(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=estimatedMinutesWatched,averageViewDuration,views&access_token=${access}`
    );
    const row = data.rows?.[0] || [0, 0, 0];
    return { estimatedMinutesWatched: row[0] || 0, averageViewDuration: row[1] || 0, views: row[2] || 0 };
  } catch {
    return null;
  }
}

export interface YtDailyRow {
  date: string; // YYYY-MM-DD
  views: number;
  watchMinutes: number;
  likes: number;
  comments: number;
  subsGained: number;
  subsLost: number;
}

/**
 * REAL daily analytics (per-day rows) from the YouTube Analytics API.
 * This is what powers accurate, date-ranged charts. Returns null if not
 * connected. Note: analytics data lags ~2-3 days, so recent days may be absent.
 */
export async function getYouTubeDailyAnalytics(days: number): Promise<YtDailyRow[] | null> {
  const access = await getAccessToken();
  if (!access) return null;
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const metrics = "views,estimatedMinutesWatched,likes,comments,subscribersGained,subscribersLost";
  try {
    const data = await fetchJson<any>(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${start}&endDate=${end}&metrics=${metrics}&dimensions=day&sort=day&access_token=${access}`
    );
    const headers: string[] = (data.columnHeaders || []).map((h: any) => h.name);
    const idx = (name: string) => headers.indexOf(name);
    const di = idx("day"),
      vi = idx("views"),
      wi = idx("estimatedMinutesWatched"),
      li = idx("likes"),
      ci = idx("comments"),
      gi = idx("subscribersGained"),
      lo = idx("subscribersLost");
    return (data.rows || []).map((r: any[]): YtDailyRow => ({
      date: r[di],
      views: Number(r[vi] || 0),
      watchMinutes: Number(r[wi] || 0),
      likes: Number(r[li] || 0),
      comments: Number(r[ci] || 0),
      subsGained: Number(r[gi] || 0),
      subsLost: Number(r[lo] || 0),
    }));
  } catch {
    return null;
  }
}
