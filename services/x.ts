import type { LaunchDetails, SocialMetricsInput } from "./types";

export interface XMetrics extends SocialMetricsInput {}
export interface XPostDetails extends LaunchDetails {}

const X_TWEET_URL_RE =
  /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/([^/?#]+)\/status(?:es)?\/(\d+)/i;

function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

function hashToRange(seed: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

function demoMetrics(postId: string): XMetrics {
  const likes = hashToRange(postId, 45, 2800);
  return {
    likes,
    comments: Math.round(likes * 0.06),
    reposts: Math.round(likes * 0.14),
    views: likes * hashToRange(postId.slice(-5), 24, 95),
    collectedAt: new Date(),
    source: "DEMO",
  };
}

function demoDetails(postId: string): XPostDetails {
  return {
    postId,
    authorHandle: `demo_founder_${postId.slice(-4)}`,
    postText:
      "We just launched a new AI product after our latest funding round. Early teams are using it to move faster from signal to customer outreach.",
    postedAt: new Date(),
    mediaType: "text",
    source: "DEMO",
  };
}

export function parseXPostId(url: string): string | null {
  const match = url.match(X_TWEET_URL_RE);
  return match?.[2] ?? null;
}

export function parseXAuthorHandle(url: string): string | null {
  const match = url.match(X_TWEET_URL_RE);
  return match?.[1] ? `@${match[1]}` : null;
}

async function fetchTweet(postId: string) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token || isDemoMode()) return null;

  const url = new URL(`https://api.twitter.com/2/tweets/${postId}`);
  url.searchParams.set("tweet.fields", "attachments,created_at,public_metrics,text");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "name,username");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`X API request failed with ${response.status}`);
  }

  return response.json() as Promise<{
    data?: {
      id: string;
      text?: string;
      created_at?: string;
      attachments?: { media_keys?: string[] };
      public_metrics?: {
        like_count?: number;
        reply_count?: number;
        retweet_count?: number;
        quote_count?: number;
        impression_count?: number;
      };
    };
    includes?: {
      users?: Array<{ id: string; username?: string; name?: string }>;
    };
  }>;
}

export async function fetchXPostMetrics(postId: string): Promise<XMetrics> {
  try {
    const payload = await fetchTweet(postId);
    const metrics = payload?.data?.public_metrics;
    if (!metrics) return demoMetrics(postId);

    return {
      likes: metrics.like_count ?? 0,
      comments: metrics.reply_count ?? 0,
      reposts: (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0),
      views: metrics.impression_count ?? 0,
      collectedAt: new Date(),
      source: "API",
    };
  } catch {
    return demoMetrics(postId);
  }
}

export async function fetchXPostDetails(postId: string): Promise<XPostDetails> {
  try {
    const payload = await fetchTweet(postId);
    const tweet = payload?.data;
    if (!tweet) return demoDetails(postId);

    const username = payload.includes?.users?.[0]?.username;

    return {
      postId: tweet.id,
      authorHandle: username ? `@${username}` : null,
      postText: tweet.text ?? "",
      postedAt: tweet.created_at ? new Date(tweet.created_at) : null,
      mediaType: tweet.attachments?.media_keys?.length ? "media" : "text",
      source: "API",
    };
  } catch {
    return demoDetails(postId);
  }
}
