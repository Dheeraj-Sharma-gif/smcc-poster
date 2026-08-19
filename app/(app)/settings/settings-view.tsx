"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, CheckCircle2, XCircle, Database, Sparkles, Loader2, Globe } from "lucide-react";
import { YoutubeIcon as Youtube } from "@/components/icons/brand-icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { cn } from "@/lib/utils";

const REFRESH_OPTS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 30, label: "30 min" },
];
const THEME_OPTS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" }).then((r) => r.json()).then(setSettings);
    fetch("/api/status", { cache: "no-store" }).then((r) => r.json()).then(setStatus);
  }, []);

  async function patch(body: any) {
    setSaving(true);
    const next = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    setSettings(next);
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the dashboard looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  patch({ theme: t.value });
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
                  theme === t.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data & refresh */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Refresh</CardTitle>
          <CardDescription>How often analytics auto-update.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium">Auto-refresh interval</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {REFRESH_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => patch({ refresh_interval: o.value })}
                  className={cn(
                    "rounded-lg border p-2.5 text-sm transition-colors",
                    settings?.refresh_interval === o.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Notifications</div>
              <div className="text-xs text-muted-foreground">Milestones, reach changes, low frequency alerts.</div>
            </div>
            <Switch
              checked={settings?.notifications_enabled ?? true}
              onCheckedChange={(v) => patch({ notifications_enabled: v })}
            />
          </div>
          {saving && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Saving…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Connections</CardTitle>
          <CardDescription>Add API credentials to <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> to switch a platform from sample to live data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(status?.platforms || []).map((p: any) => {
            const cfg = PLATFORMS[p.id as PlatformId];
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <cfg.icon className="size-5" style={{ color: cfg.color }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{cfg.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.requiredEnv.join(", ")}</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {p.configured ? (
                    <Badge variant="success"><CheckCircle2 className="size-3" /> Live</Badge>
                  ) : (
                    <Badge variant="muted"><XCircle className="size-3" /> Sample</Badge>
                  )}
                  <a href={cfg.docsUrl} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm">Docs</Button>
                  </a>
                </div>
              </div>
            );
          })}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Database className="size-5 text-primary" />
              <span className="text-sm font-medium">Supabase</span>
              {status?.supabase ? (
                <Badge variant="success" className="ml-auto">Connected</Badge>
              ) : (
                <Badge variant="muted" className="ml-auto">Not set</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Sparkles className="size-5 text-warning" />
              <span className="text-sm font-medium">AI {status?.aiProvider ? `(${status.aiProvider})` : "(Gemini free)"}</span>
              {status?.ai ? (
                <Badge variant="success" className="ml-auto">Connected</Badge>
              ) : (
                <Badge variant="muted" className="ml-auto">Not set</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <Youtube className="size-5 text-[#ff0000]" />
            <div className="min-w-0">
              <div className="text-sm font-medium">YouTube Analytics (watch-time, avg duration)</div>
              <div className="text-xs text-muted-foreground">OAuth, needed for real watch-time and retention.</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {status?.youtubeAnalyticsConnected ? (
                <Badge variant="success"><CheckCircle2 className="size-3" /> Connected</Badge>
              ) : status?.youtubeOAuthConfigured ? (
                <a href="/api/youtube/oauth/start"><Button size="sm">Connect</Button></a>
              ) : (
                <Badge variant="muted">Add OAuth keys</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <Globe className="size-5 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-medium">Website Analytics · Postr (GA4)</div>
              <div className="text-xs text-muted-foreground">Live visitors, daily traffic, top pages and sources on the dashboard.</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {status?.ga4Connected ? (
                <Badge variant="success"><CheckCircle2 className="size-3" /> Connected</Badge>
              ) : status?.ga4Configured ? (
                <a href="/api/ga/oauth/start"><Button size="sm">Connect</Button></a>
              ) : status?.ga4OAuthConfigured ? (
                <Badge variant="muted">Add GA4_PROPERTY_ID</Badge>
              ) : (
                <Badge variant="muted">Add OAuth keys</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Single admin. Change credentials via env vars.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Username & password are set with <code className="rounded bg-muted px-1 py-0.5 text-xs">ADMIN_USERNAME</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">ADMIN_PASSWORD</code>. Set a strong{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">AUTH_SECRET</code> in production.
        </CardContent>
      </Card>
    </div>
  );
}
