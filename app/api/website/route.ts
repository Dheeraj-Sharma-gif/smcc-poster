import { NextResponse } from "next/server";
import { getGa4Overview } from "@/lib/services/ga4";
import { isGa4Configured, isGa4Connected } from "@/lib/services/ga4-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days")) || 30;
  const connected = isGa4Configured() && (await isGa4Connected());
  if (!connected) return NextResponse.json({ connected: false, overview: null });
  const overview = await getGa4Overview(days);
  return NextResponse.json({ connected: Boolean(overview), overview });
}
