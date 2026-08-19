import type { PlatformService, PlatformMetrics, FetchOptions, ContentItem } from "./types";
import type { MetricPoint } from "./types";
import { fetchJson, mockFallback } from "./base";
import { getYouTubeDailyAnalytics } from "@/lib/services/youtube-oauth";

const DATA = "https://www.googleapis.com/youtube/v3";

/**
 * YouTube Channel.
 *  - Current stats (subscribers, total views, top videos): Data API v3 (API key)
 *  - REAL daily time-series (views, watch-time, likes, comments, subs/day):
 *    YouTube Analytics API (OAuth). This makes the chart accurate and the
 *    7/30/90-day range genuinely change the data.
 * If OAuth analytics isn't connected, the series is built honestly from each
 * video's publish date + view count (no fabricated numbers).
 */
export const youtubeService: PlatformService = {
  id: "youtube",

  isConfigured() {
    // Return mock data - real API disabled
    return false;
  },

  async fetchMetrics({ days }: FetchOptions): Promise<PlatformMetrics> {
    if (!this.isConfigured()) return mockFallback("youtube", days);
    const key = process.env.YOUTUBE_API_KEY!;
    const channelId = process.env.YOUTUBE_CHANNEL_ID!;
    try {
      const channel = await fetchJson<any>(
        `${DATA}/channels?part=statistics,contentDetails&id=${channelId}&key=${key}`
      );
      const stats = channel.items?.[0]?.statistics || {};
      const subscribers = Number(stats.subscriberCount || 0);
      const totalViews = Number(stats.viewCount || 0);
      const uploadsPlaylist = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      // ---- Recent videos (for the "top content" list) ----
      let topContent: ContentItem[] = [];
      if (uploadsPlaylist) {
        const playlist = await fetchJson<any>(
          `${DATA}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=25&key=${key}`
        ).catch(() => ({ items: [] }));
        const ids = (playlist.items || []).map((i: any) => i.contentDetails.videoId).join(",");
        if (ids) {
          const videos = await fetchJson<any>(
            `${DATA}/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${key}`
          ).catch(() => ({ items: [] }));
          topContent = (videos.items || []).map((v: any): ContentItem => {
            const vs = v.statistics || {};
            const l = Number(vs.likeCount || 0);
            const c = Number(vs.commentCount || 0);
            const views = Number(vs.viewCount || 0);
            const isShort = (v.contentDetails?.duration || "").match(/^PT(\d+)S$/) !== null;
            return {
              id: v.id,
              title: v.snippet?.title || "Untitled",
              type: isShort ? "short" : "video",
              thumbnail: v.snippet?.thumbnails?.medium?.url,
              publishedAt: v.snippet?.publishedAt,
              reach: views,
              likes: l,
              comments: c,
              shares: 0,
              views,
              engagementRate: views ? ((l + c) / views) * 100 : 0,
              url: `https://youtube.com/watch?v=${v.id}`,
            };
          });
        }
      }

      // ---- REAL daily analytics (OAuth) ----
      const daily = await getYouTubeDailyAnalytics(days).catch(() => null);

      let series: MetricPoint[] = [];
      let periodViews = 0;
      let likes = 0;
      let comments = 0;
      let watchMinutes = 0;
      let postsInPeriod = 0;
      let analyticsConnected = 0;

      if (daily && daily.length) {
        analyticsConnected = 1;
        // Cumulative subscriber curve, anchored so the latest point = current subs.
        const nets = daily.map((d) => d.subsGained - d.subsLost);
        const followersArr = new Array(daily.length);
        followersArr[daily.length - 1] = subscribers;
        for (let i = daily.length - 2; i >= 0; i--) followersArr[i] = followersArr[i + 1] - nets[i + 1];

        series = daily.map((d, i): MetricPoint => {
          periodViews += d.views;
          likes += d.likes;
          comments += d.comments;
          watchMinutes += d.watchMinutes;
          return {
            date: d.date,
            followers: Math.max(0, followersArr[i]),
            reach: d.views,
            impressions: d.views,
            engagement: d.likes + d.comments,
            videoViews: d.views,
          };
        });
      } else {
        // Honest fallback: build the series from each video's publish date + views.
        const startMs = Date.now() - days * 86400000;
        const byDate = new Map<string, { views: number; eng: number }>();
        for (const v of topContent) {
          const t = new Date(v.publishedAt).getTime();
          if (t < startMs) continue;
          const day = v.publishedAt.slice(0, 10);
          const cur = byDate.get(day) || { views: 0, eng: 0 };
          cur.views += v.views || 0;
          cur.eng += v.likes + v.comments;
          byDate.set(day, cur);
          periodViews += v.views || 0;
          likes += v.likes;
          comments += v.comments;
          postsInPeriod += 1;
        }
        for (let i = days - 1; i >= 0; i--) {
          const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
          const d = byDate.get(day) || { views: 0, eng: 0 };
          series.push({ date: day, followers: subscribers, reach: d.views, impressions: d.views, engagement: d.eng, videoViews: d.views });
        }
      }

      // Posts published within the window (real count).
      if (analyticsConnected) {
        const startMs = Date.now() - days * 86400000;
        postsInPeriod = topContent.filter((v) => new Date(v.publishedAt).getTime() >= startMs).length;
      }

      const engagement = likes + comments;
      const avgViewDuration = periodViews ? Math.round((watchMinutes * 60) / periodViews) : 0;
      const watchTimeHours = Math.round(watchMinutes / 60);

      topContent.sort((a, b) => (b.views || 0) - (a.views || 0));

      return {
        platform: "youtube",
        connected: true,
        fetchedAt: new Date().toISOString(),
        audience: subscribers,
        reach: periodViews,
        impressions: periodViews,
        engagement,
        engagementRate: periodViews ? (engagement / periodViews) * 100 : 0,
        posts: postsInPeriod,
        videoViews: periodViews,
        extra: {
          watchTimeHours,
          avgViewDuration,
          analyticsConnected,
          likes,
          comments,
          videoViews: periodViews,
          lifetimeViews: totalViews,
        },
        series,
        topContent: topContent.slice(0, 6),
        warning: analyticsConnected
          ? undefined
          : "Connect YouTube Analytics (Settings) for full daily watch-time & retention history.",
      };
    } catch (err: any) {
      return mockFallback("youtube", days, `YouTube API: ${err.message}. Showing sample data.`);
    }
  },
};
