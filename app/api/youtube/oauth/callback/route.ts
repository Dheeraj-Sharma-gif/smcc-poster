import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { exchangeCode } from "@/lib/services/youtube-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.redirect(new URL("/login", req.url));
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?yt=error", req.url));
  }
  const ok = await exchangeCode(code, url.origin);
  return NextResponse.redirect(new URL(`/settings?yt=${ok ? "connected" : "failed"}`, req.url));
}
