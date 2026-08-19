import { getSupabase } from "@/lib/supabase/client";

/**
 * Google Analytics 4 (website analytics) uses OAuth, not an API key. This runs
 * the OAuth2 "authorization code" flow as a user who has at least Viewer access
 * to the GA4 property, stores the refresh token in Supabase, and exchanges it
 * for short-lived access tokens to read the GA4 Data API.
 *
 * We reuse the same Google Cloud OAuth client as YouTube (same project). Set a
 * dedicated GOOGLE_OAUTH_CLIENT_ID/SECRET if you prefer; it falls back to the
 * YOUTUBE_OAUTH_* pair so no new client is required.
 *
 * Setup (one-time):
 *  - In the OAuth client, add redirect URI <app-origin>/api/ga/oauth/callback
 *  - Set GA4_PROPERTY_ID (numeric, e.g. 514839376)
 *  - Visit /api/ga/oauth/start signed in as the account that can view the property
 */

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const PROVIDER = "ga4";

function clientId(): string | undefined {
  return process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.YOUTUBE_OAUTH_CLIENT_ID;
}
function clientSecret(): string | undefined {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
}

export function isGa4OAuthConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

export function isGa4Configured(): boolean {
  // Return mock data - real GA4 API disabled
  return false;
}

function redirectUri(origin: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || origin;
  return `${base.replace(/\/$/, "")}/api/ga/oauth/callback`;
}

export function getGa4AuthUrl(origin: string): string {
  const params = new URLSearchParams({
    client_id: clientId()!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `${AUTH}?${params.toString()}`;
}

export async function exchangeGa4Code(code: string, origin: string): Promise<boolean> {
  const body = new URLSearchParams({
    code,
    client_id: clientId()!,
    client_secret: clientSecret()!,
    redirect_uri: redirectUri(origin),
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const json = await res.json();
  if (!json.refresh_token) return false;
  await storeRefreshToken(json.refresh_token);
  return true;
}

async function storeRefreshToken(token: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db
    .from("oauth_tokens")
    .upsert({ provider: PROVIDER, refresh_token: token, updated_at: new Date().toISOString() });
}

async function getRefreshToken(): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from("oauth_tokens").select("refresh_token").eq("provider", PROVIDER).single();
  return data?.refresh_token || null;
}

export async function isGa4Connected(): Promise<boolean> {
  return Boolean(await getRefreshToken());
}

export async function getGa4AccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh || !isGa4OAuthConfigured()) return null;
  const body = new URLSearchParams({
    client_id: clientId()!,
    client_secret: clientSecret()!,
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token || null;
}
