import { fetchJson } from "@/lib/services/platforms/base";
import { PLATFORM_IDS, type PlatformId } from "@/lib/config";
import { hashString, seededRandom } from "@/lib/utils";
import { isPlatformConfigured } from "@/lib/services/platforms";
import { getYouTubeAccessToken } from "@/lib/services/youtube-oauth";

/**
 * Unified recent-comments inbox across platforms — now with THREADS.
 *  - YouTube: commentThreads (part=snippet,replies) + video titles (Data API key)
 *  - Instagram/Facebook: comments (+ their replies) on recent media/posts (Graph token)
 *  - LinkedIn: mock until Community Management token exists
 * Each comment carries:
 *  - the source post it belongs to (title + type: Video / Short / Reel / Story / Post…)
 *  - the full reply thread (my replies + any viewer follow-ups) as a chat
 *  - repliedByMe = whether I've already answered it
 * Falls back to deterministic mock comments per platform until creds exist.
 * NOTE: DMs are out of scope — this is a *comments* inbox.
 */

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  timestamp: string; // ISO
  mine: boolean; // true = posted by the channel/page owner (me)
}

export interface InboxComment {
  id: string;
  platform: PlatformId;
  author: string;
  text: string;
  timestamp: string; // ISO
  link?: string; // link to the comment author / profile
  postTitle?: string; // caption/title snippet of the source post
  postType?: string; // "Video" | "Short" | "Reel" | "Story" | "Post" | "Carousel" | "Photo"
  postLink?: string; // permalink to the source post/video
  likeCount?: number;
  connected: boolean;
  replies: CommentReply[]; // full thread, chronological
  repliedByMe: boolean; // I've replied at least once
}

const GRAPH = "https://graph.facebook.com/v21.0";
const YT = "https://www.googleapis.com/youtube/v3";

export async function getInbox(limitPerPlatform = 8): Promise<InboxComment[]> {
  const all = await Promise.all(
    PLATFORM_IDS.map(async (id) => {
      try {
        if (isPlatformConfigured(id)) {
          const real = await fetchReal(id, limitPerPlatform);
          if (real) return real;
        }
      } catch {
        /* fall through */
      }
      return mockComments(id, limitPerPlatform);
    })
  );
  return all.flat().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const byTime = (a: CommentReply, b: CommentReply) =>
  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

async function fetchReal(id: PlatformId, limit: number): Promise<InboxComment[] | null> {
  if (id === "youtube") return fetchYouTube(limit);
  if (id === "instagram") return fetchInstagram(limit);
  if (id === "facebook") return fetchFacebook(limit);
  return null;
}

// ---------------- YouTube ----------------
async function fetchYouTube(limit: number): Promise<InboxComment[]> {
  const key = process.env.YOUTUBE_API_KEY!;
  const channelId = process.env.YOUTUBE_CHANNEL_ID!;
  const data = await fetchJson<any>(
    `${YT}/commentThreads?part=snippet,replies&allThreadsRelatedToChannelId=${channelId}&maxResults=${limit}&order=time&key=${key}`
  );
  const items: any[] = data.items || [];

  // Resolve the video title for each comment ("which video is this on").
  const videoIds = Array.from(
    new Set(items.map((it) => it.snippet?.videoId).filter(Boolean))
  );
  const titleMap: Record<string, { title: string; isShort: boolean }> = {};
  if (videoIds.length) {
    const vids = await fetchJson<any>(
      `${YT}/videos?part=snippet,contentDetails&id=${videoIds.join(",")}&key=${key}`
    ).catch(() => ({ items: [] }));
    for (const v of vids.items || []) {
      const isShort = (v.contentDetails?.duration || "").match(/^PT(\d+)S$/) !== null;
      titleMap[v.id] = { title: v.snippet?.title || "Video", isShort };
    }
  }

  return items.map((it): InboxComment => {
    const top = it.snippet?.topLevelComment;
    const s = top?.snippet || {};
    const videoId = it.snippet?.videoId as string | undefined;
    const vinfo = videoId ? titleMap[videoId] : undefined;
    const replies: CommentReply[] = (it.replies?.comments || [])
      .map((r: any): CommentReply => {
        const rs = r.snippet || {};
        return {
          id: r.id,
          author: rs.authorDisplayName || "Viewer",
          text: rs.textOriginal || rs.textDisplay || "",
          timestamp: rs.publishedAt || new Date().toISOString(),
          mine: rs.authorChannelId?.value === channelId,
        };
      })
      .sort(byTime);
    return {
      id: top?.id || it.id,
      platform: "youtube",
      author: s.authorDisplayName || "Viewer",
      text: s.textOriginal || s.textDisplay || "",
      timestamp: s.publishedAt || new Date().toISOString(),
      link: s.authorChannelUrl,
      postTitle: vinfo?.title || (videoId ? "Video" : undefined),
      postType: vinfo?.isShort ? "Short" : "Video",
      postLink: videoId ? `https://youtube.com/watch?v=${videoId}` : undefined,
      likeCount: s.likeCount || 0,
      connected: true,
      replies,
      repliedByMe: replies.some((r) => r.mine),
    };
  });
}

// ---------------- Instagram ----------------
function igPostType(m: any): string {
  const pp = (m.media_product_type || "").toUpperCase();
  if (pp === "REELS") return "Reel";
  if (pp === "STORY") return "Story";
  const mt = (m.media_type || "").toUpperCase();
  if (mt === "VIDEO") return "Video";
  if (mt === "CAROUSEL_ALBUM") return "Carousel";
  return "Post";
}

async function fetchInstagram(limit: number): Promise<InboxComment[]> {
  const token = process.env.META_ACCESS_TOKEN!;
  const owner = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
  const media = await fetchJson<any>(
    `${GRAPH}/${owner}/media?fields=id,caption,media_type,media_product_type,permalink,comments.limit(10){id,text,username,from,timestamp,replies{id,text,username,from,timestamp}}&limit=8&access_token=${token}`
  );
  const out: InboxComment[] = [];
  for (const m of media.data || []) {
    const title = (m.caption || "").slice(0, 60) || "Instagram post";
    const postType = igPostType(m);
    for (const c of m.comments?.data || []) {
      const replies: CommentReply[] = (c.replies?.data || [])
        .map((r: any): CommentReply => ({
          id: r.id,
          author: r.username || r.from?.username || r.from?.name || "User",
          text: r.text || "",
          timestamp: r.timestamp || new Date().toISOString(),
          mine: r.from?.id === owner,
        }))
        .sort(byTime);
      out.push({
        id: c.id,
        platform: "instagram",
        author: c.username || c.from?.username || "User",
        text: c.text || "",
        timestamp: c.timestamp || new Date().toISOString(),
        postTitle: title,
        postType,
        postLink: m.permalink,
        connected: true,
        replies,
        repliedByMe: replies.some((r) => r.mine),
      });
    }
  }
  return out.slice(0, limit);
}

// ---------------- Facebook ----------------
function fbPostType(m: any): string {
  const at = m.attachments?.data?.[0]?.media_type;
  if (at === "video" || at === "video_inline") return "Video";
  if (at === "photo") return "Photo";
  if (at === "album") return "Album";
  return "Post";
}

async function fetchFacebook(limit: number): Promise<InboxComment[]> {
  const token = process.env.META_ACCESS_TOKEN!;
  const owner = process.env.FACEBOOK_PAGE_ID!;
  const posts = await fetchJson<any>(
    `${GRAPH}/${owner}/posts?fields=id,message,permalink_url,attachments{media_type},comments.limit(10){id,message,from,created_time,comments{id,message,from,created_time}}&limit=8&access_token=${token}`
  );
  const out: InboxComment[] = [];
  for (const m of posts.data || []) {
    const title = (m.message || "").slice(0, 60) || "Facebook post";
    const postType = fbPostType(m);
    for (const c of m.comments?.data || []) {
      const replies: CommentReply[] = (c.comments?.data || [])
        .map((r: any): CommentReply => ({
          id: r.id,
          author: r.from?.name || "User",
          text: r.message || "",
          timestamp: r.created_time || new Date().toISOString(),
          mine: r.from?.id === owner,
        }))
        .sort(byTime);
      out.push({
        id: c.id,
        platform: "facebook",
        author: c.from?.name || "User",
        text: c.message || "",
        timestamp: c.created_time || new Date().toISOString(),
        postTitle: title,
        postType,
        postLink: m.permalink_url,
        connected: true,
        replies,
        repliedByMe: replies.some((r) => r.mine),
      });
    }
  }
  return out.slice(0, limit);
}

export interface ReplyResult {
  ok: boolean;
  posted: boolean; // true = actually posted to the platform
  simulated?: boolean; // true = nothing was posted (no creds / unsupported)
  reason?: string;
  error?: string;
}

/**
 * Post a reply to a comment on its platform.
 *  - Instagram / Facebook: Graph API (needs the Meta token + comment-manage perms)
 *  - YouTube: Data API comments.insert (needs OAuth with youtube.force-ssl)
 *  - LinkedIn: requires Community Management permissions — simulated here
 * When credentials aren't present the reply is *simulated* (nothing is posted),
 * so the flow is testable today and goes live automatically once creds exist.
 */
export async function postReply(platform: PlatformId, commentId: string, text: string): Promise<ReplyResult> {
  const msg = text.trim();
  if (!msg) return { ok: false, posted: false, error: "Empty reply" };
  try {
    if (platform === "instagram") {
      if (!process.env.META_ACCESS_TOKEN) return simulated("Instagram token not set");
      await metaPost(`${GRAPH}/${commentId}/replies`, { message: msg });
      return { ok: true, posted: true };
    }
    if (platform === "facebook") {
      if (!process.env.META_ACCESS_TOKEN) return simulated("Facebook token not set");
      await metaPost(`${GRAPH}/${commentId}/comments`, { message: msg });
      return { ok: true, posted: true };
    }
    if (platform === "youtube") {
      const access = await getYouTubeAccessToken();
      if (!access) return simulated("Connect YouTube (OAuth) in Settings to enable replies");
      const res = await fetch(`${YT}/comments?part=snippet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
        body: JSON.stringify({ snippet: { parentId: commentId, textOriginal: msg } }),
      });
      if (!res.ok) throw new Error((await res.json())?.error?.message || `HTTP ${res.status}`);
      return { ok: true, posted: true };
    }
    if (platform === "linkedin") return simulated("LinkedIn replies need extra Marketing API permissions");
    return simulated("Unsupported platform");
  } catch (e: any) {
    return { ok: false, posted: false, error: e.message };
  }
}

function simulated(reason: string): ReplyResult {
  return { ok: true, posted: false, simulated: true, reason };
}

async function metaPost(url: string, params: Record<string, string>): Promise<void> {
  const body = new URLSearchParams({ ...params, access_token: process.env.META_ACCESS_TOKEN! });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message || `HTTP ${res.status}`);
  }
}

// ---------- Mock data (until creds exist) ----------
const MOCK_COMMENTS = [
  "This looks amazing! 😍 Where did you go for this?",
  "The views in this shot are unreal!",
  "I tried making this at home and it turned out great",
  "Can't believe you did this! Inspiring 💪",
  "This is my new favorite thing!",
  "Your dedication is insane 🔥",
  "Makes me want to travel everywhere",
  "The colors in this are just beautiful",
  "Best way to spend a Sunday!",
  "Absolutely loving this vibe",
  "This brings back so many memories",
  "Where can I get one of these?",
];

const MOCK_MY_REPLIES = [
  "So glad you enjoyed it! It was an amazing experience 🌟",
  "Thanks! It's my favorite spot, you should definitely visit",
  "That's awesome! Let me know how yours turned out 🙌",
  "Thank you so much for the kind words!",
  "Can't wait to explore more places and share them with you",
  "It took a lot of effort but totally worth it!",
  "Happy travels! Hope you get to experience it too ✈️",
  "Right? Nature is just incredible when you stop to appreciate it",
  "Nothing better than good vibes and great people 💯",
  "This place holds so many special moments for me",
  "Absolutely! Hoping to do more of these soon",
  "Thanks for the love and support, really means a lot!",
];

const MOCK_FOLLOWUPS = [
const MOCK_FOLLOWUPS = [
  "When's the next trip happening?",
  "Already planning to go there this month!",
  "Do you have the recipe written down?",
  "Tag me when you post behind-the-scenes!",
  "This inspired me to book a flight 🛫",
  "Honestly wish I could be there with you",
  "How much do these usually cost?",
  "Rewatching this for the 10th time",
  "Would love to see more from this place",
  "Everyone needs to see this",
  "Your content never gets old",
  "Already shared this in my group chat",
];

const MOCK_POSTS: Record<PlatformId, { type: string; title: string }[]> = {
  instagram: [
    { type: "Reel", title: "Hidden gems in Rajasthan 🏜️" },
    { type: "Carousel", title: "My 5 favorite travel destinations" },
    { type: "Story", title: "Quick poll: Beach or Mountains?" },
    { type: "Post", title: "Sunset moments in Goa 🌅" },
  ],
  facebook: [
    { type: "Video", title: "Homemade pasta cooking tips" },
    { type: "Post", title: "Just launched my new project!" },
    { type: "Photo", title: "Weekend adventure highlights" },
  ],
  linkedin: [
    { type: "Post", title: "5 lessons from my last project" },
    { type: "Post", title: "The future of remote work" },
  ],
  youtube: [
    { type: "Video", title: "Complete travel packing guide" },
    { type: "Short", title: "One trick you didn't know about" },
    { type: "Video", title: "My biggest learning this year" },
  ],
};

function mockComments(id: PlatformId, limit: number): InboxComment[] {
  const rand = seededRandom(hashString("comments" + id));
  const posts = MOCK_POSTS[id];
  const n = Math.max(3, Math.round(limit * (0.5 + rand() * 0.5)));
  return Array.from({ length: n }).map((_, i) => {
    const hoursAgo = Math.round(rand() * 72);
    const author = ["alex_creates", "sarah.smith", "mike_content", "emma_daily", "creator_vibes", "jay_films"][i % 6];
    const post = posts[(hashString(id) + i) % posts.length];
    const baseTs = new Date(Date.now() - hoursAgo * 3600000);
    const replied = i % 3 !== 0; // ~2/3 already answered
    const replies: CommentReply[] = [];
    if (replied) {
      replies.push({
        id: `${id}-cm-${i}-r0`,
        author: "Dheeraj Sharma",
        text: MOCK_MY_REPLIES[(hashString(id) + i) % MOCK_MY_REPLIES.length],
        timestamp: new Date(baseTs.getTime() + 3600000).toISOString(),
        mine: true,
      });
      // Every other replied thread has a viewer follow-up → needs a re-reply.
      if (i % 2 === 0) {
        replies.push({
          id: `${id}-cm-${i}-r1`,
          author,
          text: MOCK_FOLLOWUPS[(hashString(id) + i) % MOCK_FOLLOWUPS.length],
          timestamp: new Date(baseTs.getTime() + 7200000).toISOString(),
          mine: false,
        });
      }
    }
    return {
      id: `${id}-cm-${i}`,
      platform: id,
      author,
      text: MOCK_COMMENTS[(hashString(id) + i) % MOCK_COMMENTS.length],
      timestamp: baseTs.toISOString(),
      postTitle: post.title,
      postType: post.type,
      likeCount: Math.round(rand() * 25),
      connected: false,
      replies,
      repliedByMe: replies.some((r) => r.mine),
    };
  });
}
