import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { postReply } from "@/lib/services/comments";
import { PLATFORM_IDS, type PlatformId } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!PLATFORM_IDS.includes(body.platform) || typeof body.commentId !== "string" || typeof body.text !== "string") {
    return NextResponse.json({ error: "platform, commentId and text required" }, { status: 400 });
  }
  const result = await postReply(body.platform as PlatformId, body.commentId, body.text);
  return NextResponse.json(result);
}
