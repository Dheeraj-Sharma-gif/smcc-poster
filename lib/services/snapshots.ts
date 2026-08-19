import { getSupabase } from "@/lib/supabase/client";
import type { PlatformId } from "@/lib/config";
import type { PlatformMetrics } from "./platforms/types";

/**
 * Persistence layer for daily snapshots. Everything degrades gracefully to a
 * no-op when Supabase isn't configured, so the app runs without a DB.
 */

export async function saveSnapshot(m: PlatformMetrics): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  const today = new Date().toISOString().slice(0, 10);
  await db.from("platform_snapshots").upsert(
    {
      platform: m.platform,
      snapshot_date: today,
      audience: m.audience,
      reach: m.reach,
      impressions: m.impressions,
      engagement: m.engagement,
      posts: m.posts,
      video_views: m.videoViews,
      engagement_rate: Number(m.engagementRate.toFixed(3)),
      connected: m.connected,
      extra: m.extra,
    },
    { onConflict: "platform,snapshot_date" }
  );

  if (m.topContent?.length) {
    await db.from("content_items").upsert(
      m.topContent.map((c) => ({
        platform: m.platform,
        external_id: c.id,
        title: c.title,
        type: c.type,
        published_at: c.publishedAt,
        reach: c.reach,
        likes: c.likes,
        comments: c.comments,
        shares: c.shares,
        views: c.views ?? 0,
        engagement_rate: Number(c.engagementRate.toFixed(3)),
        url: c.url,
        captured_date: today,
      })),
      { onConflict: "platform,external_id,captured_date" }
    );
  }
}

export interface SnapshotRow {
  platform: PlatformId;
  snapshot_date: string;
  audience: number;
  reach: number;
  impressions: number;
  engagement: number;
  posts: number;
  video_views: number;
  engagement_rate: number;
}

export async function getHistory(platform: PlatformId, days: number): Promise<SnapshotRow[]> {
  const db = getSupabase();
  if (!db) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data } = await db
    .from("platform_snapshots")
    .select("*")
    .eq("platform", platform)
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true });
  return (data as SnapshotRow[]) || [];
}

export async function getAllHistory(days: number): Promise<SnapshotRow[]> {
  const db = getSupabase();
  if (!db) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data } = await db
    .from("platform_snapshots")
    .select("*")
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true });
  return (data as SnapshotRow[]) || [];
}
