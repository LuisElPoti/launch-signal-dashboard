import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { launchInclude, toLaunchRow } from "@/lib/api-serializers";
import { analyzeLaunchPerformance, extractLaunchInfo, generateDmDraft } from "@/services/ai";
import { enrichContactsForCompany } from "@/services/contacts";
import { enrichFundingForCompany } from "@/services/funding";
import {
  getLinkedInDemoDetails,
  getLinkedInDemoMetrics,
  normalizeManualLinkedInMetrics,
  parseLinkedInPostUrl,
} from "@/services/linkedin";
import type { LaunchDetails, LaunchPlatform, SocialMetricsInput } from "@/services/types";
import { fetchXPostDetails, fetchXPostMetrics, parseXAuthorHandle, parseXPostId } from "@/services/x";

export const runtime = "nodejs";

const importSchema = z.object({
  urls: z.array(z.string().url()).min(1),
  options: z.object({
    fetchXMetrics: z.boolean().default(true),
    enrichFunding: z.boolean().default(true),
    enrichContacts: z.boolean().default(true),
    generateDmDrafts: z.boolean().default(true),
  }),
  manualLinkedInMetrics: z
    .record(
      z.string(),
      z.object({
        likes: z.number().int().nonnegative().optional(),
        comments: z.number().int().nonnegative().optional(),
        reposts: z.number().int().nonnegative().optional(),
        views: z.number().int().nonnegative().optional(),
      })
    )
    .optional(),
});

type ImportLog = {
  url: string;
  progress?: {
    current: number;
    total: number;
  };
  step:
    | "platform_detected"
    | "post_details"
    | "social_metrics"
    | "ai_extraction"
    | "company_upsert"
    | "funding_enrichment"
    | "contact_enrichment"
    | "performance_analysis"
    | "dm_draft"
    | "launch_saved"
    | "import_failed"
    | "batch_failed";
  level: "info" | "warning" | "error";
  source?: "API" | "OPENAI" | "TAVILY" | "DEMO" | "FALLBACK" | "MANUAL" | "DATABASE";
  message: string;
  metadata?: Prisma.JsonObject;
};

type ImportResult = {
  url: string;
  analysisRunId: string;
  imported: boolean;
  launchId?: string;
  logs: ImportLog[];
  error?: string;
};

function detectPlatform(url: string): LaunchPlatform {
  if (parseXPostId(url)) return "X";
  if (parseLinkedInPostUrl(url)) return "LINKEDIN";
  return "OTHER";
}

function fallbackDetails(url: string): LaunchDetails {
  return {
    postId: null,
    authorHandle: null,
    postText: `Imported launch URL: ${url}`,
    postedAt: new Date(),
    mediaType: "text",
    source: "MANUAL",
  };
}

function emptyMetric(source: SocialMetricsInput["source"] = "MANUAL"): SocialMetricsInput {
  return {
    likes: 0,
    comments: 0,
    reposts: 0,
    views: 0,
    collectedAt: new Date(),
    source,
  };
}

function xProfileFromHandle(handle?: string | null) {
  if (!handle) return null;
  return `https://x.com/${handle.replace("@", "")}`;
}

async function findOrCreateCompany(input: {
  name: string;
  description?: string | null;
  industry?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
}) {
  const existing = await prisma.company.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
  });

  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: {
        description: existing.description ?? input.description ?? undefined,
        industry: existing.industry ?? input.industry ?? undefined,
        linkedinUrl: existing.linkedinUrl ?? input.linkedinUrl ?? undefined,
        xUrl: existing.xUrl ?? input.xUrl ?? undefined,
      },
    });
  }

  return prisma.company.create({
    data: {
      name: input.name,
      description: input.description ?? undefined,
      industry: input.industry ?? undefined,
      linkedinUrl: input.linkedinUrl ?? undefined,
      xUrl: input.xUrl ?? undefined,
    },
  });
}

async function persistFunding(companyId: string, companyName: string, website?: string | null) {
  const funding = await enrichFundingForCompany(companyName, website ?? undefined);
  const existing = await prisma.fundingRound.findFirst({
    where: {
      companyId,
      amountUsd: funding.amountUsd,
      round: funding.round,
      source: funding.source,
    },
  });

  if (!existing) {
    await prisma.fundingRound.create({
      data: {
        companyId,
        amountUsd: funding.amountUsd,
        round: funding.round,
        announcedAt: funding.announcedAt,
        investors: funding.investors,
        source: funding.source,
        sourceUrl: funding.sourceUrl,
        confidence: funding.confidence,
      },
    });
  }

  return funding;
}

async function persistContacts(company: {
  id: string;
  name: string;
  website?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
}) {
  const contacts = await enrichContactsForCompany(company);
  for (const contact of contacts) {
    await prisma.contactMethod.upsert({
      where: {
        companyId_type_value: {
          companyId: company.id,
          type: contact.type,
          value: contact.value,
        },
      },
      update: {
        label: contact.label,
        confidence: contact.confidence,
        source: contact.source,
      },
      create: {
        companyId: company.id,
        type: contact.type,
        value: contact.value,
        label: contact.label,
        confidence: contact.confidence,
        source: contact.source,
      },
    });
  }

  const website = contacts.find((contact) => contact.type === "WEBSITE")?.value;
  if (website && !company.website) {
    await prisma.company.update({
      where: { id: company.id },
      data: { website },
    });
  }

  return contacts;
}

export async function POST(request: Request) {
  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { urls, options, manualLinkedInMetrics } = parsed.data;
  const importedLaunchIds: string[] = [];
  const results: ImportResult[] = [];

  for (const [index, url] of urls.entries()) {
    const progress = { current: index + 1, total: urls.length };
    const logs: ImportLog[] = [];
    const addLog = (log: ImportLog) => logs.push({ ...log, progress });

    const analysisRun = await prisma.analysisRun.create({
      data: {
        status: "RUNNING",
        inputUrls: [url],
        logs: [],
      },
    });

    try {
        const platform = detectPlatform(url);
        const postId = platform === "X" ? parseXPostId(url) : parseLinkedInPostUrl(url)?.postId ?? null;
        const xHandle = platform === "X" ? parseXAuthorHandle(url) : null;
        addLog({
          url,
          step: "platform_detected",
          level: "info",
          source: "MANUAL",
          message: `Detected ${platform} launch URL`,
          metadata: { platform, postId },
        });

        let details: LaunchDetails = fallbackDetails(url);
        let metrics: SocialMetricsInput = emptyMetric();

        if (platform === "X" && postId) {
          details = await fetchXPostDetails(postId);
          details.authorHandle = details.authorHandle ?? xHandle;
          metrics = options.fetchXMetrics ? await fetchXPostMetrics(postId) : emptyMetric("MANUAL");
          addLog({
            url,
            step: "post_details",
            level: details.source === "API" ? "info" : "warning",
            source: details.source === "API" ? "API" : "DEMO",
            message:
              details.source === "API"
                ? "Fetched X post details from X API"
                : "Using demo fallback for X post details",
            metadata: {
              authorHandle: details.authorHandle,
              hasPostText: Boolean(details.postText),
            },
          });
          addLog({
            url,
            step: "social_metrics",
            level: metrics.source === "API" ? "info" : metrics.source === "MANUAL" ? "info" : "warning",
            source: metrics.source,
            message:
              metrics.source === "API"
                ? "Fetched X metrics from X API"
                : metrics.source === "MANUAL"
                  ? "X metrics fetch was disabled; saved manual zero metrics"
                  : "Using demo fallback for X metrics",
            metadata: {
              likes: metrics.likes,
              comments: metrics.comments,
              reposts: metrics.reposts,
              views: metrics.views,
            },
          });
        } else if (platform === "LINKEDIN") {
          details = getLinkedInDemoDetails(url);
          metrics = manualLinkedInMetrics?.[url]
            ? normalizeManualLinkedInMetrics(manualLinkedInMetrics[url])
            : getLinkedInDemoMetrics(url);
          addLog({
            url,
            step: "post_details",
            level: "warning",
            source: "DEMO",
            message: "Using LinkedIn demo post details because LinkedIn API/scraping is not enabled",
            metadata: { postId: details.postId },
          });
          addLog({
            url,
            step: "social_metrics",
            level: metrics.source === "MANUAL" ? "info" : "warning",
            source: metrics.source,
            message:
              metrics.source === "MANUAL"
                ? "Using manually supplied LinkedIn metrics"
                : "Using demo fallback for LinkedIn metrics",
            metadata: {
              likes: metrics.likes,
              comments: metrics.comments,
              reposts: metrics.reposts,
              views: metrics.views,
            },
          });
        } else {
          addLog({
            url,
            step: "post_details",
            level: "warning",
            source: "MANUAL",
            message: "Unsupported platform; saved URL with minimal imported details",
          });
          addLog({
            url,
            step: "social_metrics",
            level: "warning",
            source: metrics.source,
            message: "No metrics integration exists for this platform",
          });
        }

        const extracted = await extractLaunchInfo(details.postText, url);
        addLog({
          url,
          step: "ai_extraction",
          level: extracted.source === "OPENAI" ? "info" : "warning",
          source: extracted.source === "OPENAI" ? "OPENAI" : "FALLBACK",
          message:
            extracted.source === "OPENAI"
              ? "Extracted company/product with OpenAI"
              : "Using deterministic fallback for company/product extraction",
          metadata: {
            companyName: extracted.companyName,
            productName: extracted.productName,
            confidence: extracted.confidence,
          },
        });
        const xUrl = platform === "X" ? xProfileFromHandle(details.authorHandle ?? xHandle) : null;
        const linkedinUrl = platform === "LINKEDIN" ? url : null;
        const company = await findOrCreateCompany({
          name: extracted.companyName,
          description: extracted.summary,
          industry: extracted.industry,
          linkedinUrl,
          xUrl,
        });
        addLog({
          url,
          step: "company_upsert",
          level: "info",
          source: "DATABASE",
          message: `Matched or created company ${company.name}`,
          metadata: { companyId: company.id },
        });

        const launch = await prisma.launch.upsert({
          where: { postUrl: url },
          update: {
            companyId: company.id,
            platform,
            postId,
            authorHandle: details.authorHandle,
            postText: details.postText,
            postedAt: details.postedAt,
            mediaType: details.mediaType,
            detectedProductName: extracted.productName,
            aiSummary: extracted.summary,
          },
          create: {
            companyId: company.id,
            platform,
            postUrl: url,
            postId,
            authorHandle: details.authorHandle,
            postText: details.postText,
            postedAt: details.postedAt,
            mediaType: details.mediaType,
            detectedProductName: extracted.productName,
            aiSummary: extracted.summary,
          },
        });

        await prisma.socialMetric.create({
          data: {
            launchId: launch.id,
            platform,
            likes: metrics.likes,
            comments: metrics.comments,
            reposts: metrics.reposts,
            views: metrics.views,
            collectedAt: metrics.collectedAt,
            source: metrics.source,
          },
        });

        const funding = options.enrichFunding
          ? await persistFunding(company.id, company.name, company.website)
          : null;
        if (funding) {
          addLog({
            url,
            step: "funding_enrichment",
            level: funding.source === "TAVILY" ? "info" : "warning",
            source: funding.source === "TAVILY" ? "TAVILY" : "DEMO",
            message:
              funding.source === "TAVILY"
                ? "Enriched funding from Tavily funding announcement search"
                : "Using demo fallback for funding enrichment",
            metadata: {
              amountUsd: funding.amountUsd,
              round: funding.round,
              investors: funding.investors,
              confidence: funding.confidence,
              sourceUrl: funding.sourceUrl,
            },
          });
        } else {
          addLog({
            url,
            step: "funding_enrichment",
            level: "warning",
            source: "MANUAL",
            message: "Funding enrichment was disabled for this import",
          });
        }

        if (options.enrichContacts) {
          const contacts = await persistContacts({
            id: company.id,
            name: company.name,
            website: company.website,
            linkedinUrl: company.linkedinUrl ?? linkedinUrl,
            xUrl: company.xUrl ?? xUrl,
          });
          const hasOnlyFallbackContacts = contacts.every((contact) =>
            ["DEMO", "DOMAIN_INFERENCE", "INPUT_URL"].includes(contact.source)
          );
          addLog({
            url,
            step: "contact_enrichment",
            level: hasOnlyFallbackContacts ? "warning" : "info",
            source: hasOnlyFallbackContacts ? "FALLBACK" : "API",
            message: hasOnlyFallbackContacts
              ? "Contacts saved from demo/domain/input fallback sources"
              : "Contacts enriched from live provider",
            metadata: {
              count: contacts.length,
              sources: [...new Set(contacts.map((contact) => contact.source))],
            },
          });
        } else {
          addLog({
            url,
            step: "contact_enrichment",
            level: "warning",
            source: "MANUAL",
            message: "Contact enrichment was disabled for this import",
          });
        }

        const analysis = await analyzeLaunchPerformance({
          companyName: company.name,
          productName: extracted.productName,
          postText: details.postText,
          postedAt: details.postedAt?.toISOString() ?? null,
          fundingAmountUsd: funding?.amountUsd ?? 0,
          metrics: {
            xLikes: platform === "X" ? metrics.likes : 0,
            linkedinLikes: platform === "LINKEDIN" ? metrics.likes : 0,
            comments: metrics.comments,
            reposts: metrics.reposts,
            views: metrics.views,
          },
        });
        addLog({
          url,
          step: "performance_analysis",
          level: analysis.source === "OPENAI" ? "info" : "warning",
          source: analysis.source === "OPENAI" ? "OPENAI" : "FALLBACK",
          message:
            analysis.source === "OPENAI"
              ? "Analyzed launch performance with OpenAI"
              : "Using deterministic fallback for launch performance analysis",
          metadata: {
            launchScore: analysis.launchScore,
            signal: analysis.signal,
            reason: analysis.reason,
            views: metrics.views,
          },
        });

        await prisma.launch.update({
          where: { id: launch.id },
          data: {
            launchScore: analysis.launchScore,
            signal: analysis.signal,
            performanceReason: analysis.reason,
            outreachAngle: analysis.outreachAngle,
          },
        });

        if (options.generateDmDrafts && analysis.signal === "UNDERPERFORMING") {
          for (const draftPlatform of ["X", "LINKEDIN"] as const) {
            const draft = await generateDmDraft({
              platform: draftPlatform,
              tone: "warm",
              companyName: company.name,
              productName: extracted.productName,
              postText: details.postText,
              postedAt: details.postedAt?.toISOString() ?? null,
              fundingAmountUsd: funding?.amountUsd ?? 0,
              fundingRound: funding?.round,
              metrics: {
                xLikes: platform === "X" ? metrics.likes : 0,
                linkedinLikes: platform === "LINKEDIN" ? metrics.likes : 0,
                comments: metrics.comments,
                reposts: metrics.reposts,
                views: metrics.views,
              },
              launchScore: analysis.launchScore,
              scoreReason: analysis.reason,
              outreachAngle: analysis.outreachAngle,
            });

            await prisma.dmDraft.upsert({
              where: {
                launchId_platform_tone: {
                  launchId: launch.id,
                  platform: draftPlatform,
                  tone: "warm",
                },
              },
              update: {
                body: draft.body,
                scoreReason: draft.scoreReason,
              },
              create: {
                launchId: launch.id,
                platform: draftPlatform,
                tone: "warm",
                body: draft.body,
                scoreReason: draft.scoreReason,
              },
            });
            addLog({
              url,
              step: "dm_draft",
              level: draft.source === "OPENAI" ? "info" : "warning",
              source: draft.source === "OPENAI" ? "OPENAI" : "FALLBACK",
              message:
                draft.source === "OPENAI"
                  ? `Generated ${draftPlatform} DM draft with OpenAI`
                  : `Using deterministic fallback for ${draftPlatform} DM draft`,
              metadata: { platform: draftPlatform, tone: "warm" },
            });
          }
        } else {
          addLog({
            url,
            step: "dm_draft",
            level: "info",
            source: "DATABASE",
            message: options.generateDmDrafts
              ? `No DM draft generated because signal is ${analysis.signal}`
              : "DM draft generation was disabled for this import",
            metadata: { signal: analysis.signal },
          });
        }

        importedLaunchIds.push(launch.id);
        addLog({
          url,
          step: "launch_saved",
          level: "info",
          source: "DATABASE",
          message: `Imported ${platform} launch for ${company.name}`,
          metadata: { launchId: launch.id, companyId: company.id },
        });

        await prisma.analysisRun.update({
          where: { id: analysisRun.id },
          data: {
            status: "COMPLETED",
            logs: logs as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });

        results.push({
          url,
          analysisRunId: analysisRun.id,
          imported: true,
          launchId: launch.id,
          logs,
        });
    } catch (error) {
        addLog({
          url,
          step: "import_failed",
          level: "error",
          message: error instanceof Error ? error.message : "Unknown import error",
        });

        await prisma.analysisRun.update({
          where: { id: analysisRun.id },
          data: {
            status: "FAILED",
            logs: logs as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });

        results.push({
          url,
          analysisRunId: analysisRun.id,
          imported: false,
          logs,
          error: error instanceof Error ? error.message : "Unknown import error",
        });
    }
  }

  const launches = await prisma.launch.findMany({
    where: { id: { in: importedLaunchIds } },
    include: launchInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    analysisRunIds: results.map((result) => result.analysisRunId),
    imported: importedLaunchIds.length,
    results,
    launches: launches.map(toLaunchRow),
  });
}
