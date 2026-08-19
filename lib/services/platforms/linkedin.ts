import type { PlatformService, PlatformMetrics, FetchOptions, MetricPoint } from "./types";
import { fetchJson, mockFallback } from "./base";

const API = "https://api.linkedin.com/rest";

/**
 * LinkedIn Company Page — Marketing API. REAL data only:
 *  - networkSizes                              → current follower count
 *  - organizationalEntityShareStatistics (DAY) → real daily impressions + engagement
 *  - organizationalEntityFollowerStatistics(DAY) → real daily follower gains → curve
 * No fabricated series. Requires LINKEDIN_ACCESS_TOKEN + LINKEDIN_ORGANIZATION_ID.
 * (post-level "top content" needs the UGC Posts API — left empty until wired.)
 */
export const linkedinService: PlatformService = {
  id: "linkedin",

  isConfigured() {
    // Return mock data - real API disabled
    return false;
  },

  async fetchMetrics({ days }: FetchOptions): Promise<PlatformMetrics> {
    if (!this.isConfigured()) return mockFallback("linkedin", days);
    const token = process.env.LINKEDIN_ACCESS_TOKEN!;
    const orgId = process.env.LINKEDIN_ORGANIZATION_ID!;
    const org = encodeURIComponent(`urn:li:organization:${orgId}`);
    const headers = {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": process.env.LINKEDIN_API_VERSION || "202405",
      "X-Restli-Protocol-Version": "2.0.0",
    };
    try {
      const followerStats = await fetchJson<any>(
        `${API}/networkSizes/${org}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
        { headers }
      ).catch(() => ({}));
      const followers = followerStats.firstDegreeSize ?? 0;

      const start = Date.now() - days * 86400000;
      const end = Date.now();

      // Real per-day share statistics (impressions, reactions, comments, shares, clicks)
      const stats = await fetchJson<any>(
        `${API}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${org}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${start}&timeIntervals.timeRange.end=${end}`,
        { headers }
      ).catch(() => ({ elements: [] }));

      // Real per-day follower gains
      const follows = await fetchJson<any>(
        `${API}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${org}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${start}&timeIntervals.timeRange.end=${end}`,
        { headers }
      ).catch(() => ({ elements: [] }));

      const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
      const impByDay = new Map<string, number>();
      const engByDay = new Map<string, number>();
      let impressions = 0,
        clicks = 0,
        reactions = 0,
        comments = 0,
        shares = 0;
      for (const el of stats.elements || []) {
        const s = el.totalShareStatistics || {};
        const d = dayKey(el.timeRange?.start ?? start);
        const imp = s.impressionCount || 0;
        const eng = (s.likeCount || 0) + (s.commentCount || 0) + (s.shareCount || 0) + (s.clickCount || 0);
        impByDay.set(d, (impByDay.get(d) || 0) + imp);
        engByDay.set(d, (engByDay.get(d) || 0) + eng);
        impressions += imp;
        clicks += s.clickCount || 0;
        reactions += s.likeCount || 0;
        comments += s.commentCount || 0;
        shares += s.shareCount || 0;
      }

      const gainByDay = new Map<string, number>();
      for (const el of follows.elements || []) {
        const g = el.followerGains || {};
        const d = dayKey(el.timeRange?.start ?? start);
        gainByDay.set(d, (gainByDay.get(d) || 0) + (g.organicFollowerGain || 0) + (g.paidFollowerGain || 0));
      }

      // Day-by-day series across the window; followers = cumulative curve anchored to current.
      const dates: string[] = [];
      for (let i = days - 1; i >= 0; i--) dates.push(dayKey(Date.now() - i * 86400000));
      const followersArr = new Array<number>(dates.length);
      followersArr[dates.length - 1] = followers;
      for (let i = dates.length - 2; i >= 0; i--) followersArr[i] = followersArr[i + 1] - (gainByDay.get(dates[i + 1]) || 0);
      const series: MetricPoint[] = dates.map((d, i) => ({
        date: d,
        followers: Math.max(0, Math.round(followersArr[i] ?? followers)),
        reach: impByDay.get(d) || 0,
        impressions: impByDay.get(d) || 0,
        engagement: engByDay.get(d) || 0,
        videoViews: 0,
      }));

      const engagement = reactions + comments + shares + clicks;
      return {
        platform: "linkedin",
        connected: true,
        fetchedAt: new Date().toISOString(),
        audience: followers,
        reach: impressions,
        impressions,
        engagement,
        engagementRate: impressions ? (engagement / impressions) * 100 : 0,
        posts: 0, // post count needs the UGC Posts API — wired later
        videoViews: 0,
        extra: {
          clicks,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          reactions,
          comments,
          shares,
        },
        series,
        topContent: [],
      };
    } catch (err: any) {
      return mockFallback("linkedin", days, `LinkedIn API: ${err.message}. Showing sample data.`);
    }
  },
};
