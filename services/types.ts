export type MetricSource = "API" | "MANUAL" | "DEMO";
export type LaunchPlatform = "X" | "LINKEDIN" | "OTHER";

export interface SocialMetricsInput {
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  collectedAt: Date;
  source: MetricSource;
}

export interface LaunchDetails {
  postId: string | null;
  authorHandle: string | null;
  postText: string;
  postedAt: Date | null;
  mediaType: string | null;
  source?: MetricSource;
}

export interface FundingEnrichment {
  amountUsd: number;
  round: string;
  announcedAt: Date | null;
  investors: string[];
  source: string;
  sourceUrl: string | null;
  confidence: number;
}

export interface ContactEnrichment {
  type: "EMAIL" | "PHONE" | "LINKEDIN" | "X" | "WEBSITE";
  value: string;
  label?: string;
  confidence: number;
  source: string;
}
