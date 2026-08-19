import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { generateContentIdeas } from "@/lib/services/ai/content";
import { PLATFORM_IDS, type PlatformId } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const platform = PLATFORM_IDS.includes(body.platform) ? (body.platform as PlatformId) : "instagram";
  const topic = (typeof body.topic === "string" && body.topic.trim()) || "ITR filing tips";
  const tone = typeof body.tone === "string" ? body.tone : undefined;
  const count = Number(body.count) || 3;
  const result = await generateContentIdeas({ platform, topic, tone, count });
  return NextResponse.json(result);
}
