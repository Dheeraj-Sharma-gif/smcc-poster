import { NextResponse } from "next/server";

/**
 * Deprecated. The old single-admin username/password endpoint has been replaced
 * by company Supabase Auth (Google + email) via /api/auth/session.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This sign-in method has been replaced. Please use the login page." },
    { status: 410 }
  );
}
