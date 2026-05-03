import type { Prisma } from "@prisma/client";
import type { LaunchRow } from "@/lib/data";
import { mapBackendSignal } from "@/lib/data";

export const launchInclude = {
  company: {
    include: {
      fundingRounds: {
        orderBy: [{ announcedAt: "desc" }, { confidence: "desc" }],
      },
      contactMethods: true,
    },
  },
  socialMetrics: {
    orderBy: { collectedAt: "desc" },
  },
  dmDrafts: {
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.LaunchInclude;

export type LaunchWithRelations = Prisma.LaunchGetPayload<{
  include: typeof launchInclude;
}>;

function confidenceToPercent(confidence?: number | null) {
  if (!confidence) return 0;
  return Math.round(confidence <= 1 ? confidence * 100 : confidence);
}

function isoDate(date?: Date | null) {
  return (date ?? new Date()).toISOString().slice(0, 10);
}

export function toLaunchRow(launch: LaunchWithRelations): LaunchRow {
  const funding = launch.company.fundingRounds[0];
  const xMetric = launch.socialMetrics.find((metric) => metric.platform === "X");
  const linkedinMetric = launch.socialMetrics.find((metric) => metric.platform === "LINKEDIN");
  const contacts = launch.company.contactMethods;
  const draftX = launch.dmDrafts.find((draft) => draft.platform === "X");
  const draftLinkedIn = launch.dmDrafts.find((draft) => draft.platform === "LINKEDIN");
  const comments = (xMetric?.comments ?? 0) + (linkedinMetric?.comments ?? 0);
  const reposts = (xMetric?.reposts ?? 0) + (linkedinMetric?.reposts ?? 0);
  const views = (xMetric?.views ?? 0) + (linkedinMetric?.views ?? 0);
  const engagement = (xMetric?.likes ?? 0) + (linkedinMetric?.likes ?? 0) + comments + reposts;

  const contactConfidence = contacts.reduce(
    (max, contact) => Math.max(max, confidenceToPercent(contact.confidence)),
    0
  );

  return {
    id: launch.id,
    companyId: launch.companyId,
    company: launch.company.name,
    product: launch.detectedProductName ?? "Launch",
    launchUrl: launch.postUrl,
    fundingRaised: funding ? Number((funding.amountUsd / 1_000_000).toFixed(1)) : 0,
    fundingAmountUsd: funding?.amountUsd ?? 0,
    xLikes: xMetric?.likes ?? 0,
    linkedinLikes: linkedinMetric?.likes ?? 0,
    comments,
    reposts,
    views,
    engagement,
    launchScore: launch.launchScore ?? 50,
    signal: mapBackendSignal(launch.signal),
    contact: {
      email: contacts.find((contact) => contact.type === "EMAIL")?.value ?? null,
      phone: contacts.find((contact) => contact.type === "PHONE")?.value ?? null,
      linkedin: contacts.find((contact) => contact.type === "LINKEDIN")?.value ?? null,
      xProfile: contacts.find((contact) => contact.type === "X")?.value ?? null,
      confidenceScore: contactConfidence,
    },
    dmDraftX: draftX?.body ?? "",
    dmDraftLinkedin: draftLinkedIn?.body ?? "",
    aiAnalysis: {
      whyUnderperforming: launch.performanceReason ?? "No AI analysis has been generated yet.",
      suggestedAngle: launch.outreachAngle ?? "Run analysis to generate an outreach angle.",
    },
    launchPreview: launch.postText?.slice(0, 280) ?? "No post text captured.",
    stage: funding?.round ?? "Unknown",
    investors: funding?.investors ?? [],
    launchDate: isoDate(launch.postedAt ?? launch.createdAt),
    createdAt: launch.createdAt.toISOString(),
  };
}
