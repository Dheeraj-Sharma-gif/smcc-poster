import type { PlatformService, PlatformMetrics, FetchOptions, ContentItem, MetricPoint } from "./types";
import { fetchJson, dailyInsight, mockFallback } from "./base";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Instagram Business — Meta Graph API. REAL data only:
 *  - followers/media_count: account fields
 *  - daily reach + daily follower_count: insights (period=day) → honest chart
 *  - views / profile_views totals: insights (metric_type=total_value)
 *  - engagement + top posts: /media (like_count, comments_count, per-media insights)
 * No fabricated series — if a metric isn't available it stays 0.
 * (Meta removed account-level `impressions`; `views` is its replacement.)
 */
export const instagramService: PlatformService = {
  id: "instagram",

  isConfigured() {
    // Return mock data - real API disabled
    return false;
  },

  async fetchMetrics({ days }: FetchOptions): Promise<PlatformMetrics> {
    if (!this.isConfigured()) return mockFallback("instagram", days);
    const token = process.env.META_ACCESS_TOKEN!;
    const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
    try {
      const acct = await fetchJson<any>(
        `${GRAPH}/${igId}?fields=followers_count,media_count&access_token=${token}`
      );
      const followers = acct.followers_count ?? 0;

      const since = Math.floor((Date.now() - days * 86400000) / 1000);
      const until = Math.floor(Date.now() / 1000);

      // REAL daily series (period=day)
      const reachDaily = await dailyInsight(
        `${GRAPH}/${igId}/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${token}`
      );
      const followerDaily = await dailyInsight(
        `${GRAPH}/${igId}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${token}`
      );

      // REAL period totals (views replaces the deprecated impressions)
      const totals = await fetchJson<any>(
        `${GRAPH}/${igId}/insights?metric=views,profile_views&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${token}`
      ).catch(() => ({ data: [] }));
      const views = totalValue(totals, "views");
      const profileVisits = totalValue(totals, "profile_views");

      // Recent media for engagement + top content
      const media = await fetchJson<any>(
        `${GRAPH}/${igId}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(reach,saved,shares)&limit=50&access_token=${token}`
      ).catch(() => ({ data: [] }));
      const { topContent, likes, comments, saves, shares, engByDay } = mapMedia(media.data || []);
      const engagement = likes + comments + saves + shares;

      const reachTotal = reachDaily.reduce((a, d) => a + d.value, 0);
      const impressions = views || reachTotal;

      // Cumulative follower curve anchored so the latest point = current followers.
      const n = reachDaily.length;
      const followersArr = new Array<number>(n);
      if (n) {
        followersArr[n - 1] = followers;
        for (let i = n - 2; i >= 0; i--) followersArr[i] = followersArr[i + 1] - (followerDaily[i + 1]?.value || 0);
      }
      const series: MetricPoint[] = reachDaily.map((d, i) => ({
        date: d.date,
        followers: Math.max(0, Math.round(followersArr[i] ?? followers)),
        reach: d.value,
        impressions: d.value, // IG no longer exposes daily impressions; reach is the honest daily figure
        engagement: engByDay.get(d.date) || 0,
        videoViews: 0,
      }));

      return {
        platform: "instagram",
        connected: true,
        fetchedAt: new Date().toISOString(),
        audience: followers,
        reach: reachTotal,
        impressions,
        engagement,
        engagementRate: reachTotal ? (engagement / reachTotal) * 100 : 0,
        posts: (media.data || []).length,
        videoViews: 0,
        extra: { likes, comments, shares, saves, profileVisits, views },
        series,
        topContent,
      };
    } catch (err: any) {
      return mockFallback("instagram", days, `Instagram API: ${err.message}. Showing sample data.`);
    }
  },
};

function totalValue(resp: any, metric: string): number {
  const e = (resp?.data || []).find((x: any) => x.name === metric);
  return e?.total_value?.value || 0;
}

function mapMedia(items: any[]) {
  let likes = 0,
    comments = 0,
    saves = 0,
    shares = 0;
  const engByDay = new Map<string, number>();
  const topContent: ContentItem[] = items.map((m) => {
    const l = m.like_count || 0;
    const c = m.comments_count || 0;
    const ins = (m.insights?.data || []) as any[];
    const reach = ins.find((i) => i.name === "reach")?.values?.[0]?.value || 0;
    const sv = ins.find((i) => i.name === "saved")?.values?.[0]?.value || 0;
    const sh = ins.find((i) => i.name === "shares")?.values?.[0]?.value || 0;
    likes += l;
    comments += c;
    saves += sv;
    shares += sh;
    const day = String(m.timestamp || "").slice(0, 10);
    if (day) engByDay.set(day, (engByDay.get(day) || 0) + l + c + sv + sh);
    return {
      id: m.id,
      title: (m.caption || "Untitled").slice(0, 90),
      type: m.media_product_type === "REELS" ? "reel" : (m.media_type || "post").toLowerCase(),
      thumbnail: m.thumbnail_url || m.media_url,
      publishedAt: m.timestamp,
      reach,
      likes: l,
      comments: c,
      shares: sh,
      saves: sv,
      engagementRate: reach ? ((l + c + sv + sh) / reach) * 100 : 0,
      url: m.permalink,
    };
  });
  topContent.sort((a, b) => b.reach - a.reach);
  return { topContent: topContent.slice(0, 6), likes, comments, saves, shares, engByDay };
}
