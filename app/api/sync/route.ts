import { NextResponse } from "next/server";
import { getAllMetrics, buildOverview } from "@/lib/services/platforms";
import { saveSnapshot } from "@/lib/services/snapshots";
import { deriveNotifications, persistNotifications } from "@/lib/services/notifications";
import { PLATFORM_IDS } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Sync endpoint: fetch fresh metrics from every platform, store a daily
 * snapshot, and refresh derived notifications. Called by the manual refresh
 * button, the auto-refresh timer, and can be wired to a Vercel Cron for the
 * daily historical snapshot.
 */
export async function POST() {
  return doSync();
}

// Allow cron GET with a secret (Vercel Cron sends GET).
export async function GET(req: Request) {
  return doSync();
}

async function doSync() {
  const perPlatform = await getAllMetrics(30);
  await Promise.all(PLATFORM_IDS.map((id) => saveSnapshot(perPlatform[id])));
  const overview = buildOverview(perPlatform, 30);
  const notifications = deriveNotifications(overview);
  await persistNotifications(notifications);
  return NextResponse.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    connected: PLATFORM_IDS.filter((id) => perPlatform[id].connected),
    notifications: notifications.length,
  });
}
