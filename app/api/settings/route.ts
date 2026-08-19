import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getSettings());
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const patch: any = {};
  if (["dark", "light", "system"].includes(body.theme)) patch.theme = body.theme;
  if ([0, 5, 10, 30].includes(body.refresh_interval)) patch.refresh_interval = body.refresh_interval;
  if (typeof body.notifications_enabled === "boolean") patch.notifications_enabled = body.notifications_enabled;
  const next = await updateSettings(patch);
  return NextResponse.json(next);
}
