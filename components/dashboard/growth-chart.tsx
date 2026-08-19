"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaMetricChart, type SeriesDef } from "@/components/charts/area-metric-chart";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

const METRICS: { key: string; label: string; color: string }[] = [
  { key: "reach", label: "Reach", color: "hsl(var(--primary))" },
  { key: "impressions", label: "Impressions", color: "#a855f7" },
  { key: "engagement", label: "Engagement", color: "hsl(var(--success))" },
  { key: "followers", label: "Followers", color: "#f59e0b" },
];

export function GrowthChart({ initialData, initialDays = 30 }: { initialData: any[]; initialDays?: number }) {
  const [days, setDays] = useState(initialDays);
  const [metric, setMetric] = useState("reach");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (days === initialDays) {
      setData(initialData);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/timeseries?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active) setData(d.data || []);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [days, initialData, initialDays]);

  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const series: SeriesDef[] = [{ key: activeMetric.key, label: activeMetric.label, color: activeMetric.color }];

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Overall Growth</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  metric === m.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  days === r.days ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-[300px] w-full" /> : <AreaMetricChart data={data} series={series} />}
      </CardContent>
    </Card>
  );
}
