import { getGa4AccessToken } from "@/lib/services/ga4-oauth";

/**
 * GA4 Data API client for Postr website analytics. Reads real numbers
 * only — every call returns null on failure so the UI can show an honest empty
 * state instead of fabricated data.
 *
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

const BASE = "https://analyticsdata.googleapis.com/v1beta";

function propertyId(): string | null {
  return process.env.GA4_PROPERTY_ID || null;
}

async function callApi<T = any>(method: "runReport" | "runRealtimeReport", payload: any): Promise<T | null> {
  const pid = propertyId();
  const token = await getGa4AccessToken();
  if (!pid || !token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${BASE}/properties/${pid}:${method}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** YYYYMMDD (GA4 date dimension) -> YYYY-MM-DD */
function fmtDate(d: string): string {
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d;
}

export interface Ga4Realtime {
  activeUsers: number;
  byCountry: { country: string; users: number }[];
  perMinute: number[]; // active users for each of the last 30 minutes (oldest first)
}

/** Live users in the last 30 minutes. */
export async function getGa4Realtime(): Promise<Ga4Realtime | null> {
  const [totalRes, countryRes, minuteRes] = await Promise.all([
    callApi("runRealtimeReport", { metrics: [{ name: "activeUsers" }] }),
    callApi("runRealtimeReport", {
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      limit: 6,
    }),
    callApi("runRealtimeReport", {
      dimensions: [{ name: "minutesAgo" }],
      metrics: [{ name: "activeUsers" }],
      limit: 30,
    }),
  ]);
  if (!totalRes) return null;

  const activeUsers = num(totalRes.rows?.[0]?.metricValues?.[0]?.value);

  const byCountry = (countryRes?.rows || []).map((r: any) => ({
    country: r.dimensionValues?.[0]?.value || "Unknown",
    users: num(r.metricValues?.[0]?.value),
  }));

  // minutesAgo is "00".."29"; build an oldest-first array of length 30.
  const perMinute = new Array(30).fill(0);
  for (const r of minuteRes?.rows || []) {
    const ago = num(r.dimensionValues?.[0]?.value); // 0 = current minute
    const idx = 29 - ago;
    if (idx >= 0 && idx < 30) perMinute[idx] = num(r.metricValues?.[0]?.value);
  }

  return { activeUsers, byCountry, perMinute };
}

export interface Ga4Overview {
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
    avgEngagementSeconds: number;
    engagementRate: number; // 0-100
    bounceRate: number; // 0-100
  };
  daily: { date: string; users: number; sessions: number }[];
  topPages: { path: string; views: number }[];
  channels: { channel: string; sessions: number }[];
  countries: { country: string; users: number }[];
  rangeDays: number;
}

/** Aggregated website analytics for the last `days` days. */
export async function getGa4Overview(days = 30): Promise<Ga4Overview | null> {
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  const [totalsRes, dailyRes, pagesRes, channelsRes, countriesRes] = await Promise.all([
    callApi("runReport", {
      dateRanges,
      metrics: [
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "userEngagementDuration" },
        { name: "engagementRate" },
        { name: "bounceRate" },
      ],
    }),
    callApi("runReport", {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    callApi("runReport", {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 8,
    }),
    callApi("runReport", {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 6,
    }),
    callApi("runReport", {
      dateRanges,
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 6,
    }),
  ]);

  if (!totalsRes) return null;

  const tv = totalsRes.rows?.[0]?.metricValues || [];
  const activeUsers = num(tv[0]?.value);
  const engagementDuration = num(tv[4]?.value);
  const totals = {
    activeUsers,
    newUsers: num(tv[1]?.value),
    sessions: num(tv[2]?.value),
    pageViews: num(tv[3]?.value),
    avgEngagementSeconds: activeUsers ? Math.round(engagementDuration / activeUsers) : 0,
    engagementRate: Math.round(num(tv[5]?.value) * 100),
    bounceRate: Math.round(num(tv[6]?.value) * 100),
  };

  const daily = (dailyRes?.rows || []).map((r: any) => ({
    date: fmtDate(r.dimensionValues?.[0]?.value || ""),
    users: num(r.metricValues?.[0]?.value),
    sessions: num(r.metricValues?.[1]?.value),
  }));

  const topPages = (pagesRes?.rows || []).map((r: any) => ({
    path: r.dimensionValues?.[0]?.value || "/",
    views: num(r.metricValues?.[0]?.value),
  }));

  const channels = (channelsRes?.rows || []).map((r: any) => ({
    channel: r.dimensionValues?.[0]?.value || "Unassigned",
    sessions: num(r.metricValues?.[0]?.value),
  }));

  const countries = (countriesRes?.rows || []).map((r: any) => ({
    country: r.dimensionValues?.[0]?.value || "Unknown",
    users: num(r.metricValues?.[0]?.value),
  }));

  return { totals, daily, topPages, channels, countries, rangeDays: days };
}
