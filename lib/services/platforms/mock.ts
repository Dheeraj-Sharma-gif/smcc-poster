import type { PlatformId } from "@/lib/config";
import { hashString, seededRandom } from "@/lib/utils";
import type { ContentItem, MetricPoint, PlatformMetrics } from "./types";

/**
 * Deterministic, realistic mock data. Same platform + same day => same numbers,
 * so charts are stable and snapshots make sense. Replaced automatically the
 * moment a platform's real API credentials are present in env.
 */

interface Profile {
  baseAudience: number;
  dailyGrowth: number; // avg new audience/day
  reachPerFollower: number;
  engagementRate: number; // %
  videoHeavy: boolean;
  contentTypes: string[];
}

const PROFILES: Record<PlatformId, Profile> = {
  instagram: { baseAudience: 15000, dailyGrowth: 15, reachPerFollower: 0.14, engagementRate: 4.6, videoHeavy: true, contentTypes: ["reel", "post", "story"] },
  facebook: { baseAudience: 10000, dailyGrowth: 8, reachPerFollower: 0.12, engagementRate: 2.1, videoHeavy: false, contentTypes: ["post", "video"] },
  linkedin: { baseAudience: 7000, dailyGrowth: 9, reachPerFollower: 0.15, engagementRate: 5.3, videoHeavy: false, contentTypes: ["post", "article", "document"] },
  youtube: { baseAudience: 12000, dailyGrowth: 12, reachPerFollower: 0.2, engagementRate: 6.8, videoHeavy: true, contentTypes: ["video", "short"] },
};

const TITLE_BANK = [
  "Hidden gems in Rajasthan you must visit",
  "My 5 favorite travel destinations",
  "Sunset moments in Goa 🌅",
  "How to grow the startup initially",
  "Weekend adventure highlights",
  "Behind the scenes: content creation journey",
  "Travel packing hacks in 60 seconds",
  "Why travel changes your perspective",
  "The traveler's photography checklist",
  "Street food adventures across India",
  "Lifestyle changes that stick",
  "How to plan the perfect trip",
];

function dayKey(offset: number): string {
  // Date string `offset` days back from *today* (UTC), so sample/fallback data
  // always runs right up to the current date and never freezes on a fixed day.
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(todayUTC - offset * 86400000).toISOString().slice(0, 10);
}

export function generateMockMetrics(platform: PlatformId, days: number): PlatformMetrics {
  const profile = PROFILES[platform];
  const rand = seededRandom(hashString(platform + "smcc"));

  const series: MetricPoint[] = [];
  // Build from oldest -> newest so audience trends upward.
  const totalDays = Math.max(days, 90);
  let audience = profile.baseAudience - profile.dailyGrowth * totalDays;

  const allPoints: MetricPoint[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const wobble = 0.6 + rand() * 0.9;
    const dow = new Date(dayKey(i)).getUTCDay();
    const weekendBoost = dow === 0 || dow === 6 ? 1.15 : 1.0;
    audience += Math.round(profile.dailyGrowth * wobble * (0.7 + rand() * 0.6));
    const reach = Math.round(audience * profile.reachPerFollower * wobble * weekendBoost);
    const impressions = Math.round(reach * (1.3 + rand() * 0.5));
    const engagement = Math.round(reach * (profile.engagementRate / 100) * (0.8 + rand() * 0.5));
    const videoViews = profile.videoHeavy ? Math.round(reach * (0.9 + rand() * 0.8)) : Math.round(reach * 0.15 * rand());
    allPoints.push({ date: dayKey(i), followers: audience, reach, impressions, engagement, videoViews });
  }
  // Take the last `days` for the returned series.
  series.push(...allPoints.slice(-days));

  const periodPoints = series;
  const latest = allPoints[allPoints.length - 1];
  const reachSum = periodPoints.reduce((a, p) => a + p.reach, 0);
  const imprSum = periodPoints.reduce((a, p) => a + p.impressions, 0);
  const engSum = periodPoints.reduce((a, p) => a + p.engagement, 0);
  const vvSum = periodPoints.reduce((a, p) => a + p.videoViews, 0);
  const posts = Math.round(days * (profile.videoHeavy ? 0.7 : 1.1) * (0.8 + rand() * 0.5));

  const topContent = buildTopContent(platform, profile, rand);

  const extra = buildExtra(platform, { reachSum, imprSum, engSum, vvSum, audience: latest.followers, rand });

  return {
    platform,
    connected: false,
    fetchedAt: new Date().toISOString(),
    audience: latest.followers,
    reach: reachSum,
    impressions: imprSum,
    engagement: engSum,
    engagementRate: imprSum ? (engSum / imprSum) * 100 : profile.engagementRate,
    posts,
    videoViews: vvSum,
    extra,
    series,
    topContent,
  };
}

function buildTopContent(platform: PlatformId, profile: Profile, rand: () => number): ContentItem[] {
  const items: ContentItem[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const type = profile.contentTypes[i % profile.contentTypes.length];
    const reach = Math.round((3000 + rand() * 40000) * (profile.videoHeavy ? 1.4 : 1));
    const likes = Math.round(reach * (profile.engagementRate / 100) * (0.6 + rand()));
    const comments = Math.round(likes * (0.08 + rand() * 0.12));
    const shares = Math.round(likes * (0.04 + rand() * 0.1));
    const views = profile.videoHeavy || type === "video" || type === "reel" || type === "short"
      ? Math.round(reach * (1.2 + rand()))
      : undefined;
    items.push({
      id: `${platform}-c${i}`,
      title: TITLE_BANK[(hashString(platform) + i) % TITLE_BANK.length],
      type,
      publishedAt: dayKey(i * 3 + 1),
      reach,
      likes,
      comments,
      shares,
      views,
      saves: platform === "instagram" ? Math.round(likes * (0.15 + rand() * 0.2)) : undefined,
      engagementRate: reach ? ((likes + comments + shares) / reach) * 100 : 0,
      url: "#",
    });
  }
  return items.sort((a, b) => b.reach - a.reach);
}

function buildExtra(
  platform: PlatformId,
  d: { reachSum: number; imprSum: number; engSum: number; vvSum: number; audience: number; rand: () => number }
): Record<string, number> {
  const { reachSum, imprSum, engSum, vvSum, audience, rand } = d;
  const likes = Math.round(engSum * 0.7);
  const comments = Math.round(engSum * 0.15);
  const shares = Math.round(engSum * 0.08);
  const saves = Math.round(engSum * 0.07);
  switch (platform) {
    case "instagram":
      return { likes, comments, shares, saves, profileVisits: Math.round(reachSum * 0.06), reelViews: vvSum, storyViews: Math.round(vvSum * 0.4) };
    case "facebook":
      return { pageLikes: audience, likes, comments, shares, videoViews: vvSum, reach: reachSum };
    case "linkedin":
      return { clicks: Math.round(imprSum * 0.021), ctr: imprSum ? (Math.round(imprSum * 0.021) / imprSum) * 100 : 0, reactions: likes, comments, shares };
    case "youtube": {
      const avgDuration = 180 + Math.round(rand() * 240);
      return { watchTimeHours: Math.round((vvSum * avgDuration) / 3600), avgViewDuration: avgDuration, likes, comments, videoViews: vvSum };
    }
    default:
      return {};
  }
}
