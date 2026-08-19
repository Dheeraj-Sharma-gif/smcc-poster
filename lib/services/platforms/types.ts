import type { PlatformId } from "@/lib/config";

export interface MetricPoint {
  date: string; // YYYY-MM-DD
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  videoViews: number;
}

export interface ContentItem {
  id: string;
  title: string;
  type: string; // post | reel | story | video | short | tweet
  thumbnail?: string;
  publishedAt: string;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  saves?: number;
  engagementRate: number;
  url?: string;
}

/** Normalized metrics every platform service returns. */
export interface PlatformMetrics {
  platform: PlatformId;
  /** true when the real official API supplied this data; false = mock fallback. */
  connected: boolean;
  fetchedAt: string; // ISO
  audience: number; // followers / subscribers
  reach: number;
  impressions: number;
  engagement: number; // total interactions in period
  engagementRate: number; // %
  posts: number; // published in period
  videoViews: number;
  /** platform-specific counters keyed by label. */
  extra: Record<string, number>;
  series: MetricPoint[];
  topContent: ContentItem[];
  /** non-fatal problems surfaced to the UI (e.g. token expired). */
  warning?: string;
}

export interface FetchOptions {
  /** number of days of history to return in `series`. */
  days: number;
}

export interface PlatformService {
  id: PlatformId;
  /** whether required env vars are all present. */
  isConfigured(): boolean;
  fetchMetrics(opts: FetchOptions): Promise<PlatformMetrics>;
}
