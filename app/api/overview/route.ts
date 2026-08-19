import { NextResponse } from "next/server";
import { getOverview } from "@/lib/services/platforms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = clampDays(new URL(req.url).searchParams.get("days"));
  const overview = await getOverview(days);
  return NextResponse.json(overview);
}

function clampDays(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 30;
  return Math.min(365, Math.max(1, Math.round(n)));
}
