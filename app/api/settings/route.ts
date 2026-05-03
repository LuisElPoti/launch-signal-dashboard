import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { IntegrationStatus } from "@/lib/data";

export const runtime = "nodejs";

type SettingsCounts = {
  companies: number;
  launches: number;
  fundingRounds: number;
  socialMetrics: number;
  contactMethods: number;
  dmDrafts: number;
  analysisRuns: number;
};

const emptyCounts: SettingsCounts = {
  companies: 0,
  launches: 0,
  fundingRounds: 0,
  socialMetrics: 0,
  contactMethods: 0,
  dmDrafts: 0,
  analysisRuns: 0,
};

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function envIntegration({
  name,
  envName,
  connectedDetail,
  missingDetail,
  demoMode,
}: {
  name: string;
  envName: string;
  connectedDetail: string;
  missingDetail: string;
  demoMode: boolean;
}): IntegrationStatus {
  const configured = hasEnv(envName);

  if (demoMode) {
    return {
      name,
      status: "demo",
      detail: configured
        ? `${envName} is configured, but DEMO_MODE=true is forcing fallback/demo behavior.`
        : `${envName} is missing, so fallback/demo behavior is active.`,
    };
  }

  return {
    name,
    status: configured ? "connected" : "disconnected",
    detail: configured ? connectedDetail : missingDetail,
  };
}

export async function GET() {
  const demoMode = process.env.DEMO_MODE === "true";
  let counts = emptyCounts;
  let database: IntegrationStatus = {
    name: "Database",
    status: "disconnected",
    detail: "Unable to confirm the PostgreSQL connection.",
  };

  try {
    const [
      companies,
      launches,
      fundingRounds,
      socialMetrics,
      contactMethods,
      dmDrafts,
      analysisRuns,
    ] = await prisma.$transaction([
      prisma.company.count(),
      prisma.launch.count(),
      prisma.fundingRound.count(),
      prisma.socialMetric.count(),
      prisma.contactMethod.count(),
      prisma.dmDraft.count(),
      prisma.analysisRun.count(),
    ]);

    counts = {
      companies,
      launches,
      fundingRounds,
      socialMetrics,
      contactMethods,
      dmDrafts,
      analysisRuns,
    };

    database = {
      name: "Database",
      status: "connected",
      detail: `${launches} launches and ${companies} companies stored in PostgreSQL.`,
    };
  } catch (error) {
    database = {
      name: "Database",
      status: "disconnected",
      detail: error instanceof Error ? error.message : "Database health check failed.",
    };
  }

  return NextResponse.json({
    demoMode,
    generatedAt: new Date().toISOString(),
    counts,
    integrations: [
      database,
      envIntegration({
        name: "X API",
        envName: "X_BEARER_TOKEN",
        connectedDetail: "X_BEARER_TOKEN is configured. Imports can fetch live X post details and metrics.",
        missingDetail: "X_BEARER_TOKEN is missing. X imports will fail instead of saving demo data.",
        demoMode,
      }),
      {
        name: "LinkedIn",
        status: "manual",
        detail: "Manual/hybrid mode by design. No unauthorized scraping is attempted.",
      } satisfies IntegrationStatus,
      envIntegration({
        name: "Tavily",
        envName: "TAVILY_API_KEY",
        connectedDetail: "TAVILY_API_KEY is configured. Funding enrichment can search public announcements.",
        missingDetail: "TAVILY_API_KEY is missing. Funding rows will not be created from demo data.",
        demoMode,
      }),
      envIntegration({
        name: "OpenAI",
        envName: "OPENAI_API_KEY",
        connectedDetail: "OPENAI_API_KEY is configured. AI extraction, scoring analysis, and DM drafts are enabled.",
        missingDetail: "OPENAI_API_KEY is missing. AI steps will use deterministic fallback logic.",
        demoMode,
      }),
    ],
  });
}
