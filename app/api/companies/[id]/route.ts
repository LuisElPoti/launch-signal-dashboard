import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { launchInclude, toLaunchRow } from "@/lib/api-serializers";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        fundingRounds: { orderBy: [{ announcedAt: "desc" }, { confidence: "desc" }] },
        contactMethods: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const launches = await prisma.launch.findMany({
      where: { companyId: id },
      include: launchInclude,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      company,
      launches: launches.map(toLaunchRow),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load company" },
      { status: 500 }
    );
  }
}
