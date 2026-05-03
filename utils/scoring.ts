export type PerformanceSignal =
  | "UNDERPERFORMING"
  | "STRONG_LAUNCH"
  | "NEEDS_DATA"
  | "READY_FOR_OUTREACH"
  | "NORMAL";

export interface LaunchScoreInput {
  fundingAmountUsd?: number | null;
  postedAt?: string | Date | null;
  xLikes?: number | null;
  linkedinLikes?: number | null;
  comments?: number | null;
  reposts?: number | null;
  views?: number | null;
}

export interface LaunchScoreResult {
  launchScore: number;
  signal: PerformanceSignal;
  reason: string;
  outreachAngle: string;
  totalEngagement: number;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLog(value: number, cap: number) {
  if (value <= 0) return 0;
  return clamp((Math.log10(value + 1) / Math.log10(cap + 1)) * 100);
}

function formatMoney(amountUsd: number) {
  if (amountUsd <= 0) return "no confirmed funding";
  return `$${(amountUsd / 1_000_000).toFixed(1)}M in funding`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value);
}

function getPostAgeHours(postedAt?: string | Date | null) {
  if (!postedAt) return null;
  const date = postedAt instanceof Date ? postedAt : new Date(postedAt);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
}

function formatAge(ageHours: number | null) {
  if (ageHours === null) return "unknown post age";
  if (ageHours < 1) return "posted less than 1 hour ago";
  if (ageHours < 48) return `posted ${Math.round(ageHours)} hours ago`;
  return `posted ${Math.round(ageHours / 24)} days ago`;
}

export function calculateLaunchScore(input: LaunchScoreInput): LaunchScoreResult {
  const fundingAmountUsd = input.fundingAmountUsd ?? 0;
  const fundingMillions = fundingAmountUsd / 1_000_000;
  const xLikes = input.xLikes ?? 0;
  const linkedinLikes = input.linkedinLikes ?? 0;
  const comments = input.comments ?? 0;
  const reposts = input.reposts ?? 0;
  const views = input.views ?? 0;
  const activeEngagement = xLikes + linkedinLikes + comments + reposts;
  const viewEngagementRate = views > 0 ? activeEngagement / views : null;
  const totalEngagement = activeEngagement + Math.round(views * 0.01);
  const postAgeHours = getPostAgeHours(input.postedAt);
  const maturityFactor = postAgeHours === null ? 1 : clamp(postAgeHours / 72, 0.25, 1);
  const context = `${formatMoney(fundingAmountUsd)}, ${formatNumber(activeEngagement)} active engagements, ${formatNumber(views)} views, ${formatAge(postAgeHours)}`;

  if (fundingAmountUsd <= 0 && totalEngagement <= 0) {
    return {
      launchScore: 50,
      signal: "NEEDS_DATA",
      reason: "Insufficient funding and engagement data to score confidently.",
      outreachAngle: "Collect funding context and platform metrics before outreach.",
      totalEngagement,
    };
  }

  const isUnderperforming =
    (fundingMillions >= 5 && xLikes < 500 * maturityFactor && activeEngagement < 1_000 * maturityFactor) ||
    (fundingMillions >= 20 && totalEngagement < 1_500 * maturityFactor) ||
    (fundingMillions >= 10 &&
      views >= 10_000 * maturityFactor &&
      viewEngagementRate !== null &&
      viewEngagementRate < 0.015);

  const isStrongLaunch =
    xLikes >= 3_000 * maturityFactor ||
    activeEngagement >= 5_000 * maturityFactor ||
    (views >= 100_000 * maturityFactor && activeEngagement >= 2_000 * maturityFactor);

  const engagementScore = normalizeLog(activeEngagement, 8_000);
  const reachScore = normalizeLog(views, 250_000);
  const fundingPressure = normalizeLog(fundingMillions, 50);
  let launchScore = Math.round(
    clamp(38 + engagementScore * 0.58 + reachScore * 0.18 - fundingPressure * 0.24)
  );

  if (isStrongLaunch) {
    launchScore = Math.max(launchScore, 86);
    return {
      launchScore,
      signal: "STRONG_LAUNCH",
      reason: `Launch engagement is strong relative to the available funding signal: ${context}.`,
      outreachAngle: "Lead with partnership, customer intro, or momentum-expansion messaging.",
      totalEngagement,
    };
  }

  if (isUnderperforming) {
    launchScore = Math.min(launchScore, fundingMillions >= 20 ? 32 : 40);
    return {
      launchScore,
      signal: "UNDERPERFORMING",
      reason: `Funding is meaningful, but launch traction looks soft for the signal: ${context}.`,
      outreachAngle: "Lead with specific launch-distribution observations and offer tactical feedback.",
      totalEngagement,
    };
  }

  if (activeEngagement < 100 || fundingAmountUsd <= 0) {
    return {
      launchScore: Math.min(launchScore, 55),
      signal: "NEEDS_DATA",
      reason: `The launch has limited measurable engagement or missing funding context: ${context}.`,
      outreachAngle: "Enrich the launch with funding and cross-platform metrics before prioritizing.",
      totalEngagement,
    };
  }

  return {
    launchScore,
    signal: "NORMAL",
    reason: `Launch performance is within a normal range for the current funding and engagement data: ${context}.`,
    outreachAngle: "Use light-touch outreach unless a stronger funding/contact signal appears.",
    totalEngagement,
  };
}
