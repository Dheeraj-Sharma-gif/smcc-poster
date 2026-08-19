"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { formatCompact, formatDate, cn } from "@/lib/utils";

interface P {
  id: PlatformId;
  name: string;
  color: string;
  connected: boolean;
  audience: number;
  reach: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
  posts: number;
  growthPct: number;
  score: number;
  series: { date: string; followers: number; reach: number; impressions: number; engagement: number; videoViews: number }[];
}

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];
const METRICS = [
  { key: "followers", label: "Followers", seriesKey: "followers" },
  { key: "reach", label: "Reach", seriesKey: "reach" },
  { key: "impressions", label: "Impressions", seriesKey: "impressions" },
  { key: "engagement", label: "Engagement", seriesKey: "engagement" },
];

export function CompareView() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("reach");
  const [platforms, setPlatforms] = useState<P[]>([]);
  const [active, setActive] = useState<PlatformId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/compare?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setPlatforms(d.platforms || []);
        setActive((prev) => (prev.length ? prev : (d.platforms || []).map((p: P) => p.id)));
      })
      .finally(() => setLoading(false));
  }, [days]);

  const seriesKey = METRICS.find((m) => m.key === metric)!.seriesKey;

  const merged = useMemo(() => {
    const byDate = new Map<string, any>();
    for (const p of platforms) {
      if (!active.includes(p.id)) continue;
      for (const point of p.series) {
        const row = byDate.get(point.date) || { date: point.date };
        row[p.id] = (point as any)[seriesKey];
        byDate.set(point.date, row);
      }
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [platforms, active, seriesKey]);

  function toggle(id: PlatformId) {
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  const ranked = [...platforms].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Compare Platforms</h1>
        <p className="text-sm text-muted-foreground">See all your channels side by side on any metric.</p>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Trend comparison</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">
              {METRICS.map((m) => (
                <button key={m.key} onClick={() => setMetric(m.key)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", metric === m.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-border p-0.5">
              {RANGES.map((r) => (
                <button key={r.days} onClick={() => setDays(r.days)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", days === r.days ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {platforms.map((p) => {
              const on = active.includes(p.id);
              const Icon = PLATFORMS[p.id].icon;
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all", on ? "border-transparent text-white" : "border-border text-muted-foreground opacity-60")}
                  style={on ? { background: p.color } : undefined}
                >
                  <Icon className="size-3.5" />
                  {p.name}
                </button>
              );
            })}
          </div>
          {loading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={merged} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: "numeric", month: "short" })} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(d) => formatDate(d as string)}
                  formatter={(value: any, name: any) => [formatCompact(Number(value)), PLATFORMS[name as PlatformId]?.short || name]}
                />
                <Legend formatter={(v) => PLATFORMS[v as PlatformId]?.short || v} wrapperStyle={{ fontSize: 12 }} />
                {platforms.filter((p) => active.includes(p.id)).map((p) => (
                  <Line key={p.id} type="monotone" dataKey={p.id} stroke={p.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Platform</th>
                    <th className="py-2 pr-4 font-medium">Audience</th>
                    <th className="py-2 pr-4 font-medium">Reach</th>
                    <th className="py-2 pr-4 font-medium">Eng %</th>
                    <th className="py-2 pr-4 font-medium">Growth</th>
                    <th className="py-2 pr-4 font-medium">Posts</th>
                    <th className="py-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((p, i) => {
                    const cfg = PLATFORMS[p.id];
                    return (
                      <tr key={p.id} className="border-b border-border/60">
                        <td className="py-2.5 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-2 font-medium">
                            <cfg.icon className="size-4" style={{ color: cfg.color }} />
                            {cfg.short}
                            {i === 0 && <Badge variant="success">Top</Badge>}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">{formatCompact(p.audience)}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{formatCompact(p.reach)}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{p.engagementRate.toFixed(1)}%</td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          <span className={p.growthPct >= 0 ? "text-success" : "text-danger"}>{p.growthPct >= 0 ? "+" : ""}{p.growthPct.toFixed(1)}%</span>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">{p.posts}</td>
                        <td className="py-2.5"><Badge variant="muted">{p.score}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
