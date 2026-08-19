import { NextResponse } from "next/server";
import { isPlatformConfigured } from "@/lib/services/platforms";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isOAuthConfigured, isYouTubeAnalyticsConnected } from "@/lib/services/youtube-oauth";
import { isGa4OAuthConfigured, isGa4Configured, isGa4Connected } from "@/lib/services/ga4-oauth";
import { PLATFORMS, PLATFORM_IDS } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const platforms = PLATFORM_IDS.map((id) => ({
    id,
    name: PLATFORMS[id].name,
    configured: isPlatformConfigured(id),
    requiredEnv: PLATFORMS[id].requiredEnv,
    docsUrl: PLATFORMS[id].docsUrl,
  }));
  const aiProvider = process.env.GEMINI_API_KEY
    ? "Gemini"
    : process.env.GROQ_API_KEY
    ? "Groq"
    : process.env.ANTHROPIC_API_KEY
    ? "Anthropic"
    : null;
  return NextResponse.json({
    platforms,
    supabase: isSupabaseConfigured(),
    ai: Boolean(aiProvider),
    aiProvider,
    youtubeOAuthConfigured: isOAuthConfigured(),
    youtubeAnalyticsConnected: await isYouTubeAnalyticsConnected(),
    ga4OAuthConfigured: isGa4OAuthConfigured(),
    ga4Configured: isGa4Configured(),
    ga4Connected: (await isGa4Connected()),
  });
}
