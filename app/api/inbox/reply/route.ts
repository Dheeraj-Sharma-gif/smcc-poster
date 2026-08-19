import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { draftReply } from "@/lib/services/ai/content";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const reply = await draftReply({
    author: String(body.author || "there"),
    text: String(body.text || ""),
    platform: String(body.platform || "social"),
  });
  return NextResponse.json({ reply });
}
