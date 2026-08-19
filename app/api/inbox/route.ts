import { NextResponse } from "next/server";
import { getInbox } from "@/lib/services/comments";

export const dynamic = "force-dynamic";

export async function GET() {
  const comments = await getInbox(8);
  return NextResponse.json({ comments });
}
