import { getSupabase } from "@/lib/supabase/client";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { formatCompact } from "@/lib/utils";
import type { Overview } from "./platforms";

export interface AppNotification {
  id: string;
  type: "milestone" | "reach_up" | "reach_down" | "top_content" | "low_frequency";
  platform: PlatformId | null;
  title: string;
  body: string;
  severity: "info" | "success" | "warning";
  read: boolean;
  created_at: string;
}

const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

/** Derive notifications from an overview snapshot (deterministic, no DB needed). */
export function deriveNotifications(overview: Overview): AppNotification[] {
  const out: AppNotification[] = [];
  const now = new Date().toISOString();

  // Only real (connected) platforms generate notifications — never sample data.
  const allIds = Object.keys(overview.perPlatform) as PlatformId[];
  const connected = allIds.filter((id) => overview.perPlatform[id].connected);
  const ids = connected.length ? connected : allIds;

  for (const id of ids) {
    const m = overview.perPlatform[id];
    const cfg = PLATFORMS[id];

    // Follower milestone: nearest crossed milestone below current audience.
    const crossed = [...MILESTONES].reverse().find((x) => m.audience >= x);
    if (crossed && m.audience - crossed < crossed * 0.05) {
      out.push({
        id: `ms-${id}-${crossed}`,
        type: "milestone",
        platform: id,
        title: `${cfg.short} crossed ${formatCompact(crossed)} ${cfg.audienceLabel.toLowerCase()}`,
        body: `Now at ${formatCompact(m.audience)}. Keep the momentum going.`,
        severity: "success",
        read: false,
        created_at: now,
      });
    }

    // Reach movement over the period.
    if (m.series.length > 7) {
      const recent = m.series.slice(-7).reduce((a, p) => a + p.reach, 0);
      const prior = m.series.slice(-14, -7).reduce((a, p) => a + p.reach, 0);
      if (prior > 0) {
        const change = ((recent - prior) / prior) * 100;
        if (change >= 15) {
          out.push({
            id: `ru-${id}`,
            type: "reach_up",
            platform: id,
            title: `${cfg.short} reach up ${change.toFixed(0)}% this week`,
            body: `Weekly reach climbed to ${formatCompact(recent)}.`,
            severity: "success",
            read: false,
            created_at: now,
          });
        } else if (change <= -15) {
          out.push({
            id: `rd-${id}`,
            type: "reach_down",
            platform: id,
            title: `${cfg.short} reach down ${Math.abs(change).toFixed(0)}% this week`,
            body: `Weekly reach fell to ${formatCompact(recent)}. Worth a closer look.`,
            severity: "warning",
            read: false,
            created_at: now,
          });
        }
      }
    }

    // Low posting frequency.
    const perWeek = (m.posts / overview.days) * 7;
    if (perWeek < 2) {
      out.push({
        id: `lf-${id}`,
        type: "low_frequency",
        platform: id,
        title: `Low posting frequency on ${cfg.short}`,
        body: `About ${perWeek.toFixed(1)} posts a week. Aim for 3 to 5 to keep your reach up.`,
        severity: "warning",
        read: false,
        created_at: now,
      });
    }

    // Top content.
    const top = m.topContent[0];
    if (top && top.reach > m.audience * 0.5) {
      out.push({
        id: `tc-${id}`,
        type: "top_content",
        platform: id,
        title: `Top ${top.type} on ${cfg.short}`,
        body: `"${top.title.slice(0, 60)}" reached ${formatCompact(top.reach)}.`,
        severity: "info",
        read: false,
        created_at: now,
      });
    }
  }

  return out.slice(0, 20);
}

export async function persistNotifications(items: AppNotification[]): Promise<void> {
  const db = getSupabase();
  if (!db || !items.length) return;
  await db.from("notifications").upsert(
    items.map((n) => ({
      type: n.type,
      platform: n.platform,
      title: n.title,
      body: n.body,
      severity: n.severity,
    })),
    { onConflict: "title" }
  );
}
