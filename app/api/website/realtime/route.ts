import { NextResponse } from "next/server";
import { getGa4Realtime } from "@/lib/services/ga4";
import { isGa4Configured, isGa4Connected } from "@/lib/services/ga4-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const connected = isGa4Configured() && (await isGa4Connected());
  if (!connected) return NextResponse.json({ connected: false, realtime: null });
  const realtime = await getGa4Realtime();
  return NextResponse.json({ connected: Boolean(realtime), realtime });
}
