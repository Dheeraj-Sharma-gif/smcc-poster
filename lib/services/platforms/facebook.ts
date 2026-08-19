import type { PlatformService, PlatformMetrics, FetchOptions, ContentItem, MetricPoint } from "./types";
import { fetchJson, dailyInsight, mockFallback } from "./base";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Facebook Page — Meta Graph API. REAL data only.
 * NOTE: Meta deprecated Page-level `page_impressions` / reach. The metrics that
 * still work are used here — no fabricated numbers:
 *  - page_post_engagements → engagement (daily)
 *  - page_video_views      → video views (daily)
 *  - page_views_total      → page views (shown in the "Reach" slot, honestly labelled)
 *  - page_daily_follows    → daily follower change (builds the follower curve)
 * Requires META_ACCESS_TOKEN (page token) + FACEBOOK_PAGE_ID.
 */
export const facebookService: PlatformService = {
  id: "facebook",

  isConfigured() {
    // Return mock data - real API disabled
    return false;
  },

  async fetchMetrics({ days }: FetchOptions): Promise<PlatformMetrics> {
    if (!this.isConfigured()) return mockFallback("facebook", days);
    const token = process.env.META_ACCESS_TOKEN!;
    const pageId = process.env.FACEBOOK_PAGE_ID!;
    try {
      const page = await fetchJson<any>(
        `${GRAPH}/${pageId}?fields=fan_count,followers_count&access_token=${token}`
      );
      const followers = page.followers_count ?? page.fan_count ?? 0;

      const since = Math.floor((Date.now() - days * 86400000) / 1000);
      const until = Math.floor(Date.now() / 1000);
      const q = (metric: string) =>
        `${GRAPH}/${pageId}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${token}`;

      // REAL daily series (only metrics Meta still supports at page level).
      const engDaily = await dailyInsight(q("page_post_engagements"));
      const vidDaily = await dailyInsight(q("page_video_views"));
      const viewsDaily = await dailyInsight(q("page_views_total"));
      const followDaily = await dailyInsight(q("page_daily_follows"));

      const engagement = sum(engDaily);
      const videoViews = sum(vidDaily);
      const pageViews = sum(viewsDaily);

      const posts = await fetchJson<any>(
        `${GRAPH}/${pageId}/posts?fields=id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=25&access_token=${token}`
      ).catch(() => ({ data: [] }));
      const postList: any[] = posts.data || [];
      const topContent = mapPosts(postList);
      // Real like/comment/share totals across recent posts.
      const postLikes = postList.reduce((a, p) => a + (p.likes?.summary?.total_count || 0), 0);
      const postComments = postList.reduce((a, p) => a + (p.comments?.summary?.total_count || 0), 0);
      const postShares = postList.reduce((a, p) => a + (p.shares?.count || 0), 0);
      const postsCount = postList.length;

      // Backbone = the longest real series available; build follower curve on it.
      const backbone = [viewsDaily, engDaily, vidDaily].sort((a, b) => b.length - a.length)[0] || [];
      const n = backbone.length;
      const followersArr = new Array<number>(n);
      if (n) {
        followersArr[n - 1] = followers;
        for (let i = n - 2; i >= 0; i--) followersArr[i] = followersArr[i + 1] - (byDate(followDaily).get(backbone[i + 1].date) || 0);
      }
      const engM = byDate(engDaily);
      const vidM = byDate(vidDaily);
      const viewsM = byDate(viewsDaily);
      const series: MetricPoint[] = backbone.map((d, i) => ({
        date: d.date,
        followers: Math.max(0, Math.round(followersArr[i] ?? followers)),
        reach: viewsM.get(d.date) || 0,
        impressions: viewsM.get(d.date) || 0,
        engagement: engM.get(d.date) || 0,
        videoViews: vidM.get(d.date) || 0,
      }));

      return {
        platform: "facebook",
        connected: true,
        fetchedAt: new Date().toISOString(),
        audience: followers,
        reach: pageViews,
        impressions: pageViews,
        engagement,
        // Avg engagement per post as a share of followers — a sensible page ER
        // (page reach isn't available, so we don't divide by page views).
        engagementRate: postsCount && followers ? (engagement / postsCount / followers) * 100 : 0,
        posts: postsCount,
        videoViews,
        extra: {
          pageLikes: page.fan_count ?? followers,
          videoViews,
          pageViews,
          likes: postLikes,
          comments: postComments,
          shares: postShares,
        },
        series,
        topContent,
      };
    } catch (err: any) {
      return mockFallback("facebook", days, `Facebook API: ${err.message}. Showing sample data.`);
    }
  },
};

function sum(arr: { value: number }[]): number {
  return arr.reduce((a, d) => a + d.value, 0);
}

function byDate(arr: { date: string; value: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of arr) m.set(d.date, d.value);
  return m;
}

function mapPosts(items: any[]): ContentItem[] {
  const content: ContentItem[] = items.map((p) => {
    const likes = p.likes?.summary?.total_count || 0;
    const comments = p.comments?.summary?.total_count || 0;
    const shares = p.shares?.count || 0;
    return {
      id: p.id,
      title: (p.message || "Untitled").slice(0, 90),
      type: "post",
      publishedAt: p.created_time,
      reach: 0,
      likes,
      comments,
      shares,
      engagementRate: 0,
      url: p.permalink_url,
    };
  });
  return content.sort((a, b) => b.likes + b.comments + b.shares - (a.likes + a.comments + a.shares)).slice(0, 6);
}
