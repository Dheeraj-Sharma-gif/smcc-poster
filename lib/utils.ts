import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Time-aware greeting in India Standard Time (server runs in UTC). */
export function greetingIST(): string {
  let h: number;
  try {
    h = parseInt(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }),
      10
    ) % 24;
  } catch {
    h = new Date().getHours();
  }
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night"; // 9 PM through 4:59 AM
}

/** First name from a full name, e.g. "Rohan Das" -> "Rohan". */
export function firstNameOf(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

/** Remove a leading greeting like "Good evening, Rohan." so we can prepend a
 * fresh, correct one at render time (per logged-in user and current time). */
export function stripLeadingGreeting(s: string): string {
  return String(s || "")
    .replace(/^\s*(good\s+(morning|afternoon|evening|night)|hi|hello|hey)\b[^.!?]*[.!?,]?\s*/i, "")
    .trim();
}

/** Compact number formatting: 12345 -> "12.3K", 1200000 -> "1.2M" */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(value));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds)) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Percent change between two values, guarding division by zero. */
export function pctChange(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function classifyChange(pct: number): "up" | "down" | "flat" {
  if (pct > 0.5) return "up";
  if (pct < -0.5) return "down";
  return "flat";
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

/** Seeded pseudo-random generator so mock data is deterministic per key. */
export function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
