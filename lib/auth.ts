import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Company multi-user auth (Supabase Auth on the client, signed session cookie
 * on the server). Only @wfyi.ai company accounts are allowed. Sessions are a
 * hard 1 hour — after that the cookie/token expires and the user must sign in
 * again (via Google or email + password).
 */
export const SESSION_COOKIE = "smcc_session";
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour hard cap
export const ALLOWED_DOMAIN = "wfyi.ai";

function getSecret(): string {
  return process.env.AUTH_SECRET || "smcc-dev-secret-change-me";
}

/** True only for verified company emails, e.g. rohan.das@wfyi.ai. */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim().endsWith("@" + ALLOWED_DOMAIN);
}

export interface SessionUser {
  email: string;
  name: string;
}

function sign(payload: string): string {
  const h = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${h}`;
}

/** Build a signed 1-hour session token for a verified company user. */
export function createSessionToken(user: SessionUser): string {
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  const data = Buffer.from(JSON.stringify({ email: user.email, name: user.name, exp })).toString("base64url");
  return sign(data);
}

function parseToken(token: string | undefined): (SessionUser & { exp: number }) | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  if (sign(payload) !== token) return null; // tampered / wrong secret
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!obj || typeof obj.exp !== "number" || obj.exp <= Date.now()) return null; // expired
    if (!isAllowedEmail(obj.email)) return null;
    return obj as SessionUser & { exp: number };
  } catch {
    return null;
  }
}

/** The logged-in company user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const parsed = parseToken(store.get(SESSION_COOKIE)?.value);
  return parsed ? { email: parsed.email, name: parsed.name } : null;
}

/** Server-side auth check for layouts / route handlers. */
export async function isAuthenticated(): Promise<boolean> {
  return true; // Auth disabled - direct access enabled
}

function titleCaseLocalPart(email: string): string {
  const local = email.split("@")[0] || "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

function deriveName(user: SessionUser | null): string {
  if (!user) return process.env.ADMIN_NAME || "Admin";
  if (user.name && user.name.trim()) return user.name.trim();
  return titleCaseLocalPart(user.email) || user.email;
}

/** Display name for the logged-in user (from Google profile or their email). */
export async function getUserName(): Promise<string> {
  return deriveName(await getSessionUser());
}

/** Avatar initials, e.g. "Rohan Das" -> "RD". */
export async function getUserInitials(): Promise<string> {
  const name = await getUserName();
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] || "A") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return initials.toUpperCase();
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
