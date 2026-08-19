import { NextResponse } from "next/server";
import { getOverview } from "@/lib/services/platforms";
import { deriveNotifications } from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const overview = await getOverview(30);
  return NextResponse.json({ notifications: deriveNotifications(overview) });
}
