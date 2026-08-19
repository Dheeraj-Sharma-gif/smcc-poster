"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Swords, Loader2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS, PLATFORM_IDS, type PlatformId } from "@/lib/config";
import { formatCompact, cn } from "@/lib/utils";

interface CompStat {
  id: string;
  platform: PlatformId;
  handle: string;
  label: string;
  followers: number;
  posts: number;
  engagementRate: number;
  connected: boolean;
}

export function CompetitorsView() {
  const [data, setData] = useState<{ competitors: CompStat[]; yours: any[]; suggested: any[]; persistence: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<PlatformId>("instagram");
  const [handle, setHandle] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setData(await fetch("/api/competitors", { cache: "no-store" }).then((r) => r.json()));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(p = platform, h = handle, l = label) {
    if (!h.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: p, handle: h, label: l }) });
      setHandle("");
      setLabel("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/competitors?id=${id}`, { method: "DELETE" });
    await load();
  }

  const yoursByPlatform = (id: PlatformId) => data?.yours.find((y) => y.id === id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          <Swords className="size-6 text-primary" /> Competitor Tracking
        </h1>
        <p className="text-sm text-muted-foreground">Track how rival accounts grow versus yours.</p>
      </div>

      {data && !data.persistence && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          <TriangleAlert className="size-4" /> Connect Supabase to save competitors permanently.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a competitor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId)} options={PLATFORM_IDS.map((id) => ({ value: id, label: PLATFORMS[id].short }))} />
          <Input placeholder="@handle or channel" value={handle} onChange={(e) => setHandle(e.target.value)} className="w-48" />
          <Input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-40" />
          <Button onClick={() => add()} disabled={busy || !handle.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
          {data?.suggested && data.competitors.length === 0 && (
            <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground">Try:</span>
              {data.suggested.map((s: any) => (
                <button key={s.handle} onClick={() => add(s.platform, s.handle, s.label)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  {s.label} ({PLATFORMS[s.platform as PlatformId].short})
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracked competitors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : data?.competitors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No competitors yet. Add one above.</p>
          ) : (
            data?.competitors.map((c) => {
              const cfg = PLATFORMS[c.platform];
              const you = yoursByPlatform(c.platform);
              const lead = you ? you.followers - c.followers : 0;
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                  <div className="grid size-9 place-items-center rounded-lg" style={{ background: `${cfg.color}20` }}>
                    <cfg.icon className="size-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {c.label} <span className="text-xs text-muted-foreground">@{c.handle}</span>
                      <Badge variant={c.connected ? "success" : "muted"}>{c.connected ? "Live" : "Sample"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatCompact(c.followers)} followers · {formatCompact(c.posts)} posts · {c.engagementRate.toFixed(1)}% eng</div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {you && (
                      <div className="text-right text-xs">
                        <div className={cn("font-semibold", lead >= 0 ? "text-success" : "text-danger")}>
                          {lead >= 0 ? "You lead by " : "Behind by "}
                          {formatCompact(Math.abs(lead))}
                        </div>
                        <div className="text-muted-foreground">you: {formatCompact(you.followers)}</div>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(c.id)}>
                      <Trash2 className="text-danger" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
