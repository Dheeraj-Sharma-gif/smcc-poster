import {
  Users,
  Radar,
  Eye,
  Heart,
  FileText,
  PlayCircle,
  Sunrise,
  CalendarClock,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { getAllMetrics, buildOverview, buildAggregateSeries } from "@/lib/services/platforms";
import { generateInsights } from "@/lib/services/ai";
import { getUserName } from "@/lib/auth";
import { PLATFORMS, PLATFORM_IDS } from "@/lib/config";
import { formatCompact, formatNumber, pctChange, greetingIST, firstNameOf } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { HealthRing } from "@/components/dashboard/health-ring";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { MorningBrief } from "@/components/dashboard/morning-brief";
import { ActionCenter } from "@/components/dashboard/action-center";
import { PlatformOverviewCard } from "@/components/dashboard/platform-overview-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function periodChange(series: any[], key: string): number {
  if (series.length < 2) return 0;
  const mid = Math.floor(series.length / 2);
  const first = series.slice(0, mid).reduce((a, p) => a + p[key], 0);
  const second = series.slice(mid).reduce((a, p) => a + p[key], 0);
  return pctChange(second, first);
}

export default async function DashboardPage() {
  const perPlatform = await getAllMetrics(30);
  const overview = buildOverview(perPlatform, 30);
  const aggregate = buildAggregateSeries(perPlatform);
  const insights = await generateInsights(overview);
  const adminName = await getUserName();

  const t = overview.totals;
  const best = overview.bestPlatform;
  const weak = overview.weakestPlatform;

  const signed = (n: number) => `${n >= 0 ? "+" : ""}${formatNumber(n)}`;
  const kpis = [
    { label: "Total Followers", display: formatCompact(t.followers), icon: <Users />, changePct: periodChange(aggregate, "followers"), accent: "hsl(var(--primary))" },
    { label: "Reach", display: formatCompact(t.reach), icon: <Radar />, changePct: periodChange(aggregate, "reach"), accent: "#a855f7" },
    { label: "Impressions", display: formatCompact(t.impressions), icon: <Eye />, changePct: periodChange(aggregate, "impressions"), accent: "#06b6d4" },
    { label: "Engagement", display: formatCompact(t.engagement), icon: <Heart />, changePct: periodChange(aggregate, "engagement"), accent: "hsl(var(--success))" },
    { label: "Posts (30d)", display: formatNumber(t.posts), icon: <FileText />, accent: "#f59e0b" },
    { label: "Video Views", display: formatCompact(t.videoViews), icon: <PlayCircle />, changePct: periodChange(aggregate, "videoViews"), accent: "#ef4444" },
    { label: "Today's Growth", display: signed(t.todayGrowth), icon: <Sunrise />, accent: "#10b981" },
    { label: "Weekly Growth", display: signed(t.weeklyGrowth), icon: <CalendarClock />, accent: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {greetingIST()}, {adminName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s how your channels are performing across the last 30 days.
        </p>
      </div>

      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} index={i} />
        ))}
      </section>

      {/* Health + best/weakest */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overall Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthRing score={overview.healthScore} breakdown={overview.healthBreakdown} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {best && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="size-4 text-success" /> Best Platform Today
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl" style={{ background: `${PLATFORMS[best.platform].color}20` }}>
                  {(() => {
                    const Icon = PLATFORMS[best.platform].icon;
                    return <Icon className="size-5" style={{ color: PLATFORMS[best.platform].color }} />;
                  })()}
                </div>
                <div>
                  <div className="font-semibold">{PLATFORMS[best.platform].short}</div>
                  <div className="text-xs text-muted-foreground">Score {best.score} · Eng {best.engagementRate.toFixed(1)}%</div>
                </div>
                <Badge variant="success" className="ml-auto">Leading</Badge>
              </div>
            </Card>
          )}
          {weak && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="size-4 text-warning" /> Needs Attention
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl" style={{ background: `${PLATFORMS[weak.platform].color}20` }}>
                  {(() => {
                    const Icon = PLATFORMS[weak.platform].icon;
                    return <Icon className="size-5" style={{ color: PLATFORMS[weak.platform].color }} />;
                  })()}
                </div>
                <div>
                  <div className="font-semibold">{PLATFORMS[weak.platform].short}</div>
                  <div className="text-xs text-muted-foreground">Score {weak.score} · Eng {weak.engagementRate.toFixed(1)}%</div>
                </div>
                <Badge variant="warning" className="ml-auto">Focus</Badge>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Morning brief + action center */}
      <section className="grid gap-4 lg:grid-cols-2">
        <MorningBrief
          text={`${greetingIST()}, ${firstNameOf(adminName)}. ${insights.morningBrief}`}
          usedModel={insights.usedModel}
        />
        <ActionCenter items={insights.actionItems} />
      </section>

      {/* Growth chart */}
      <GrowthChart initialData={aggregate} initialDays={30} />

      {/* Platform overview cards */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Platforms</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLATFORM_IDS.map((id, i) => {
            const m = perPlatform[id];
            const score = overview.scores.find((s) => s.platform === id)!;
            return (
              <PlatformOverviewCard
                key={id}
                index={i}
                data={{
                  platform: id,
                  audience: m.audience,
                  reach: m.reach,
                  engagementRate: m.engagementRate,
                  growthPct: score.growthPct,
                  connected: m.connected,
                  fetchedAt: m.fetchedAt,
                  spark: m.series.slice(-14).map((p) => p.reach),
                }}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
