import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { launchInclude, toLaunchRow } from "@/lib/api-serializers";
import { computeKpis } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const launches = await prisma.launch.findMany({
      include: launchInclude,
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    });
    const rows = launches.map(toLaunchRow);

    return NextResponse.json({
      launches: rows,
      kpis: computeKpis(rows),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load launches" },
      { status: 500 }
    );
  }
}
