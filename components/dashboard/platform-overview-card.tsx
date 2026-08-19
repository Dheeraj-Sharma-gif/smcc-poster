"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { formatCompact, formatPercent, cn } from "@/lib/utils";

export interface PlatformOverview {
  platform: PlatformId;
  audience: number;
  reach: number;
  engagementRate: number;
  growthPct: number;
  connected: boolean;
  fetchedAt: string;
  spark: number[];
}

function Spark({ points, color }: { points: number[]; color: string }) {
  if (!points.length) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full" preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function PlatformOverviewCard({ data, index = 0 }: { data: PlatformOverview; index?: number }) {
  const cfg = PLATFORMS[data.platform];
  const Icon = cfg.icon;
  const synced = new Date(data.fetchedAt);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Link href={`/${data.platform}`}>
        <Card className="group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-lg" style={{ background: `${cfg.color}20` }}>
                <Icon className="size-[18px]" style={{ color: cfg.color }} />
              </div>
              <div>
                <div className="text-sm font-semibold">{cfg.short}</div>
                <Badge variant={data.connected ? "success" : "muted"} className="mt-0.5">
                  {data.connected ? "Live" : "Sample"}
                </Badge>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums">{formatCompact(data.audience)}</div>
              <div className="text-xs text-muted-foreground">{cfg.audienceLabel}</div>
            </div>
            <div
              className={cn(
                "text-sm font-medium",
                data.growthPct > 0 ? "text-success" : data.growthPct < 0 ? "text-danger" : "text-muted-foreground"
              )}
            >
              {formatPercent(data.growthPct)}
            </div>
          </div>

          <div className="mt-3">
            <Spark points={data.spark} color={cfg.color} />
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Reach {formatCompact(data.reach)}</span>
            <span>Eng {data.engagementRate.toFixed(1)}%</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {synced.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
