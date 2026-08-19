import { NextResponse } from "next/server";
import { getAllMetrics, buildAggregateSeries } from "@/lib/services/platforms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const perPlatform = await getAllMetrics(days);
  const data = buildAggregateSeries(perPlatform);
  return NextResponse.json({ data });
}
