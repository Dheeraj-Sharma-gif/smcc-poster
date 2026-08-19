"use client";
import { Heart, MessageCircle, Share2, Eye, Bookmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentItem } from "@/lib/services/platforms/types";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { formatCompact, formatDate } from "@/lib/utils";

export function TopContent({
  items,
  title = "Top Content",
  platform,
}: {
  items: (ContentItem & { platform?: PlatformId })[];
  title?: string;
  platform?: PlatformId;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No content yet.</p>}
        {items.map((c, i) => {
          const p = c.platform ?? platform;
          const cfg = p ? PLATFORMS[p] : null;
          return (
            <a
              key={c.id + i}
              href={c.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold" style={{ background: `${cfg?.color ?? "hsl(var(--primary))"}20`, color: cfg?.color ?? "hsl(var(--primary))" }}>
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {cfg && <cfg.icon className="size-3.5 shrink-0" style={{ color: cfg.color }} />}
                  <span className="truncate text-sm font-medium">{c.title}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="size-3" />{formatCompact(c.likes)}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="size-3" />{formatCompact(c.comments)}</span>
                  <span className="flex items-center gap-1"><Share2 className="size-3" />{formatCompact(c.shares)}</span>
                  {c.views !== undefined && <span className="flex items-center gap-1"><Eye className="size-3" />{formatCompact(c.views)}</span>}
                  {c.saves !== undefined && <span className="flex items-center gap-1"><Bookmark className="size-3" />{formatCompact(c.saves)}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Badge variant="muted" className="capitalize">{c.type}</Badge>
                <div className="mt-1 text-xs text-muted-foreground">{formatDate(c.publishedAt, { day: "numeric", month: "short" })}</div>
              </div>
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
