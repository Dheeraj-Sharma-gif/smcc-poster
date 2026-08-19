import { getSupabase } from "@/lib/supabase/client";
import { fetchJson } from "@/lib/services/platforms/base";
import { hashString, seededRandom } from "@/lib/utils";
import type { PlatformId } from "@/lib/config";

/**
 * Competitor tracking. Public competitor stats come from:
 *  - Instagram: Graph API business_discovery (needs your own META token)
 *  - YouTube:   Data API channels (API key)
 *  - X:         users/by/username public_metrics (bearer)
 * Everything falls back to deterministic mock data until credentials exist.
 * The competitor list persists in Supabase (table: competitors).
 */

export interface Competitor {
  id: string;
  platform: PlatformId;
  handle: string;
  label: string;
}

export interface CompetitorStats extends Competitor {
  followers: number;
  posts: number;
  engagementRate: number;
  connected: boolean;
}

const GRAPH = "https://graph.facebook.com/v21.0";

/** Suggested competitors for a fintech/tax brand (shown when the list is empty). */
export const SUGGESTED: Omit<Competitor, "id">[] = [
  { platform: "instagram", handle: "cleartax_in", label: "ClearTax" },
  { platform: "instagram", handle: "groww_official", label: "Groww" },
  { platform: "youtube", handle: "@zerodhaonline", label: "Zerodha" },
  { platform: "linkedin", handle: "cleartax", label: "ClearTax (LinkedIn)" },
];

export async function listCompetitors(): Promise<Competitor[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db.from("competitors").select("*").order("created_at", { ascending: true });
  return (data || []).map((r: any) => ({ id: r.id, platform: r.platform, handle: r.handle, label: r.label || r.handle }));
}

export async function addCompetitor(platform: PlatformId, handle: string, label: string): Promise<Competitor | null> {
  const db = getSupabase();
  if (!db) return null;
  const clean = handle.replace(/^@/, "").trim();
  const { data } = await db
    .from("competitors")
    .upsert({ platform, handle: clean, label: label || clean }, { onConflict: "platform,handle" })
    .select()
    .single();
  if (!data) return null;
  return { id: data.id, platform: data.platform, handle: data.handle, label: data.label };
}

export async function removeCompetitor(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.from("competitors").delete().eq("id", id);
}

export async function getCompetitorStats(c: Competitor): Promise<CompetitorStats> {
  try {
    if (c.platform === "instagram" && process.env.META_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      return await igStats(c);
    }
    if (c.platform === "youtube" && process.env.YOUTUBE_API_KEY) {
      return await ytStats(c);
    }
  } catch {
    /* fall through to mock */
  }
  return mockStats(c);
}

export async function getCompetitorsWithStats(): Promise<CompetitorStats[]> {
  const list = await listCompetitors();
  return Promise.all(list.map(getCompetitorStats));
}

async function igStats(c: Competitor): Promise<CompetitorStats> {
  const token = process.env.META_ACCESS_TOKEN!;
  const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
  const data = await fetchJson<any>(
    `${GRAPH}/${igId}?fields=business_discovery.username(${c.handle}){followers_count,media_count,media.limit(10){like_count,comments_count}}&access_token=${token}`
  );
  const bd = data.business_discovery || {};
  const media = bd.media?.data || [];
  const eng = media.reduce((a: number, m: any) => a + (m.like_count || 0) + (m.comments_count || 0), 0);
  const followers = bd.followers_count || 0;
  return {
    ...c,
    followers,
    posts: bd.media_count || 0,
    engagementRate: followers && media.length ? (eng / media.length / followers) * 100 : 0,
    connected: true,
  };
}

async function ytStats(c: Competitor): Promise<CompetitorStats> {
  const key = process.env.YOUTUBE_API_KEY!;
  const handle = c.handle.replace(/^@/, "");
  const data = await fetchJson<any>(`https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${handle}&key=${key}`);
  const s = data.items?.[0]?.statistics || {};
  const subs = Number(s.subscriberCount || 0);
  const views = Number(s.viewCount || 0);
  const videos = Number(s.videoCount || 0);
  return {
    ...c,
    followers: subs,
    posts: videos,
    engagementRate: subs && videos ? (views / videos / subs) * 100 : 0,
    connected: true,
  };
}

function mockStats(c: Competitor): CompetitorStats {
  const rand = seededRandom(hashString(c.platform + c.handle));
  const followers = Math.round(20000 + rand() * 480000);
  return {
    ...c,
    followers,
    posts: Math.round(200 + rand() * 2000),
    engagementRate: Number((1 + rand() * 6).toFixed(1)),
    connected: false,
  };
}
