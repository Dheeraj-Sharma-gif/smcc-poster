import { NextResponse } from "next/server";
import { getAllMetrics, buildOverview } from "@/lib/services/platforms";
import { PLATFORMS, PLATFORM_IDS } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const perPlatform = await getAllMetrics(days);
  const overview = buildOverview(perPlatform, days);

  const platforms = PLATFORM_IDS.map((id) => {
    const m = perPlatform[id];
    const score = overview.scores.find((s) => s.platform === id)!;
    return {
      id,
      name: PLATFORMS[id].short,
      color: PLATFORMS[id].color,
      connected: m.connected,
      audience: m.audience,
      reach: m.reach,
      impressions: m.impressions,
      engagement: m.engagement,
      engagementRate: m.engagementRate,
      posts: m.posts,
      growthPct: score.growthPct,
      score: score.score,
      series: m.series.map((p) => ({ date: p.date, followers: p.followers, reach: p.reach, impressions: p.impressions, engagement: p.engagement, videoViews: p.videoViews })),
    };
  });

  return NextResponse.json({ days, platforms });
}
