import { calculateLaunchScore, type PerformanceSignal } from "@/utils/scoring";
import type { LaunchPlatform, SocialMetricsInput } from "./types";
import {
  ANALYZE_LAUNCH_PERFORMANCE_PROMPT,
  EXTRACT_LAUNCH_INFO_PROMPT,
  GENERATE_DM_DRAFT_PROMPT,
} from "./prompts";

export interface ExtractedLaunchInfo {
  companyName: string;
  productName: string | null;
  summary: string;
  industry: string | null;
  confidence: number;
  source?: "OPENAI" | "FALLBACK";
}

export interface LaunchPerformanceInput {
  companyName: string;
  productName?: string | null;
  postText?: string | null;
  postedAt?: string | null;
  fundingAmountUsd?: number | null;
  metrics: {
    xLikes?: number | null;
    linkedinLikes?: number | null;
    comments?: number | null;
    reposts?: number | null;
    views?: number | null;
  };
}

export interface LaunchPerformanceAnalysis {
  launchScore: number;
  signal: PerformanceSignal;
  reason: string;
  outreachAngle: string;
  source?: "OPENAI" | "FALLBACK";
}

export interface GenerateDmDraftInput extends LaunchPerformanceInput {
  platform: Extract<LaunchPlatform, "X" | "LINKEDIN">;
  tone: "concise" | "warm" | "direct";
  launchScore: number;
  scoreReason: string;
  outreachAngle: string;
  fundingRound?: string | null;
}

export interface GeneratedDmDraft {
  platform: "X" | "LINKEDIN";
  body: string;
  scoreReason: string;
  source?: "OPENAI" | "FALLBACK";
}

function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

async function callOpenAIJson<T>(
  system: string,
  user: string,
  fallback: T
): Promise<{ data: T; source: "OPENAI" | "FALLBACK" }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || isDemoMode()) return { data: fallback, source: "FALLBACK" };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) return { data: fallback, source: "FALLBACK" };

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { data: fallback, source: "FALLBACK" };

    return { data: JSON.parse(content) as T, source: "OPENAI" };
  } catch {
    return { data: fallback, source: "FALLBACK" };
  }
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function companyFromUrl(url: string) {
  const known: Record<string, string> = {
    cerebralai: "Cerebral AI",
    fluxops: "FluxOps",
    "nomad-intelligence": "Nomad Intelligence",
    axonlabs: "Axon Labs",
    "verdant-systems": "Verdant Systems",
    spectersec: "Specter Security",
    luminaryanalytics: "Luminary Analytics",
  };

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const handle = parts[0]?.replace(/^@/, "");
    if (handle && known[handle.toLowerCase()]) return known[handle.toLowerCase()];
    if (handle) return titleCase(handle);
  } catch {
    return "Unknown Company";
  }

  return "Unknown Company";
}

function fallbackExtract(postText: string, url: string): ExtractedLaunchInfo {
  const companyName = companyFromUrl(url);
  const productMatch =
    postText.match(/(?:launch(?:ed|ing)?|introducing|built|shipping)\s+([^.!?\n]+)/i)?.[1] ??
    null;

  return {
    companyName,
    productName: productMatch ? productMatch.trim().slice(0, 80) : null,
    summary: postText.trim().slice(0, 220) || "Launch post imported for analysis.",
    industry: null,
    confidence: companyName === "Unknown Company" ? 0.25 : 0.55,
  };
}

function buildAnalysisPayload(input: LaunchPerformanceInput) {
  const xLikes = input.metrics.xLikes ?? 0;
  const linkedinLikes = input.metrics.linkedinLikes ?? 0;
  const comments = input.metrics.comments ?? 0;
  const reposts = input.metrics.reposts ?? 0;
  const views = input.metrics.views ?? 0;
  const activeEngagement = xLikes + linkedinLikes + comments + reposts;
  const weightedEngagement = activeEngagement + Math.round(views * 0.01);
  const viewEngagementRate = views > 0 ? activeEngagement / views : null;
  const postedAt = input.postedAt ? new Date(input.postedAt) : null;
  const postAgeHours =
    postedAt && !Number.isNaN(postedAt.getTime())
      ? Math.max(0, (Date.now() - postedAt.getTime()) / 3_600_000)
      : null;

  return {
    ...input,
    derivedMetrics: {
      activeEngagement,
      weightedEngagement,
      views,
      viewEngagementRate,
      postAgeHours,
      postAgeDays: postAgeHours === null ? null : postAgeHours / 24,
      fundingMillions: input.fundingAmountUsd ? input.fundingAmountUsd / 1_000_000 : 0,
    },
    baselineHeuristic: calculateLaunchScore({
      fundingAmountUsd: input.fundingAmountUsd,
      postedAt: input.postedAt,
      xLikes,
      linkedinLikes,
      comments,
      reposts,
      views,
    }),
  };
}

export async function extractLaunchInfo(
  postText: string,
  url: string
): Promise<ExtractedLaunchInfo> {
  const fallback = fallbackExtract(postText, url);

  const result = await callOpenAIJson<ExtractedLaunchInfo>(
    EXTRACT_LAUNCH_INFO_PROMPT,
    JSON.stringify({ postText, url }),
    fallback
  );

  return {
    ...result.data,
    source: result.source,
  };
}

export async function analyzeLaunchPerformance(
  input: LaunchPerformanceInput
): Promise<LaunchPerformanceAnalysis> {
  const fallbackScore = calculateLaunchScore({
    fundingAmountUsd: input.fundingAmountUsd,
    postedAt: input.postedAt,
    xLikes: input.metrics.xLikes,
    linkedinLikes: input.metrics.linkedinLikes,
    comments: input.metrics.comments,
    reposts: input.metrics.reposts,
    views: input.metrics.views,
  });
  const fallback: LaunchPerformanceAnalysis = {
    launchScore: fallbackScore.launchScore,
    signal: fallbackScore.signal,
    reason: fallbackScore.reason,
    outreachAngle: fallbackScore.outreachAngle,
  };

  const analysis = await callOpenAIJson<LaunchPerformanceAnalysis>(
    ANALYZE_LAUNCH_PERFORMANCE_PROMPT,
    JSON.stringify(buildAnalysisPayload(input)),
    fallback
  );

  const validSignals: PerformanceSignal[] = [
    "UNDERPERFORMING",
    "STRONG_LAUNCH",
    "NEEDS_DATA",
    "READY_FOR_OUTREACH",
    "NORMAL",
  ];

  return {
    launchScore: Math.max(0, Math.min(100, Math.round(analysis.data.launchScore ?? fallback.launchScore))),
    signal: validSignals.includes(analysis.data.signal) ? analysis.data.signal : fallback.signal,
    reason: analysis.data.reason || fallback.reason,
    outreachAngle: analysis.data.outreachAngle || fallback.outreachAngle,
    source: analysis.source,
  };
}

function fallbackDmDraft(input: GenerateDmDraftInput): GeneratedDmDraft {
  const product = input.productName ? ` for ${input.productName}` : "";
  const funding = input.fundingAmountUsd
    ? `$${(input.fundingAmountUsd / 1_000_000).toFixed(1)}M`
    : "recent funding";
  const activeEngagement =
    (input.metrics.xLikes ?? 0) +
    (input.metrics.linkedinLikes ?? 0) +
    (input.metrics.comments ?? 0) +
    (input.metrics.reposts ?? 0);
  const views = input.metrics.views ?? 0;
  const signalContext =
    views > 0
      ? `${activeEngagement.toLocaleString()} active engagements across ${views.toLocaleString()} views`
      : `${activeEngagement.toLocaleString()} active engagements`;

  const openers: Record<GenerateDmDraftInput["tone"], string> = {
    concise: `Saw ${input.companyName}'s launch${product}.`,
    warm: `Hey, congrats on the ${input.companyName} launch${product}.`,
    direct: `${input.companyName}'s launch${product} looks under-distributed relative to its funding signal.`,
  };

  const body =
    input.platform === "X"
      ? `${openers[input.tone]} The public traction looks quiet relative to ${funding} raised (${signalContext}). I noticed a few distribution angles that could improve the next push. Happy to share the quick read if useful.`
      : `${openers[input.tone]} I noticed public launch traction appears modest relative to ${funding} raised (${signalContext}). I work on launch signal analysis and have a few concrete observations on positioning and distribution. Open to connecting?`;

  return {
    platform: input.platform,
    body,
    scoreReason: input.scoreReason,
  };
}

export async function generateDmDraft(
  input: GenerateDmDraftInput
): Promise<GeneratedDmDraft> {
  const fallback = fallbackDmDraft(input);

  const result = await callOpenAIJson<GeneratedDmDraft>(
    GENERATE_DM_DRAFT_PROMPT,
    JSON.stringify(input),
    fallback
  );

  return {
    ...result.data,
    source: result.source,
  };
}

export function aggregateMetricsByPlatform(metrics: SocialMetricsInput[]) {
  return metrics.reduce(
    (acc, metric) => {
      acc.likes += metric.likes;
      acc.comments += metric.comments;
      acc.reposts += metric.reposts;
      acc.views += metric.views;
      return acc;
    },
    { likes: 0, comments: 0, reposts: 0, views: 0 }
  );
}
