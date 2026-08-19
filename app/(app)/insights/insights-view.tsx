"use client";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Lightbulb,
  Clock,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckSquare,
  Flame,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { formatCompact, cn } from "@/lib/utils";
import type { Insights } from "@/lib/services/ai";

export function InsightsView() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await fetch("/api/insights?days=30").then((r) => r.json());
      setData(d);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive summary */}
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </div>
            <h2 className="text-lg font-semibold">Executive Summary</h2>
            <Badge variant={data.usedModel ? "default" : "muted"}>{data.usedModel ? "AI generated" : "Auto"}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={load} aria-label="Regenerate">
            <RefreshCw />
          </Button>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-foreground/90">{data.executiveSummary}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recommendations */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Lightbulb className="size-5 text-warning" />
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.recommendations.map((r, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border p-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                <span className="text-foreground/90">{r}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action items */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CheckSquare className="size-5 text-success" />
            <CardTitle>Action Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.actionItems.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    a.priority === "high" && "bg-danger/15 text-danger",
                    a.priority === "medium" && "bg-warning/15 text-warning",
                    a.priority === "low" && "bg-muted text-muted-foreground"
                  )}
                >
                  {a.priority}
                </span>
                <span className="text-foreground/90">{a.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Best posting times */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Clock className="size-5 text-primary" />
            <CardTitle>Best Posting Times</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.bestPostingTimes.map((b) => {
              const cfg = PLATFORMS[b.platform as PlatformId];
              return (
                <div key={b.platform} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <cfg.icon className="size-4" style={{ color: cfg.color }} />
                  <span className="text-sm font-medium">{cfg.short}</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {b.day}, {b.hour}
                  </span>
                  <Badge variant="muted">{b.confidence}%</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Consistency */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Gauge className="size-5 text-warning" />
            <CardTitle>Posting Consistency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.consistency.map((c) => {
              const cfg = PLATFORMS[c.platform as PlatformId];
              return (
                <div key={c.platform}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <cfg.icon className="size-4" style={{ color: cfg.color }} />
                      {cfg.short}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.postsPerWeek}/week · {c.score}/100</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: cfg.color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <TrendingUp className="size-5 text-success" />
          <CardTitle>Trend Detection</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.trends.map((t, i) => {
            const Icon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
            return (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className={cn("size-4", t.direction === "up" ? "text-success" : t.direction === "down" ? "text-danger" : "text-muted-foreground")} />
                  {t.label}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.detail}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Top content + health explanation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Flame className="size-5 text-danger" />
            <CardTitle>Top Content Across Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topContent.map((c, i) => {
              const cfg = PLATFORMS[c.platform as PlatformId];
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <cfg.icon className="size-4 shrink-0" style={{ color: cfg.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatCompact(c.reach)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Gauge className="size-5 text-primary" />
            <CardTitle>Health Score Explained</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{data.healthExplanation}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
