import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createSessionToken, cookieOptions, SESSION_COOKIE, isAllowedEmail, ALLOWED_DOMAIN } from "@/lib/auth";

/**
 * Exchange a verified Supabase access token for a signed 1-hour company
 * session cookie. Rejects any account that is not @wfyi.ai.
 */
export async function POST(req: Request) {
  const { accessToken } = await req.json().catch(() => ({}));
  if (typeof accessToken !== "string" || !accessToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "Authentication is not configured yet." }, { status: 500 });
  }

  // Validate the Supabase access token server-side and fetch the user.
  const supa = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supa.auth.getUser(accessToken);
  const email = data?.user?.email;
  if (error || !email) {
    return NextResponse.json({ error: "Invalid or expired sign-in." }, { status: 401 });
  }

  if (!isAllowedEmail(email)) {
    return NextResponse.json(
      { error: `Only @${ALLOWED_DOMAIN} company accounts are allowed.` },
      { status: 403 }
    );
  }

  const meta = data.user.user_metadata || {};
  const name = (meta.full_name || meta.name || "").toString();

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken({ email, name }), cookieOptions);
  return NextResponse.json({ ok: true });
}
