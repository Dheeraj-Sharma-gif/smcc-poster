"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Radar,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MousePointerClick,
  Percent,
  Clock,
  PlayCircle,
  Repeat2,
  Reply,
  UserPlus,
  ThumbsUp,
  Film,
} from "lucide-react";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { formatCompact, formatNumber, formatDuration, cn } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { PlatformChart } from "./platform-chart";
import { TopContent } from "@/components/dashboard/top-content";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlatformMetrics } from "@/lib/services/platforms/types";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

type Tile = { label: string; value: string; icon: any };

function tilesFor(id: PlatformId, m: PlatformMetrics): Tile[] {
  const e = m.extra;
  const core: Record<PlatformId, Tile[]> = {
    instagram: [
      { label: "Followers", value: formatCompact(m.audience), icon: Users },
      { label: "Reach", value: formatCompact(m.reach), icon: Radar },
      { label: "Impressions", value: formatCompact(m.impressions), icon: Eye },
      { label: "Profile Visits", value: formatCompact(e.profileVisits || 0), icon: UserPlus },
      { label: "Likes", value: formatCompact(e.likes || 0), icon: Heart },
      { label: "Comments", value: formatCompact(e.comments || 0), icon: MessageCircle },
      { label: "Shares", value: formatCompact(e.shares || 0), icon: Share2 },
      { label: "Saves", value: formatCompact(e.saves || 0), icon: Bookmark },
      { label: "Reel Views", value: formatCompact(e.reelViews || 0), icon: Film },
      { label: "Story Views", value: formatCompact(e.storyViews || 0), icon: PlayCircle },
    ],
    facebook: [
      { label: "Followers", value: formatCompact(m.audience), icon: Users },
      { label: "Page Likes", value: formatCompact(e.pageLikes || 0), icon: ThumbsUp },
      { label: "Reach", value: formatCompact(m.reach), icon: Radar },
      { label: "Engagement", value: formatCompact(m.engagement), icon: Heart },
      { label: "Video Views", value: formatCompact(e.videoViews || 0), icon: PlayCircle },
      { label: "Likes", value: formatCompact(e.likes || 0), icon: ThumbsUp },
      { label: "Comments", value: formatCompact(e.comments || 0), icon: MessageCircle },
      { label: "Shares", value: formatCompact(e.shares || 0), icon: Share2 },
    ],
    linkedin: [
      { label: "Followers", value: formatCompact(m.audience), icon: Users },
      { label: "Impressions", value: formatCompact(m.impressions), icon: Eye },
      { label: "Clicks", value: formatCompact(e.clicks || 0), icon: MousePointerClick },
      { label: "CTR", value: `${(e.ctr || 0).toFixed(2)}%`, icon: Percent },
      { label: "Reactions", value: formatCompact(e.reactions || 0), icon: ThumbsUp },
      { label: "Comments", value: formatCompact(e.comments || 0), icon: MessageCircle },
      { label: "Shares", value: formatCompact(e.shares || 0), icon: Share2 },
    ],
    youtube: [
      { label: "Subscribers", value: formatCompact(m.audience), icon: Users },
      { label: "Views", value: formatCompact(e.videoViews || m.videoViews), icon: Eye },
      { label: "Watch Time", value: `${formatNumber(e.watchTimeHours || 0)} hrs`, icon: Clock },
      { label: "Avg Duration", value: formatDuration(e.avgViewDuration || 0), icon: Clock },
      { label: "Likes", value: formatCompact(e.likes || 0), icon: ThumbsUp },
      { label: "Comments", value: formatCompact(e.comments || 0), icon: MessageCircle },
    ],
  };
  return core[id];
}

export function PlatformDetailClient({ platform }: { platform: PlatformId }) {
  const cfg = PLATFORMS[platform];
  const Icon = cfg.icon;
  const [days, setDays] = useState(30);
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [m, setM] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (d: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/platforms/${platform}?days=${d}`, { cache: "no-store" }).then((r) => r.json());
        setM(res);
      } finally {
        setLoading(false);
      }
    },
    [platform]
  );

  useEffect(() => {
    load(days);
  }, [days, load]);

  function applyCustom() {
    if (!custom.from || !custom.to) return;
    const d = Math.round((new Date(custom.to).getTime() - new Date(custom.from).getTime()) / 86400000);
    setDays(Math.min(365, Math.max(1, d || 30)));
  }

  const tiles = m ? tilesFor(platform, m) : [];

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <div className="grid size-12 place-items-center rounded-xl" style={{ background: `${cfg.color}20` }}>
          <Icon className="size-6" style={{ color: cfg.color }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{cfg.name}</h2>
            {m && <Badge variant={m.connected ? "success" : "muted"}>{m.connected ? "Live API" : "Sample data"}</Badge>}
          </div>
          {m && (
            <p className="text-sm text-muted-foreground">
              {formatCompact(m.audience)} {cfg.audienceLabel.toLowerCase()} · {m.engagementRate.toFixed(1)}% engagement · {m.posts} posts
            </p>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
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
          <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-8 w-auto text-xs" />
          <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} onBlur={applyCustom} className="h-8 w-auto text-xs" />
        </div>
      </Card>

      {m?.warning && <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">{m.warning}</div>}

      {loading || !m ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-[340px] w-full" />
        </>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tiles.map((tile) => (
              <StatTile key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} accent={cfg.color} />
            ))}
          </section>
          <PlatformChart platform={platform} series={m.series} />
          <TopContent items={m.topContent} platform={platform} title={`Top ${cfg.short} content`} />
        </>
      )}
    </div>
  );
}
