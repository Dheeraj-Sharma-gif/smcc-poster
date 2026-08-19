import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getGa4AuthUrl, isGa4OAuthConfigured } from "@/lib/services/ga4-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.redirect(new URL("/login", req.url));
  if (!isGa4OAuthConfigured()) {
    return NextResponse.redirect(new URL("/settings?ga=notconfigured", req.url));
  }
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(getGa4AuthUrl(origin));
}
