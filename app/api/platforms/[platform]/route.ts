import { NextResponse } from "next/server";
import { getPlatformMetrics } from "@/lib/services/platforms";
import { PLATFORM_IDS, type PlatformId } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!PLATFORM_IDS.includes(platform as PlatformId)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
  }
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const metrics = await getPlatformMetrics(platform as PlatformId, days);
  return NextResponse.json(metrics);
}
