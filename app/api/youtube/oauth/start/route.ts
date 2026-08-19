import { NextResponse } from "next/server";
import { getAuthUrl, isOAuthConfigured } from "@/lib/services/youtube-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOAuthConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?yt=notconfigured", req.url));
  }
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(getAuthUrl(origin));
}
