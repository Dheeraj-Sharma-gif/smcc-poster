import { NextResponse } from "next/server";
import { exchangeGa4Code } from "@/lib/services/ga4-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/dashboard?ga=error", url.origin));
  }
  const ok = await exchangeGa4Code(code, url.origin);
  return NextResponse.redirect(new URL(`/dashboard?ga=${ok ? "connected" : "failed"}`, url.origin));
}
