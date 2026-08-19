"use client";
import { useEffect, useState, useCallback } from "react";
import { FileText, FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AreaMetricChart } from "@/components/charts/area-metric-chart";
import { PLATFORMS } from "@/lib/config";
import { formatCompact, formatDate } from "@/lib/utils";
import { exportCSV, exportXLSX, exportPDF } from "@/lib/export/exporters";

const RANGE_OPTS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

export function ReportsView() {
  const [range, setRange] = useState("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [overview, setOverview] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const days = range === "custom" ? customDays(custom) : Number(range);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, ts] = await Promise.all([
        fetch(`/api/overview?days=${days}`).then((r) => r.json()),
        fetch(`/api/timeseries?days=${days}`).then((r) => r.json()),
      ]);
      setOverview(o);
      setSeries(ts.data || []);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const rangeLabel = range === "custom" && custom.from && custom.to ? `${custom.from} → ${custom.to}` : RANGE_OPTS.find((r) => r.value === range)?.label || "";

  function summaryRows() {
    if (!overview) return [];
    return overview.scores.map((s: any) => ({
      Platform: PLATFORMS[s.platform as keyof typeof PLATFORMS].name,
      Audience: s.audience,
      Reach: s.reach,
      "Engagement %": Number(s.engagementRate.toFixed(2)),
      "Growth %": Number(s.growthPct.toFixed(2)),
      Score: s.score,
    }));
  }

  async function doExport(kind: "csv" | "xlsx" | "pdf") {
    if (!overview) return;
    setBusy(kind);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "csv") {
        exportCSV(summaryRows(), `smcc-report-${stamp}.csv`);
      } else if (kind === "xlsx") {
        await exportXLSX(
          [
            { name: "Summary", rows: summaryRows() },
            { name: "Daily", rows: series },
          ],
          `smcc-report-${stamp}.xlsx`
        );
      } else {
        await exportPDF(
          {
            title: "Social Media Report",
            range: rangeLabel,
            healthScore: overview.healthScore,
            totals: {
              Followers: overview.totals.followers,
              Reach: overview.totals.reach,
              Impressions: overview.totals.impressions,
              Engagement: overview.totals.engagement,
              Posts: overview.totals.posts,
              "Video Views": overview.totals.videoViews,
            },
            scores: overview.scores.map((s: any) => ({
              name: PLATFORMS[s.platform as keyof typeof PLATFORMS].short,
              score: s.score,
              audience: s.audience,
              reach: s.reach,
              engagementRate: s.engagementRate,
              growthPct: s.growthPct,
            })),
          },
          `smcc-report-${stamp}.pdf`
        );
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Analytics Reports</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onChange={(e) => setRange(e.target.value)} options={RANGE_OPTS} />
            {range === "custom" && (
              <>
                <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-9 w-auto" />
                <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="h-9 w-auto" />
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => doExport("pdf")} disabled={busy !== null || loading}>
            {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} Export PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => doExport("xlsx")} disabled={busy !== null || loading}>
            {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Export Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => doExport("csv")} disabled={busy !== null || loading}>
            {busy === "csv" ? <Loader2 className="animate-spin" /> : <FileDown />} Export CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reach & Engagement · {rangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <AreaMetricChart
              data={series}
              series={[
                { key: "reach", label: "Reach", color: "hsl(var(--primary))" },
                { key: "engagement", label: "Engagement", color: "hsl(var(--success))" },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !overview ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Platform</th>
                    <th className="py-2 pr-4 font-medium">Audience</th>
                    <th className="py-2 pr-4 font-medium">Reach</th>
                    <th className="py-2 pr-4 font-medium">Eng %</th>
                    <th className="py-2 pr-4 font-medium">Growth</th>
                    <th className="py-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.scores.map((s: any) => {
                    const cfg = PLATFORMS[s.platform as keyof typeof PLATFORMS];
                    return (
                      <tr key={s.platform} className="border-b border-border/60">
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-2 font-medium">
                            <cfg.icon className="size-4" style={{ color: cfg.color }} />
                            {cfg.short}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">{formatCompact(s.audience)}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{formatCompact(s.reach)}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{s.engagementRate.toFixed(1)}%</td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          <span className={s.growthPct >= 0 ? "text-success" : "text-danger"}>
                            {s.growthPct >= 0 ? "+" : ""}
                            {s.growthPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5">
                          <Badge variant="muted">{s.score}</Badge>
                        </td>
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

function customDays(c: { from: string; to: string }): number {
  if (!c.from || !c.to) return 30;
  const d = Math.round((new Date(c.to).getTime() - new Date(c.from).getTime()) / 86400000);
  return Math.min(365, Math.max(1, d || 30));
}
