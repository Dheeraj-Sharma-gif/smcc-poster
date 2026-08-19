/**
 * Central platform configuration. Adding a new source later (e.g. GA4) is a
 * matter of appending an entry here + a matching service in lib/services/platforms.
 */
import type * as React from "react";
import {
  InstagramIcon,
  FacebookIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "@/components/icons/brand-icons";

export type BrandIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export type PlatformId = "instagram" | "facebook" | "linkedin" | "youtube";

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  short: string;
  color: string; // hex for charts
  icon: BrandIcon;
  /** Primary "audience" metric label for this platform. */
  audienceLabel: string;
  /** Env var(s) that must be present for the real API to activate. */
  requiredEnv: string[];
  docsUrl: string;
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  instagram: {
    id: "instagram",
    name: "Instagram Business",
    short: "Instagram",
    color: "#e1306c",
    icon: InstagramIcon,
    audienceLabel: "Followers",
    requiredEnv: ["META_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
  },
  facebook: {
    id: "facebook",
    name: "Facebook Page",
    short: "Facebook",
    color: "#1877f2",
    icon: FacebookIcon,
    audienceLabel: "Followers",
    requiredEnv: ["META_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"],
    docsUrl: "https://developers.facebook.com/docs/pages-api",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn Company Page",
    short: "LinkedIn",
    color: "#0a66c2",
    icon: LinkedinIcon,
    audienceLabel: "Followers",
    requiredEnv: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_ORGANIZATION_ID"],
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/",
  },
  youtube: {
    id: "youtube",
    name: "YouTube Channel",
    short: "YouTube",
    color: "#ff0000",
    icon: YoutubeIcon,
    audienceLabel: "Subscribers",
    requiredEnv: ["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"],
    docsUrl: "https://developers.google.com/youtube/analytics",
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export const APP = {
  name: "Social Media Command Center",
  short: "SMCC",
  tagline: "Your whole audience in one place",
};
