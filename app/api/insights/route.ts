import { NextResponse } from "next/server";
import { getOverview } from "@/lib/services/platforms";
import { generateInsights } from "@/lib/services/ai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const overview = await getOverview(days);
  const insights = await generateInsights(overview);
  return NextResponse.json(insights);
}
