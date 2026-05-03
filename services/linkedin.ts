import type { LaunchDetails, SocialMetricsInput } from "./types";

export interface LinkedInPostUrl {
  postId: string | null;
  slug: string | null;
}

const LINKEDIN_POST_RE =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:posts|feed\/update|company)\/([^?#]+)/i;

function hashToRange(seed: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

export function parseLinkedInPostUrl(url: string): LinkedInPostUrl | null {
  const match = url.match(LINKEDIN_POST_RE);
  if (!match?.[1]) return null;

  const slug = decodeURIComponent(match[1].replace(/^urn:li:activity:/, ""));
  const numericId = slug.match(/(\d{8,})/)?.[1] ?? null;

  return {
    postId: numericId ?? slug,
    slug,
  };
}

export function getLinkedInDemoMetrics(url: string): SocialMetricsInput {
  const likes = hashToRange(url, 28, 1600);
  return {
    likes,
    comments: Math.round(likes * 0.05),
    reposts: Math.round(likes * 0.08),
    views: likes * hashToRange(url.slice(-12), 15, 60),
    collectedAt: new Date(),
    source: "DEMO",
  };
}

export function normalizeManualLinkedInMetrics(
  metrics?: Partial<Pick<SocialMetricsInput, "likes" | "comments" | "reposts" | "views">>
): SocialMetricsInput {
  return {
    likes: metrics?.likes ?? 0,
    comments: metrics?.comments ?? 0,
    reposts: metrics?.reposts ?? 0,
    views: metrics?.views ?? 0,
    collectedAt: new Date(),
    source: "MANUAL",
  };
}

export function getLinkedInDemoDetails(url: string): LaunchDetails {
  const parsed = parseLinkedInPostUrl(url);

  return {
    postId: parsed?.postId ?? null,
    authorHandle: null,
    postText:
      "We are excited to announce our latest product launch and share how it helps teams turn company signals into better growth workflows.",
    postedAt: new Date(),
    mediaType: "text",
    source: "DEMO",
  };
}
