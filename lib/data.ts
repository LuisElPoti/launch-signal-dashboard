export type SignalTag =
  | "underperforming"
  | "strong_launch"
  | "needs_enrichment"
  | "dm_ready"
  | "normal";

export interface ContactInfo {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  xProfile: string | null;
  confidenceScore: number;
}

export interface LaunchRow {
  id: string;
  companyId: string;
  company: string;
  product: string;
  launchUrl: string;
  fundingRaised: number;
  fundingAmountUsd: number;
  xLikes: number;
  linkedinLikes: number;
  comments: number;
  reposts: number;
  views: number;
  engagement: number;
  launchScore: number;
  signal: SignalTag;
  contact: ContactInfo;
  dmDraftX: string;
  dmDraftLinkedin: string;
  aiAnalysis: {
    whyUnderperforming: string;
    suggestedAngle: string;
  };
  launchPreview: string;
  stage: string;
  investors: string[];
  launchDate: string;
  createdAt: string;
}

export interface DashboardKpis {
  launchesAnalyzed: number;
  totalFundingTracked: number;
  avgXLikes: number;
  avgLinkedinLikes: number;
  avgViews: number;
  underperforming: number;
  contactsEnriched: number;
}

export interface ScatterPoint {
  company: string;
  funding: number;
  engagement: number;
  views: number;
  launchScore: number;
  signal: SignalTag;
}

export interface BarPoint {
  name: string;
  xLikes: number;
  linkedinLikes: number;
  views: number;
}

export function computeKpis(launches: LaunchRow[]): DashboardKpis {
  if (!launches.length) {
    return {
      launchesAnalyzed: 0,
      totalFundingTracked: 0,
      avgXLikes: 0,
      avgLinkedinLikes: 0,
      avgViews: 0,
      underperforming: 0,
      contactsEnriched: 0,
    };
  }

  return {
    launchesAnalyzed: launches.length,
    totalFundingTracked: launches.reduce((sum, launch) => sum + launch.fundingRaised, 0),
    avgXLikes: Math.round(launches.reduce((sum, launch) => sum + launch.xLikes, 0) / launches.length),
    avgLinkedinLikes: Math.round(
      launches.reduce((sum, launch) => sum + launch.linkedinLikes, 0) / launches.length
    ),
    avgViews: Math.round(launches.reduce((sum, launch) => sum + launch.views, 0) / launches.length),
    underperforming: launches.filter((launch) => launch.signal === "underperforming").length,
    contactsEnriched: launches.filter((launch) => launch.contact.confidenceScore >= 70).length,
  };
}

export function toScatterData(launches: LaunchRow[]): ScatterPoint[] {
  return launches.map((launch) => ({
    company: launch.company,
    funding: launch.fundingRaised,
    engagement: launch.engagement,
    views: launch.views,
    launchScore: launch.launchScore,
    signal: launch.signal,
  }));
}

export function toBarData(launches: LaunchRow[]): BarPoint[] {
  return launches.map((launch) => ({
    name: launch.company.split(" ")[0] ?? launch.company,
    xLikes: launch.xLikes,
    linkedinLikes: launch.linkedinLikes,
    views: launch.views,
  }));
}

export interface IntegrationStatus {
  name: string;
  status: "connected" | "manual" | "demo" | "disconnected";
  detail: string;
}

export function mapBackendSignal(signal?: string | null): SignalTag {
  if (signal === "UNDERPERFORMING") return "underperforming";
  if (signal === "STRONG_LAUNCH") return "strong_launch";
  if (signal === "READY_FOR_OUTREACH") return "dm_ready";
  if (signal === "NORMAL") return "normal";
  return "needs_enrichment";
}
