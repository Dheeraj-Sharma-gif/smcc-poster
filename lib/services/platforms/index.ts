import { PLATFORM_IDS, PLATFORMS, type PlatformId } from "@/lib/config";
import { clamp, pctChange } from "@/lib/utils";
import type { PlatformMetrics } from "./types";
import { instagramService } from "./instagram";
import { facebookService } from "./facebook";
import { linkedinService } from "./linkedin";
import { youtubeService } from "./youtube";
import type { PlatformService } from "./types";

const SERVICES: Record<PlatformId, PlatformService> = {
  instagram: instagramService,
  facebook: facebookService,
  linkedin: linkedinService,
  youtube: youtubeService,
};

export function isPlatformConfigured(id: PlatformId): boolean {
  return SERVICES[id].isConfigured();
}

export async function getPlatformMetrics(id: PlatformId, days = 30): Promise<PlatformMetrics> {
  return SERVICES[id].fetchMetrics({ days });
}

export async function getAllMetrics(days = 30): Promise<Record<PlatformId, PlatformMetrics>> {
  const entries = await Promise.all(
    PLATFORM_IDS.map(async (id) => [id, await SERVICES[id].fetchMetrics({ days })] as const)
  );
  return Object.fromEntries(entries) as Record<PlatformId, PlatformMetrics>;
}

export interface PlatformScore {
  platform: PlatformId;
  name: string;
  score: number; // 0-100
  audience: number;
  reach: number;
  engagementRate: number;
  growthPct: number; // audience growth over the period
  connected: boolean;
}

export interface Overview {
  generatedAt: string;
  days: number;
  totals: {
    followers: number;
    reach: number;
    impressions: number;
    engagement: number;
    posts: number;
    videoViews: number;
    todayGrowth: number;
    weeklyGrowth: number;
  };
  healthScore: number;
  healthBreakdown: { label: string; value: number; weight: number }[];
  bestPlatform: PlatformScore | null;
  weakestPlatform: PlatformScore | null;
  scores: PlatformScore[];
  perPlatform: Record<PlatformId, PlatformMetrics>;
  anyConnected: boolean;
}

/** Growth of a metric over the last `n` points of a series. */
function seriesGrowth(metrics: PlatformMetrics, field: "followers"): { total: number; today: number; weekly: number } {
  const s = metrics.series;
  if (s.length < 2) return { total: 0, today: 0, weekly: 0 };
  const first = s[0][field];
  const last = s[s.length - 1][field];
  const prev = s[s.length - 2][field];
  const weekAgo = s[Math.max(0, s.length - 8)][field];
  return { total: last - first, today: last - prev, weekly: last - weekAgo };
}

function platformScore(m: PlatformMetrics): PlatformScore {
  const growthPct = pctChange(m.series[m.series.length - 1]?.followers ?? m.audience, m.series[0]?.followers ?? m.audience);
  // Composite: engagement rate (0-10% -> 0-50), growth (%*4 capped 30), reach efficiency (20)
  const engComponent = clamp((m.engagementRate / 8) * 50, 0, 50);
  const growthComponent = clamp(growthPct * 4, 0, 30);
  const reachEff = m.audience ? clamp((m.reach / m.audience) * 10, 0, 20) : 0;
  const score = Math.round(engComponent + growthComponent + reachEff);
  return {
    platform: m.platform,
    name: PLATFORMS[m.platform].short,
    score: clamp(score, 0, 100),
    audience: m.audience,
    reach: m.reach,
    engagementRate: m.engagementRate,
    growthPct,
    connected: m.connected,
  };
}

export function buildOverview(perPlatform: Record<PlatformId, PlatformMetrics>, days: number): Overview {
  const list = PLATFORM_IDS.map((id) => perPlatform[id]);
  const scores = list.map(platformScore).sort((a, b) => b.score - a.score);

  // Headline totals & health reflect only REAL (connected) platforms so that
  // unconnected sample platforms never inflate the numbers. If nothing is
  // connected yet, fall back to all (so a fresh install still shows a demo).
  const connectedList = list.filter((m) => m.connected);
  const realList = connectedList.length ? connectedList : list;

  const totals = realList.reduce(
    (acc, m) => {
      const g = seriesGrowth(m, "followers");
      acc.followers += m.audience;
      acc.reach += m.reach;
      acc.impressions += m.impressions;
      acc.engagement += m.engagement;
      acc.posts += m.posts;
      acc.videoViews += m.videoViews;
      acc.todayGrowth += g.today;
      acc.weeklyGrowth += g.weekly;
      return acc;
    },
    { followers: 0, reach: 0, impressions: 0, engagement: 0, posts: 0, videoViews: 0, todayGrowth: 0, weeklyGrowth: 0 }
  );

  // Health score: weighted blend across engagement, growth, consistency, reach.
  const realScores = scores.filter((s) => s.connected);
  const rankScores = realScores.length ? realScores : scores;
  const avgEngagement = realList.reduce((a, m) => a + m.engagementRate, 0) / realList.length;
  const avgGrowth = rankScores.reduce((a, s) => a + s.growthPct, 0) / rankScores.length;
  const reachRatio = totals.followers ? totals.reach / totals.followers : 0;
  const activePlatforms = realList.filter((m) => m.posts > 0).length / realList.length;

  const breakdown = [
    { label: "Engagement", value: clamp((avgEngagement / 6) * 100, 0, 100), weight: 0.35 },
    { label: "Growth", value: clamp(50 + avgGrowth * 8, 0, 100), weight: 0.3 },
    { label: "Reach efficiency", value: clamp(reachRatio * 60, 0, 100), weight: 0.2 },
    { label: "Consistency", value: clamp(activePlatforms * 100, 0, 100), weight: 0.15 },
  ];
  const healthScore = Math.round(breakdown.reduce((a, b) => a + b.value * b.weight, 0));

  const anyConnected = list.some((m) => m.connected);

  return {
    generatedAt: new Date().toISOString(),
    days,
    totals,
    healthScore,
    healthBreakdown: breakdown,
    bestPlatform: rankScores[0] ?? null,
    weakestPlatform: rankScores[rankScores.length - 1] ?? null,
    scores,
    perPlatform,
    anyConnected,
  };
}

export async function getOverview(days = 30): Promise<Overview> {
  const perPlatform = await getAllMetrics(days);
  return buildOverview(perPlatform, days);
}

/** Aggregate a daily time series across all platforms (sum per date). */
export function buildAggregateSeries(perPlatform: Record<PlatformId, PlatformMetrics>) {
  const byDate = new Map<string, { date: string; followers: number; reach: number; impressions: number; engagement: number; videoViews: number }>();
  const ids = PLATFORM_IDS.filter((id) => perPlatform[id].connected);
  const useIds = ids.length ? ids : PLATFORM_IDS;
  for (const id of useIds) {
    for (const p of perPlatform[id].series) {
      const cur = byDate.get(p.date) || { date: p.date, followers: 0, reach: 0, impressions: 0, engagement: 0, videoViews: 0 };
      cur.followers += p.followers;
      cur.reach += p.reach;
      cur.impressions += p.impressions;
      cur.engagement += p.engagement;
      cur.videoViews += p.videoViews;
      byDate.set(p.date, cur);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export type { PlatformMetrics } from "./types";
