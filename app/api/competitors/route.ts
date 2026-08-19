import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getCompetitorsWithStats, addCompetitor, removeCompetitor, SUGGESTED } from "@/lib/services/competitors";
import { getAllMetrics } from "@/lib/services/platforms";
import { PLATFORM_IDS, PLATFORMS, type PlatformId } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [competitors, perPlatform] = await Promise.all([getCompetitorsWithStats(), getAllMetrics(30)]);
  const yours = PLATFORM_IDS.map((id) => ({
    id,
    name: PLATFORMS[id].short,
    followers: perPlatform[id].audience,
    engagementRate: perPlatform[id].engagementRate,
  }));
  return NextResponse.json({ competitors, yours, suggested: SUGGESTED, persistence: isSupabaseConfigured() });
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!PLATFORM_IDS.includes(body.platform) || typeof body.handle !== "string" || !body.handle.trim()) {
    return NextResponse.json({ error: "platform and handle required" }, { status: 400 });
  }
  const added = await addCompetitor(body.platform as PlatformId, body.handle, body.label || body.handle);
  if (!added) return NextResponse.json({ error: "Could not add (is Supabase connected?)" }, { status: 500 });
  return NextResponse.json({ ok: true, competitor: added });
}

export async function DELETE(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await removeCompetitor(id);
  return NextResponse.json({ ok: true });
}
