"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaMetricChart } from "@/components/charts/area-metric-chart";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { MetricPoint } from "@/lib/services/platforms/types";

const METRICS = [
  { key: "reach", label: "Reach" },
  { key: "impressions", label: "Impressions" },
  { key: "engagement", label: "Engagement" },
  { key: "followers", label: "Audience" },
  { key: "videoViews", label: "Video Views" },
];

export function PlatformChart({ platform, series }: { platform: PlatformId; series: MetricPoint[] }) {
  const [metric, setMetric] = useState("reach");
  const color = PLATFORMS[platform].color;
  const active = METRICS.find((m) => m.key === metric)!;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Trend</CardTitle>
        <div className="flex flex-wrap rounded-lg border border-border p-0.5">
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
      </CardHeader>
      <CardContent>
        <AreaMetricChart data={series} series={[{ key: active.key, label: active.label, color }]} />
      </CardContent>
    </Card>
  );
}
