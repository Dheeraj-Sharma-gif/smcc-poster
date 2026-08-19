"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Users, UserPlus, MousePointerClick, FileText, Timer, Activity, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaMetricChart } from "@/components/charts/area-metric-chart";
import { formatCompact, formatNumber, formatDuration, cn } from "@/lib/utils";

interface Overview {
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
    avgEngagementSeconds: number;
    engagementRate: number;
    bounceRate: number;
  };
  daily: { date: string; users: number; sessions: number }[];
  topPages: { path: string; views: number }[];
  channels: { channel: string; sessions: number }[];
  countries: { country: string; users: number }[];
  rangeDays: number;
}
interface Realtime {
  activeUsers: number;
  byCountry: { country: string; users: number }[];
  perMinute: number[];
}

const REALTIME_MS = 45000;
const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

export function WebsiteAnalytics() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [realtime, setRealtime] = useState<Realtime | null>(null);
  const [days, setDays] = useState(30);

  const loadRealtime = useCallback(async () => {
    try {
      const r = await fetch("/api/website/realtime", { cache: "no-store" }).then((x) => x.json());
      if (r.connected) setRealtime(r.realtime);
    } catch {
      // keep last known value; realtime is best-effort
    }
  }, []);

  const loadOverview = useCallback(async (d: number) => {
    try {
      const o = await fetch(`/api/website?days=${d}`, { cache: "no-store" }).then((x) => x.json());
      setConnected(o.connected);
      setOverview(o.overview);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + whenever the range changes.
  useEffect(() => {
    loadOverview(days);
  }, [days, loadOverview]);

  // Keep an open tab current: refetch the overview every 5 minutes and whenever
  // the tab regains focus, so daily numbers never go stale on a long-open page.
  useEffect(() => {
    if (!connected) return;
    const OVERVIEW_MS = 5 * 60 * 1000;
    const iv = setInterval(() => loadOverview(days), OVERVIEW_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadOverview(days);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [connected, days, loadOverview]);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!connected) return;
    loadRealtime();
    timer.current = setInterval(loadRealtime, REALTIME_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [connected, loadRealtime]);

  if (loading) {
    return (
      <section>
        <SectionHeader />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!connected) {
    return (
      <section>
        <SectionHeader />
        <Card className="p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Globe className="size-5" />
              </div>
              <div>
                <div className="font-semibold">Connect Postr analytics</div>
                <div className="text-sm text-muted-foreground">
                  Link Google Analytics once to see live visitors and daily traffic here.
                </div>
              </div>
            </div>
            <a href="/api/ga/oauth/start">
              <Button>Connect Google Analytics</Button>
            </a>
          </div>
        </Card>
      </section>
    );
  }

  const t = overview?.totals;
  const kpis = [
    { label: `Visitors (${overview?.rangeDays ?? 30}d)`, value: formatCompact(t?.activeUsers ?? 0), icon: Users, color: "hsl(var(--primary))" },
    { label: "New visitors", value: formatCompact(t?.newUsers ?? 0), icon: UserPlus, color: "#10b981" },
    { label: "Sessions", value: formatCompact(t?.sessions ?? 0), icon: MousePointerClick, color: "#a855f7" },
    { label: "Page views", value: formatCompact(t?.pageViews ?? 0), icon: FileText, color: "#06b6d4" },
    { label: "Avg engagement", value: formatDuration(t?.avgEngagementSeconds ?? 0), icon: Timer, color: "#f59e0b" },
    { label: "Engaged sessions", value: `${t?.engagementRate ?? 0}%`, icon: Activity, color: "#ef4444" },
    { label: "Bounce rate", value: `${t?.bounceRate ?? 0}%`, icon: LogOut, color: "#f43f5e" },
  ];

  const peak = Math.max(1, ...(realtime?.perMinute ?? [0]));

  return (
    <section className="space-y-4">
      <SectionHeader live={realtime?.activeUsers} days={days} onDays={setDays} />

      {/* Realtime strip */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative grid size-12 place-items-center rounded-2xl bg-success/15 text-success">
              <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-success opacity-60" style={{ top: 10, right: 10 }} />
              <Users className="size-6" />
            </div>
            <div>
              <div className="text-3xl font-bold tabular-nums">{formatNumber(realtime?.activeUsers ?? 0)}</div>
              <div className="text-sm text-muted-foreground">active right now (last 30 min)</div>
            </div>
          </div>

          {/* Per-minute bars */}
          <div className="flex h-14 flex-1 items-end gap-[3px] md:max-w-md">
            {(realtime?.perMinute ?? new Array(30).fill(0)).map((v, i) => (
              <motion.div
                key={i}
                initial={{ height: 2 }}
                animate={{ height: `${Math.max(6, (v / peak) * 100)}%` }}
                transition={{ duration: 0.4, delay: i * 0.008 }}
                className="flex-1 rounded-sm bg-success/70"
                title={`${v} in minute ${30 - i}`}
              />
            ))}
          </div>

          {realtime?.byCountry?.length ? (
            <div className="hidden min-w-[130px] shrink-0 lg:block">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Top country now</div>
              {realtime.byCountry.slice(0, 3).map((c) => (
                <div key={c.country} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.country}</span>
                  <span className="tabular-nums text-muted-foreground">{c.users}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="p-4">
              <div className="grid size-9 place-items-center rounded-lg [&_svg]:size-4" style={{ background: `${k.color}20`, color: k.color }}>
                <k.icon />
              </div>
              <div className="mt-3 text-xl font-bold tabular-nums">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Daily visitors chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Visitors · last {overview?.rangeDays ?? 30} days</CardTitle>
        </CardHeader>
        <CardContent>
          {overview?.daily?.length ? (
            <AreaMetricChart
              data={overview.daily}
              series={[
                { key: "users", label: "Visitors", color: "hsl(var(--primary))" },
                { key: "sessions", label: "Sessions", color: "#a855f7" },
              ]}
              height={260}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No daily data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Top pages + channels + countries */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard title="Top Pages" items={(overview?.topPages ?? []).map((p) => ({ label: p.path, value: formatNumber(p.views) }))} empty="No pages yet." mono />
        <ListCard title="Traffic Sources" items={(overview?.channels ?? []).map((c) => ({ label: c.channel, value: formatNumber(c.sessions) }))} empty="No sources yet." />
        <ListCard title="Top Countries" items={(overview?.countries ?? []).map((c) => ({ label: c.country, value: formatNumber(c.users) }))} empty="No country data yet." />
      </div>
    </section>
  );
}

function SectionHeader({
  live,
  days,
  onDays,
}: {
  live?: number;
  days?: number;
  onDays?: (d: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Website · Postr</h2>
      </div>
      <div className="flex items-center gap-2">
        {typeof live === "number" && (
          <Badge variant="success" className="gap-1.5">
            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-success" />
            {live} live
          </Badge>
        )}
        {onDays && (
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => onDays(r.days)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  days === r.days ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListCard({
  title,
  items,
  empty,
  mono,
}: {
  title: string;
  items: { label: string; value: string }[];
  empty: string;
  mono?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => Number(i.value.replace(/[^\d.]/g, "")) || 0));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>}
        {items.map((it) => {
          const w = Math.max(4, ((Number(it.value.replace(/[^\d.]/g, "")) || 0) / max) * 100);
          return (
            <div key={it.label} className="group">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={mono ? "truncate font-mono text-xs" : "truncate"} title={it.label}>
                  {it.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{it.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${w}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
