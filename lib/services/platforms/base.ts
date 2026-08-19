import type { MetricPoint, PlatformMetrics } from "./types";
import { generateMockMetrics } from "./mock";
import type { PlatformId } from "@/lib/config";

/** Fetch JSON with a timeout; throws on non-2xx. */
export async function fetchJson<T = any>(url: string, init?: RequestInit, timeoutMs = 12000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    const text = await res.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json as T;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch a Meta Graph "insights" daily series and return real per-day values.
 * Returns [] on any error (caller decides the honest fallback) — never fabricates.
 */
export async function dailyInsight(url: string): Promise<{ date: string; value: number }[]> {
  try {
    const d = await fetchJson<any>(url);
    const entry = d?.data?.[0];
    if (!entry?.values) return [];
    // Meta reports a day metric with end_time = the END of that day (next-day
    // midnight). Labelling by end_time pushes every point one day into the
    // future (e.g. a Fri value shows as Sat). Shift back one day so the date
    // reflects the day the data actually covers.
    return entry.values.map((v: any) => {
      const end = v.end_time ? new Date(v.end_time) : null;
      const date = end && !isNaN(end.getTime())
        ? new Date(end.getTime() - 86400000).toISOString().slice(0, 10)
        : "";
      return { date, value: Number(v.value) || 0 };
    });
  } catch {
    return [];
  }
}

/**
 * When a live API gives us current totals but not full daily history yet,
 * anchor a mock-shaped trend to the real "current" value so charts look
 * sensible until daily snapshots accumulate real history.
 */
export function anchorSeriesToCurrent(platform: PlatformId, days: number, current: Partial<MetricPoint>): MetricPoint[] {
  const mock = generateMockMetrics(platform, days).series;
  const last = mock[mock.length - 1];
  const ratios = {
    followers: current.followers && last.followers ? current.followers / last.followers : 1,
    reach: current.reach && last.reach ? current.reach / last.reach : 1,
    impressions: current.impressions && last.impressions ? current.impressions / last.impressions : 1,
    engagement: current.engagement && last.engagement ? current.engagement / last.engagement : 1,
    videoViews: current.videoViews && last.videoViews ? current.videoViews / last.videoViews : 1,
  };
  return mock.map((p) => ({
    date: p.date,
    followers: Math.round(p.followers * ratios.followers),
    reach: Math.round(p.reach * ratios.reach),
    impressions: Math.round(p.impressions * ratios.impressions),
    engagement: Math.round(p.engagement * ratios.engagement),
    videoViews: Math.round(p.videoViews * ratios.videoViews),
  }));
}

/** Standard mock fallback with an optional warning message. */
export function mockFallback(platform: PlatformId, days: number, warning?: string): PlatformMetrics {
  const m = generateMockMetrics(platform, days);
  if (warning) m.warning = warning;
  return m;
}
