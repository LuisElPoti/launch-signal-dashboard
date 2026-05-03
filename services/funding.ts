import type { FundingEnrichment } from "./types";
import { searchTavily, type TavilySearchResponse } from "./tavily";

const DEMO_FUNDING: Record<string, FundingEnrichment> = {
  "cerebral ai": {
    amountUsd: 12_500_000,
    round: "Seed",
    announcedAt: new Date("2025-04-18"),
    investors: ["Khosla Ventures", "Pioneer Fund"],
    source: "DEMO",
    sourceUrl: null,
    confidence: 0.91,
  },
  fluxops: {
    amountUsd: 8_200_000,
    round: "Series A",
    announcedAt: new Date("2025-04-20"),
    investors: ["Sequoia", "Andreessen Horowitz"],
    source: "DEMO",
    sourceUrl: null,
    confidence: 0.86,
  },
  "nomad intelligence": {
    amountUsd: 22_000_000,
    round: "Series B",
    announcedAt: new Date("2025-04-15"),
    investors: ["Tiger Global", "Coatue"],
    source: "DEMO",
    sourceUrl: null,
    confidence: 0.82,
  },
  "axon labs": {
    amountUsd: 5_000_000,
    round: "Seed",
    announcedAt: new Date("2025-04-22"),
    investors: ["YC", "Nat Friedman"],
    source: "DEMO",
    sourceUrl: "https://www.ycombinator.com/companies",
    confidence: 0.92,
  },
  "verdant systems": {
    amountUsd: 14_000_000,
    round: "Series A",
    announcedAt: new Date("2025-04-10"),
    investors: ["Breakthrough Energy Ventures"],
    source: "DEMO",
    sourceUrl: null,
    confidence: 0.77,
  },
  "specter security": {
    amountUsd: 18_500_000,
    round: "Series A",
    announcedAt: new Date("2025-04-12"),
    investors: ["Accel", "Greylock"],
    source: "DEMO",
    sourceUrl: null,
    confidence: 0.84,
  },
  "luminary analytics": {
    amountUsd: 9_800_000,
    round: "Series A",
    announcedAt: new Date("2025-04-25"),
    investors: ["Bessemer", "Lightspeed"],
    source: "DEMO",
    sourceUrl: null,
    confidence: 0.8,
  },
};

const ROUND_PATTERNS = [
  "pre-seed",
  "seed",
  "series\\s+a",
  "series\\s+b",
  "series\\s+c",
  "series\\s+d",
  "series\\s+e",
  "growth",
  "strategic",
  "angel",
];

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCaseRound(round: string) {
  return round
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Pre-Seed", "Pre-seed")
    .replace(/Series ([a-z])/i, (_, letter: string) => `Series ${letter.toUpperCase()}`);
}

function hashToRange(seed: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 37 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

function genericDemoFunding(companyName: string): FundingEnrichment {
  const amountMillions = hashToRange(companyName, 2, 28);
  const rounds = ["Seed", "Series A", "Series B"];
  const round = rounds[hashToRange(companyName, 0, rounds.length - 1)];

  return {
    amountUsd: amountMillions * 1_000_000,
    round,
    announcedAt: null,
    investors: ["Demo Capital", "Signal Ventures"],
    source: "DEMO",
    sourceUrl: null,
    confidence: 0.38,
  };
}

function buildFundingQuery(companyName: string, website?: string) {
  let query = `"${companyName}" startup funding announcement raised investors`;

  if (website) {
    try {
      const domain = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(
        /^www\./,
        ""
      );
      query += ` ${domain}`;
    } catch {
      query += ` ${website}`;
    }
  }

  return query;
}

function parseAmountUsd(text: string) {
  const amountMatch = text.match(
    /(?:\$|US\$|USD\s*)\s?(\d+(?:\.\d+)?)\s?(billion|bn|b|million|m)\b/i
  );
  if (!amountMatch) return null;

  const value = Number(amountMatch[1]);
  const unit = amountMatch[2].toLowerCase();
  if (!Number.isFinite(value)) return null;

  return unit.startsWith("b") || unit === "bn" ? value * 1_000_000_000 : value * 1_000_000;
}

function parseRound(text: string) {
  const match = text.match(new RegExp(`\\b(${ROUND_PATTERNS.join("|")})\\b`, "i"));
  return match?.[1] ? titleCaseRound(match[1]) : "Unknown";
}

function parseInvestors(text: string) {
  const match = text.match(
    /(?:led by|from|backed by|investors include|participation from)\s+([^.;\n]+)/i
  );
  if (!match?.[1]) return [];

  return match[1]
    .replace(/\s+and\s+/gi, ", ")
    .split(",")
    .map((investor) => investor.trim())
    .filter((investor) => investor.length > 1 && investor.length < 60)
    .slice(0, 5);
}

function parseAnnouncementDate(payload: TavilySearchResponse) {
  const published = payload.results.find((result) => result.published_date)?.published_date;
  if (!published) return null;
  const date = new Date(published);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractFundingFromTavily(payload: TavilySearchResponse): FundingEnrichment | null {
  const combined = [
    payload.answer ?? "",
    ...payload.results.map((result) => `${result.title}. ${result.content}`),
  ].join("\n");

  const amountUsd = parseAmountUsd(combined);
  if (!amountUsd) return null;

  const bestResult = payload.results[0];
  const round = parseRound(combined);
  const investors = parseInvestors(combined);
  const confidence = Math.min(
    0.92,
    0.45 +
      (bestResult?.score ?? 0.2) * 0.25 +
      (round !== "Unknown" ? 0.12 : 0) +
      (investors.length ? 0.1 : 0) +
      (bestResult?.url ? 0.08 : 0)
  );

  return {
    amountUsd,
    round,
    announcedAt: parseAnnouncementDate(payload),
    investors,
    source: "TAVILY",
    sourceUrl: bestResult?.url ?? null,
    confidence,
  };
}

async function enrichFromTavily(companyName: string, website?: string): Promise<FundingEnrichment | null> {
  const payload = await searchTavily(buildFundingQuery(companyName, website));
  if (!payload?.results?.length) return null;
  return extractFundingFromTavily(payload);
}

export async function enrichFundingForCompany(
  companyName: string,
  website?: string
): Promise<FundingEnrichment> {
  const tavily = await enrichFromTavily(companyName, website);
  if (tavily) return tavily;

  const demo = DEMO_FUNDING[normalizeName(companyName)];
  if (demo) return demo;

  return genericDemoFunding(companyName);
}
