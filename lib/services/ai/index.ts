import type { Overview } from "@/lib/services/platforms";
import { PLATFORMS, type PlatformId } from "@/lib/config";
import { formatCompact, formatPercent, clamp, stripLeadingGreeting } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase/client";

/**
 * AI insights. All the *analytics* (best posting time, consistency, trends,
 * action items) are computed deterministically from the data so they always
 * work. When ANTHROPIC_API_KEY is present, we additionally use the model to
 * write the natural-language executive summary / morning brief. Otherwise a
 * high-quality templated narrative is used.
 */

export interface Insights {
  generatedAt: string;
  usedModel: boolean;
  executiveSummary: string;
  morningBrief: string;
  healthExplanation: string;
  recommendations: string[];
  actionItems: { text: string; platform?: PlatformId; priority: "high" | "medium" | "low" }[];
  bestPostingTimes: { platform: PlatformId; day: string; hour: string; confidence: number }[];
  consistency: { platform: PlatformId; score: number; postsPerWeek: number }[];
  trends: { label: string; direction: "up" | "down" | "flat"; detail: string; platform?: PlatformId }[];
  topContent: { platform: PlatformId; title: string; reach: number; type: string }[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function generateInsights(overview: Overview): Promise<Insights> {
  const consistency = buildConsistency(overview);
  const bestPostingTimes = buildBestTimes(overview);
  const trends = buildTrends(overview);
  let actionItems = buildActionItems(overview, consistency);
  let recommendations = buildRecommendations(overview, consistency, trends);
  const topContent = buildTopContent(overview);
  const healthExplanation = buildHealthExplanation(overview);

  let executiveSummary = buildExecutiveSummary(overview, trends);
  let morningBrief = buildMorningBrief(overview, trends, actionItems);
  let usedModel = false;

  if (getAiProvider() !== "none") {
    const apply = (n: Narrative) => {
      executiveSummary = n.executiveSummary || executiveSummary;
      morningBrief = n.morningBrief || morningBrief;
      if (n.recommendations?.length) recommendations = n.recommendations.slice(0, 5);
      if (n.actionItems?.length) actionItems = n.actionItems.slice(0, 6);
      usedModel = true;
    };
    try {
      const cached = await readNarrativeCache();
      if (cached?.fresh) {
        // Reuse the last AI narrative so we call the model roughly twice an hour,
        // which keeps us inside the free-tier quota instead of hitting 429s.
        apply(cached.narrative);
      } else {
        const llm = await generateNarrative(overview);
        if (llm) {
          apply(llm);
          await writeNarrativeCache(llm).catch(() => {});
        } else if (cached) {
          // The model is unavailable right now (usually quota). Serve the last
          // real AI narrative rather than dropping to the plain template.
          apply(cached.narrative);
        }
      }
    } catch {
      // silent fallback to templated narrative
    }
  }

  // The greeting and name are added live at render (per logged-in user and
  // current time), so keep the stored brief greeting-free.
  morningBrief = stripLeadingGreeting(morningBrief);

  return {
    generatedAt: new Date().toISOString(),
    usedModel,
    executiveSummary,
    morningBrief,
    healthExplanation,
    recommendations,
    actionItems,
    bestPostingTimes,
    consistency,
    trends,
    topContent,
  };
}

/** Real (connected) platform ids — falls back to all if nothing is connected yet. */
function connectedIds(o: Overview): PlatformId[] {
  const all = Object.keys(o.perPlatform) as PlatformId[];
  const conn = all.filter((id) => o.perPlatform[id].connected);
  return conn.length ? conn : all;
}

function buildConsistency(o: Overview) {
  return connectedIds(o).map((id) => {
    const m = o.perPlatform[id];
    const postsPerWeek = (m.posts / o.days) * 7;
    const score = Math.round(clamp((postsPerWeek / 5) * 100, 0, 100));
    return { platform: id, score, postsPerWeek: Number(postsPerWeek.toFixed(1)) };
  });
}

function buildBestTimes(o: Overview) {
  // Derive from the day-of-week with the strongest average engagement in series.
  return connectedIds(o).map((id) => {
    const m = o.perPlatform[id];
    const byDow = new Array(7).fill(0).map(() => ({ sum: 0, n: 0 }));
    for (const p of m.series) {
      const dow = new Date(p.date).getUTCDay();
      byDow[dow].sum += p.engagement;
      byDow[dow].n += 1;
    }
    const avg = byDow.map((d) => (d.n ? d.sum / d.n : 0));
    const bestDow = avg.indexOf(Math.max(...avg));
    // Hour heuristic per platform archetype.
    const hourMap: Record<PlatformId, string> = {
      instagram: "7 to 9 PM",
      facebook: "1 to 3 PM",
      linkedin: "8 to 10 AM",
      youtube: "5 to 7 PM",
    };
    const spread = Math.max(...avg) / (avg.reduce((a, b) => a + b, 0) / 7 || 1);
    return {
      platform: id,
      day: DAYS[bestDow],
      hour: hourMap[id],
      confidence: Math.round(clamp((spread - 1) * 120 + 55, 40, 95)),
    };
  });
}

function buildTrends(o: Overview) {
  const trends: Insights["trends"] = [];
  const conn = connectedIds(o);
  const scores = o.scores.filter((s) => conn.includes(s.platform));
  for (const s of scores) {
    const dir = s.growthPct > 1 ? "up" : s.growthPct < -1 ? "down" : "flat";
    trends.push({
      label: `${PLATFORMS[s.platform].short} audience`,
      direction: dir,
      detail: `${formatPercent(s.growthPct)} over ${o.days} days (${formatCompact(s.audience)} ${PLATFORMS[s.platform].audienceLabel.toLowerCase()}).`,
      platform: s.platform,
    });
  }
  // Engagement leader trend
  const engLeader = [...scores].sort((a, b) => b.engagementRate - a.engagementRate)[0];
  if (engLeader) {
    trends.push({
      label: "Engagement leader",
      direction: "up",
      detail: `${PLATFORMS[engLeader.platform].short} leads at ${engLeader.engagementRate.toFixed(1)}% engagement rate.`,
      platform: engLeader.platform,
    });
  }
  return trends;
}

function buildActionItems(o: Overview, consistency: Insights["consistency"]): Insights["actionItems"] {
  const items: Insights["actionItems"] = [];
  const weakest = o.weakestPlatform;
  if (weakest) {
    items.push({
      text: `Prioritize ${PLATFORMS[weakest.platform].short}: it's your weakest channel (score ${weakest.score}). Post one high-value piece today.`,
      platform: weakest.platform,
      priority: "high",
    });
  }
  for (const c of consistency) {
    if (c.postsPerWeek < 2) {
      items.push({
        text: `Posting on ${PLATFORMS[c.platform].short} is light at ${c.postsPerWeek} a week. Schedule 3 posts this week.`,
        platform: c.platform,
        priority: "high",
      });
    }
  }
  const best = o.bestPlatform;
  if (best) {
    items.push({
      text: `${PLATFORMS[best.platform].short} is your top performer. Repurpose its best post to the other channels.`,
      platform: best.platform,
      priority: "medium",
    });
  }
  items.push({
    text: "Reply to comments within 2 hours on today's posts to lift engagement rate.",
    priority: "medium",
  });
  items.push({
    text: "Review this week's top content and plan a follow-up on the winning topic.",
    priority: "low",
  });
  return items.slice(0, 6);
}

function buildRecommendations(o: Overview, consistency: Insights["consistency"], trends: Insights["trends"]): string[] {
  const recs: string[] = [];
  const best = o.bestPlatform;
  const weak = o.weakestPlatform;
  if (best) recs.push(`${PLATFORMS[best.platform].short} is giving you the best return right now. Put more of your content time there and try a small paid boost on its top post.`);
  if (weak) recs.push(`${PLATFORMS[weak.platform].short} is lagging. Look at the format and opening hook, and reuse the style that works on ${best ? PLATFORMS[best.platform].short : "your best channel"}.`);
  const lowFreq = consistency.filter((c) => c.postsPerWeek < 3).map((c) => PLATFORMS[c.platform].short);
  if (lowFreq.length) recs.push(`You are posting less than 3 times a week on ${lowFreq.join(", ")}. Getting to 3 to 5 a week does the most for your reach.`);
  const down = trends.filter((t) => t.direction === "down" && t.platform);
  if (down.length) recs.push(`${down.map((t) => PLATFORMS[t.platform!].short).join(", ")} is losing momentum. Try a fresh content angle this week.`);
  recs.push("Batch your content once a week and schedule each post at that channel's busy hour so you stay consistent when work gets hectic.");
  return recs.slice(0, 5);
}

function buildTopContent(o: Overview) {
  const all = connectedIds(o).flatMap((id) =>
    o.perPlatform[id].topContent.slice(0, 2).map((c) => ({ platform: id, title: c.title, reach: c.reach, type: c.type }))
  );
  return all.sort((a, b) => b.reach - a.reach).slice(0, 5);
}

function buildHealthExplanation(o: Overview): string {
  const parts = o.healthBreakdown
    .map((b) => `${b.label} scored ${Math.round(b.value)}/100 (weight ${Math.round(b.weight * 100)}%)`)
    .join("; ");
  const verdict =
    o.healthScore >= 75 ? "strong overall health" : o.healthScore >= 50 ? "solid but improvable health" : "health that needs attention";
  return `Your overall health score is ${o.healthScore}/100, ${verdict}. It blends ${parts}. To raise it fastest, improve whichever part above is lowest.`;
}

function buildExecutiveSummary(o: Overview, trends: Insights["trends"]): string {
  const t = o.totals;
  const best = o.bestPlatform ? PLATFORMS[o.bestPlatform.platform].short : "none yet";
  const weak = o.weakestPlatform ? PLATFORMS[o.weakestPlatform.platform].short : "none yet";
  const growing = trends.filter((x) => x.direction === "up" && x.platform).length;
  return `Across all channels you reach ${formatCompact(t.followers)} followers, generated ${formatCompact(t.reach)} reach and ${formatCompact(t.impressions)} impressions over the last ${o.days} days, with ${formatCompact(t.engagement)} total interactions. ${best} is your strongest channel and ${weak} has the most upside. ${growing} of 5 platforms are growing. Overall health sits at ${o.healthScore}/100. Weekly follower growth is ${formatPercent((t.weeklyGrowth / Math.max(t.followers, 1)) * 100)}.`;
}

function buildMorningBrief(o: Overview, trends: Insights["trends"], actions: Insights["actionItems"], firstName = ""): string {
  const t = o.totals;
  const topAction = actions[0]?.text ?? "Keep your posting cadence steady today.";
  const mover = [...o.scores].sort((a, b) => b.growthPct - a.growthPct)[0];
  return `Yesterday added ${t.todayGrowth >= 0 ? "+" : ""}${formatCompact(t.todayGrowth)} followers across your channels. ${mover ? `${PLATFORMS[mover.platform].short} is your fastest mover (${formatPercent(mover.growthPct)}).` : ""} Health score is ${o.healthScore}/100. Today's priority: ${topAction}`;
}

type Narrative = {
  executiveSummary: string;
  morningBrief: string;
  recommendations?: string[];
  actionItems?: { text: string; priority: "high" | "medium" | "low" }[];
};

/** Safety net: strip em/en dashes and curly quotes in case the model slips. */
function clean(s: string): string {
  return String(s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s--\s/g, ", ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

// The AI narrative is cached in Supabase so the model is called about twice an
// hour instead of on every page load. That keeps usage inside the Gemini free
// tier (which was returning 429 "quota exceeded" and forcing the template).
const NARRATIVE_TTL_MS = 20 * 60 * 1000;

async function readNarrativeCache(): Promise<{ narrative: Narrative; fresh: boolean } | null> {
  const db = getSupabase();
  if (!db) return null;
  try {
    const { data } = await db
      .from("ai_cache")
      .select("payload, updated_at")
      .eq("id", "narrative")
      .maybeSingle();
    if (!data?.payload) return null;
    const age = Date.now() - new Date(data.updated_at).getTime();
    return { narrative: data.payload as Narrative, fresh: age < NARRATIVE_TTL_MS };
  } catch {
    return null;
  }
}

async function writeNarrativeCache(n: Narrative): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.from("ai_cache").upsert({ id: "narrative", payload: n, updated_at: new Date().toISOString() });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Picks the narrative provider based on which key is present.
 * Gemini is the recommended FREE option (Google AI Studio free tier — no card).
 * Groq is also free. Anthropic is paid. Order = preference.
 */
export function getAiProvider(): "gemini" | "groq" | "anthropic" | "none" {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

const BUSINESS_CONTEXT =
  "The account belongs to Postr, a modern social media platform. The audience is content creators, businesses, and influencers looking to grow their presence. Provide insights on engagement, follower growth, and content performance trends.";

const SYSTEM_PROMPT =
  "You are the analytics advisor for a Postr user. Write like a sharp, plain-spoken human colleague, not a chatbot. " +
  BUSINESS_CONTEXT +
  " Writing rules you must follow: never use em dashes or en dashes, use a period, comma, or colon instead. Avoid AI-flavoured words such as crucial, pivotal, leverage, testament, showcase, vibrant, delve, robust, seamless, or landscape. Do not force ideas into groups of three. Prefer simple verbs like is, are, has. Quote the actual numbers from the data. Vary your sentence length. No markdown, no bullet characters, no emojis, straight quotes only. Return strict JSON only.";

function buildUserPrompt(o: Overview): string {
  const data = {
    days: o.days,
    totals: o.totals,
    healthScore: o.healthScore,
    best: o.bestPlatform ? PLATFORMS[o.bestPlatform.platform].short : null,
    weakest: o.weakestPlatform ? PLATFORMS[o.weakestPlatform.platform].short : null,
    scores: o.scores.map((s) => ({ platform: PLATFORMS[s.platform].short, score: s.score, engagementRate: Number(s.engagementRate.toFixed(1)), growthPct: Number(s.growthPct.toFixed(1)) })),
  };
  return `Here is the live account data as JSON:\n${JSON.stringify(data)}\n\nWrite for the owner using these exact numbers. Return JSON with exactly these keys:\n- "executiveSummary": 3 to 4 sentences, analytical, plain English.\n- "morningBrief": 2 to 3 sentences, direct and motivating, with one clear priority for today. Do not add any greeting or the person's name; start straight with the update, because a greeting is added separately.\n- "recommendations": an array of 3 to 4 short strings, each a specific next move tied to the data and to this tax and finance brand.\n- "actionItems": an array of 3 to 4 objects shaped like {"text": "...", "priority": "high" | "medium" | "low"}, concrete tasks for today or this week.\nRemember: no em dashes anywhere, and no other text outside the JSON.`;
}

/** Parse the model's JSON. Returns null when the response is unusable so the
 * caller can fall back to cache or template instead of showing empty text. */
function parseNarrative(text: string): Narrative | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    const exec = typeof parsed.executiveSummary === "string" ? clean(parsed.executiveSummary) : "";
    const brief = typeof parsed.morningBrief === "string" ? clean(parsed.morningBrief) : "";
    if (!exec && !brief) return null;
    const recs = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((x: any) => typeof x === "string" && x.trim()).map(clean)
      : undefined;
    const acts = Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .filter((a: any) => a && typeof a.text === "string" && a.text.trim())
          .map((a: any) => ({
            text: clean(a.text),
            priority: ["high", "medium", "low"].includes(a.priority) ? a.priority : "medium",
          }))
      : undefined;
    return {
      executiveSummary: exec,
      morningBrief: brief,
      recommendations: recs && recs.length ? recs : undefined,
      actionItems: acts && acts.length ? acts : undefined,
    };
  } catch {
    return null;
  }
}

async function generateNarrative(o: Overview): Promise<Narrative | null> {
  const provider = getAiProvider();
  const prompt = buildUserPrompt(o);
  if (provider === "gemini") return withGemini(prompt);
  if (provider === "groq") return withGroq(prompt);
  if (provider === "anthropic") return withAnthropic(prompt);
  return null;
}

/** Google Gemini, free tier via AI Studio. Returns null on failure (e.g. 429). */
async function withGemini(prompt: string): Promise<Narrative | null> {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const call = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // Headroom for the thinking tokens plus the larger JSON payload.
        generationConfig: { temperature: 0.6, maxOutputTokens: 3200, responseMimeType: "application/json" },
      }),
      cache: "no-store",
    });
  let res = await call();
  if (res.status === 429) {
    // Free-tier rate limit. Wait once and retry before giving up.
    await sleep(3500);
    res = await call();
  }
  if (!res.ok) return null;
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
  return parseNarrative(text);
}

/** Groq, free tier, OpenAI-compatible endpoint. */
async function withGroq(prompt: string): Promise<Narrative | null> {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return parseNarrative(json?.choices?.[0]?.message?.content || "");
}

/** Anthropic, paid, optional. */
async function withAnthropic(prompt: string): Promise<Narrative | null> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  const resp = await client.messages.create({
    model,
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const text = resp.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
  return parseNarrative(text);
}

/**
 * Generic model call for other AI features (content generator, reply drafts).
 * Returns raw text or null if no provider is configured / the call fails.
 */
export async function runModel(system: string, user: string, maxTokens = 900): Promise<string | null> {
  const provider = getAiProvider();
  try {
    if (provider === "gemini") {
      const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
      const call = () =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: user }] }],
              // Gemini flash-latest is a thinking model, so reserve headroom for
              // its internal thinking so the JSON output isn't truncated.
              generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens + 1400, responseMimeType: "application/json" },
            }),
            cache: "no-store",
          }
        );
      let res = await call();
      if (res.status === 429) {
        await sleep(3500);
        res = await call();
      }
      if (!res.ok) return null;
      const json = await res.json();
      return json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || null;
    }
    if (provider === "groq") {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.8,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.choices?.[0]?.message?.content || null;
    }
    if (provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const resp = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      });
      return resp.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    }
  } catch {
    return null;
  }
  return null;
}

/** Extract the first JSON value from a model response. */
export function extractJson<T = any>(text: string | null): T | null {
  if (!text) return null;
  const match = text.match(/[[{][\s\S]*[}\]]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
