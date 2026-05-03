import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { launchInclude, toLaunchRow } from "@/lib/api-serializers";
import { generateDmDraft } from "@/services/ai";

export const runtime = "nodejs";

const generateSchema = z.object({
  launchId: z.string().min(1),
  platform: z.enum(["X", "LINKEDIN"]),
  tone: z.enum(["concise", "warm", "direct"]),
});

export async function POST(request: Request) {
  const parsed = generateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid draft request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { launchId, platform, tone } = parsed.data;

  try {
    const launch = await prisma.launch.findUnique({
      where: { id: launchId },
      include: launchInclude,
    });

    if (!launch) {
      return NextResponse.json({ error: "Launch not found" }, { status: 404 });
    }

    const funding = launch.company.fundingRounds[0];
    const xMetric = launch.socialMetrics.find((metric) => metric.platform === "X");
    const linkedinMetric = launch.socialMetrics.find((metric) => metric.platform === "LINKEDIN");

    const draft = await generateDmDraft({
      platform,
      tone,
      companyName: launch.company.name,
      productName: launch.detectedProductName,
      postText: launch.postText,
      postedAt: launch.postedAt?.toISOString() ?? null,
      fundingAmountUsd: funding?.amountUsd ?? 0,
      fundingRound: funding?.round,
      metrics: {
        xLikes: xMetric?.likes ?? 0,
        linkedinLikes: linkedinMetric?.likes ?? 0,
        comments: (xMetric?.comments ?? 0) + (linkedinMetric?.comments ?? 0),
        reposts: (xMetric?.reposts ?? 0) + (linkedinMetric?.reposts ?? 0),
        views: (xMetric?.views ?? 0) + (linkedinMetric?.views ?? 0),
      },
      launchScore: launch.launchScore ?? 50,
      scoreReason: launch.performanceReason ?? "Launch score generated from funding and engagement metrics.",
      outreachAngle: launch.outreachAngle ?? "Share a concise launch-performance observation.",
    });

    await prisma.dmDraft.upsert({
      where: {
        launchId_platform_tone: {
          launchId,
          platform,
          tone,
        },
      },
      update: {
        body: draft.body,
        scoreReason: draft.scoreReason,
      },
      create: {
        launchId,
        platform,
        tone,
        body: draft.body,
        scoreReason: draft.scoreReason,
      },
    });

    const refreshedLaunch = await prisma.launch.findUniqueOrThrow({
      where: { id: launchId },
      include: launchInclude,
    });

    return NextResponse.json({
      draft,
      launch: toLaunchRow(refreshedLaunch),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate draft" },
      { status: 500 }
    );
  }
}
