import { runModel, extractJson, getAiProvider } from "./index";
import type { PlatformId } from "@/lib/config";

export interface ContentIdea {
  hook: string; // scroll-stopping first line
  caption: string; // full caption / body
  hashtags: string[];
  cta: string;
  format: string; // reel | carousel | tweet | video | post ...
}

const BRAND =
  process.env.BRAND_CONTEXT ||
  "Postr: A cutting-edge social media platform for content creators, businesses, and influencers. Voice: modern, engaging, creative, and community-focused. Help users create viral-worthy content with trendy hashtags, compelling hooks, and platform-optimized formats.";

const PLATFORM_STYLE: Record<PlatformId, string> = {
  instagram: "short punchy caption, minimal emojis, a reel or carousel idea, 5 to 8 niche hashtags",
  facebook: "conversational and community-oriented, slightly longer, 2 to 4 hashtags",
  linkedin: "professional, insight-led thought leadership, no fluff, 3 to 5 hashtags",
  youtube: "a strong video title, a hook, and a short description outline with SEO keywords",
};

const WRITING_RULES =
  "Never use em dashes or en dashes; use a period, comma, or colon instead. Avoid AI-flavoured words like crucial, pivotal, leverage, seamless, testament, showcase, or vibrant. Sound like a real person, not a template. Straight quotes only.";

export async function generateContentIdeas(opts: {
  platform: PlatformId;
  topic: string;
  tone?: string;
  count?: number;
}): Promise<{ ideas: ContentIdea[]; usedModel: boolean }> {
  const count = Math.min(6, Math.max(1, opts.count || 3));
  if (getAiProvider() === "none") return { ideas: fallbackIdeas(opts, count), usedModel: false };

  const system =
    "You are an expert social-media content strategist and copywriter for an Indian fintech and tax-services brand. Write ready-to-post content. " +
    WRITING_RULES +
    " Return strict JSON only, no markdown.";
  const user = `Brand: ${BRAND}
Platform: ${opts.platform}. Style: ${PLATFORM_STYLE[opts.platform]}.
Topic: ${opts.topic}.
Tone: ${opts.tone || "helpful and confident"}.

Generate ${count} distinct, high-quality, original post ideas that a real audience would engage with. Be specific and India-focused; avoid generic filler.
Return JSON exactly: {"ideas":[{"hook":"scroll-stopping first line","caption":"full ready-to-post caption/body","hashtags":["#tag1","#tag2"],"cta":"clear call to action","format":"reel|carousel|post|video|tweet|thread"}]}`;

  const raw = await runModel(system, user, 1400);
  const parsed = extractJson<{ ideas: ContentIdea[] }>(raw);
  if (!parsed?.ideas?.length) return { ideas: fallbackIdeas(opts, count), usedModel: false };
  return {
    ideas: parsed.ideas.slice(0, count).map((i) => ({
      hook: i.hook || "",
      caption: i.caption || "",
      hashtags: Array.isArray(i.hashtags) ? i.hashtags.slice(0, 10) : [],
      cta: i.cta || "",
      format: i.format || "post",
    })),
    usedModel: true,
  };
}

/** Draft a reply to a comment (used by the inbox). */
export async function draftReply(comment: { author: string; text: string; platform: string }): Promise<string> {
  if (getAiProvider() === "none") {
    return `Thank you, ${comment.author}! 🙏 Great question. Our team will help you with this. Feel free to DM us or visit wfyi.ai.`;
  }
  const system =
    "You write warm, concise, on-brand replies to social media comments for an Indian tax and finance brand (WFYI). Friendly, helpful, never salesy. " +
    WRITING_RULES +
    " Return JSON only.";
  const user = `A ${comment.platform} comment from ${comment.author}: "${comment.text}". Write a short, helpful reply (1 to 2 sentences, India-focused). Return JSON: {"reply":"..."}`;
  const parsed = extractJson<{ reply: string }>(await runModel(system, user, 300));
  return parsed?.reply || `Thanks, ${comment.author}! We will help you with this. Feel free to reach out.`;
}

function fallbackIdeas(opts: { platform: PlatformId; topic: string }, count: number): ContentIdea[] {
  const base: ContentIdea[] = [
    {
      hook: `${opts.topic}: the 3 mistakes that cost you money`,
      caption: `Most people get ${opts.topic.toLowerCase()} wrong in the same 3 ways. Here is what to check before you file, and how to fix it in minutes. Save this for later.`,
      hashtags: ["#tax", "#ITR", "#personalfinance", "#India", "#WFYI"],
      cta: "Save this and share with someone who needs it.",
      format: opts.platform === "youtube" ? "video" : "carousel",
    },
    {
      hook: `Quick ${opts.topic} checklist 👇`,
      caption: `A simple checklist for ${opts.topic.toLowerCase()} so you don't miss a deduction. Which one did you almost forget?`,
      hashtags: ["#taxplanning", "#80C", "#finance", "#India"],
      cta: "Comment your biggest question below.",
      format: "post",
    },
    {
      hook: `${opts.topic}, explained in 30 seconds`,
      caption: `No jargon. Just the essentials of ${opts.topic.toLowerCase()} for salaried professionals and freelancers in India.`,
      hashtags: ["#taxtips", "#ITRfiling", "#moneytips"],
      cta: "Follow for weekly money tips.",
      format: opts.platform === "youtube" ? "video" : "reel",
    },
  ];
  return base.slice(0, count);
}
