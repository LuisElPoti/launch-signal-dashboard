import type { ContactEnrichment } from "./types";
import { searchTavily, type TavilySearchResponse } from "./tavily";

interface ContactCompanyInput {
  name: string;
  productName?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
}

const NON_COMPANY_DOMAINS = new Set([
  "angel.co",
  "crunchbase.com",
  "facebook.com",
  "github.com",
  "google.com",
  "instagram.com",
  "linkedin.com",
  "medium.com",
  "pitchbook.com",
  "producthunt.com",
  "substack.com",
  "techcrunch.com",
  "twitter.com",
  "wellfound.com",
  "x.com",
  "ycombinator.com",
  "youtube.com",
]);

const DEMO_CONTACTS: Record<string, ContactEnrichment[]> = {
  "cerebral ai": [
    { type: "EMAIL", value: "founders@cerebral.ai", label: "Founders", confidence: 0.91, source: "DEMO" },
    { type: "PHONE", value: "+1 415 555 0182", label: "Demo public line", confidence: 0.45, source: "DEMO" },
    { type: "LINKEDIN", value: "https://linkedin.com/in/jake-morris-cerebral", label: "Founder LinkedIn", confidence: 0.86, source: "DEMO" },
    { type: "X", value: "@cerebralai", label: "Company X", confidence: 0.88, source: "DEMO" },
    { type: "WEBSITE", value: "https://cerebral.ai", label: "Website", confidence: 0.8, source: "DEMO" },
  ],
  fluxops: [
    { type: "EMAIL", value: "ceo@fluxops.io", label: "CEO", confidence: 0.79, source: "DEMO" },
    { type: "LINKEDIN", value: "https://linkedin.com/in/priya-nair-fluxops", label: "Founder LinkedIn", confidence: 0.76, source: "DEMO" },
    { type: "X", value: "@fluxops", label: "Company X", confidence: 0.86, source: "DEMO" },
    { type: "WEBSITE", value: "https://fluxops.io", label: "Website", confidence: 0.83, source: "DEMO" },
  ],
  "nomad intelligence": [
    { type: "LINKEDIN", value: "https://linkedin.com/company/nomad-intelligence", label: "Company LinkedIn", confidence: 0.54, source: "DEMO" },
    { type: "WEBSITE", value: "https://nomadintelligence.com", label: "Website", confidence: 0.48, source: "DEMO" },
  ],
  "axon labs": [
    { type: "EMAIL", value: "hello@axonlabs.dev", label: "General", confidence: 0.95, source: "DEMO" },
    { type: "PHONE", value: "+1 650 555 0299", label: "Demo public line", confidence: 0.5, source: "DEMO" },
    { type: "LINKEDIN", value: "https://linkedin.com/in/alex-chen-axon", label: "Founder LinkedIn", confidence: 0.9, source: "DEMO" },
    { type: "X", value: "@axonlabs", label: "Company X", confidence: 0.94, source: "DEMO" },
    { type: "WEBSITE", value: "https://axonlabs.dev", label: "Website", confidence: 0.91, source: "DEMO" },
  ],
  "verdant systems": [
    { type: "LINKEDIN", value: "https://linkedin.com/company/verdant-systems", label: "Company LinkedIn", confidence: 0.5, source: "DEMO" },
    { type: "WEBSITE", value: "https://verdantsystems.com", label: "Website", confidence: 0.48, source: "DEMO" },
  ],
  "specter security": [
    { type: "EMAIL", value: "founders@spectersec.io", label: "Founders", confidence: 0.84, source: "DEMO" },
    { type: "PHONE", value: "+1 512 555 0133", label: "Demo public line", confidence: 0.44, source: "DEMO" },
    { type: "LINKEDIN", value: "https://linkedin.com/in/maya-okonkwo-specter", label: "Founder LinkedIn", confidence: 0.82, source: "DEMO" },
    { type: "X", value: "@spectersec", label: "Company X", confidence: 0.84, source: "DEMO" },
    { type: "WEBSITE", value: "https://spectersec.io", label: "Website", confidence: 0.79, source: "DEMO" },
  ],
  "luminary analytics": [
    { type: "EMAIL", value: "ceo@luminaryanalytics.com", label: "CEO", confidence: 0.88, source: "DEMO" },
    { type: "PHONE", value: "+1 917 555 0076", label: "Demo public line", confidence: 0.46, source: "DEMO" },
    { type: "LINKEDIN", value: "https://linkedin.com/in/diana-wu-luminary", label: "Founder LinkedIn", confidence: 0.84, source: "DEMO" },
    { type: "X", value: "@luminaryanalytics", label: "Company X", confidence: 0.84, source: "DEMO" },
    { type: "WEBSITE", value: "https://luminaryanalytics.com", label: "Website", confidence: 0.8, source: "DEMO" },
  ],
};

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

function inferDomain(website?: string | null) {
  if (!website) return null;
  try {
    const normalized = website.startsWith("http") ? website : `https://${website}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeWebsite(url: string) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `https://${parsed.hostname.replace(/^www\./, "")}`;
  } catch {
    return null;
  }
}

function domainFromUrl(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isKnownNonCompanyDomain(domain: string) {
  return [...NON_COMPANY_DOMAINS].some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

function dedupeContacts(contacts: ContactEnrichment[]) {
  const seen = new Set<string>();
  return contacts.filter((contact) => {
    const key = `${contact.type}:${contact.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildContactQuery(company: ContactCompanyInput) {
  const product =
    company.productName && normalizeName(company.productName) !== normalizeName(company.name)
      ? ` "${company.productName}"`
      : "";

  return `"${company.name}"${product} official website contact email founder LinkedIn`;
}

function getPayloadText(payload: TavilySearchResponse) {
  return [
    payload.answer ?? "",
    ...payload.results.map((result) => `${result.title}\n${result.url}\n${result.content}`),
  ].join("\n");
}

function extractEmails(text: string): ContactEnrichment[] {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return matches
    .map((value) => value.toLowerCase())
    .filter((value) => !value.includes("example.") && !value.startsWith("noreply@"))
    .slice(0, 4)
    .map((value) => ({
      type: "EMAIL" as const,
      value,
      label: "Public email from Tavily search",
      confidence: 0.72,
      source: "TAVILY",
    }));
}

function extractPhones(text: string): ContactEnrichment[] {
  const matches =
    text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g) ?? [];

  return matches
    .map((value) => value.trim())
    .filter((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    })
    .slice(0, 2)
    .map((value) => ({
      type: "PHONE" as const,
      value,
      label: "Public phone from Tavily search",
      confidence: 0.5,
      source: "TAVILY",
    }));
}

function extractLinkedInUrls(payload: TavilySearchResponse, text: string): ContactEnrichment[] {
  const urls = [
    ...payload.results.map((result) => result.url),
    ...(text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>),]+/gi) ?? []),
  ];

  return urls
    .filter((url) => /linkedin\.com\/(?:company|in)\//i.test(url))
    .slice(0, 3)
    .map((url) => ({
      type: "LINKEDIN" as const,
      value: url.replace(/\/$/, ""),
      label: "LinkedIn from Tavily search",
      confidence: 0.74,
      source: "TAVILY",
    }));
}

function extractWebsite(payload: TavilySearchResponse): ContactEnrichment[] {
  const result = payload.results.find((item) => {
    const domain = domainFromUrl(item.url);
    return domain && !isKnownNonCompanyDomain(domain);
  });
  const website = result ? normalizeWebsite(result.url) : null;
  if (!website) return [];

  return [
    {
      type: "WEBSITE",
      value: website,
      label: "Website from Tavily search",
      confidence: Math.min(0.82, 0.62 + (result?.score ?? 0) * 0.2),
      source: "TAVILY",
    },
  ];
}

async function enrichContactsFromTavily(company: ContactCompanyInput): Promise<ContactEnrichment[]> {
  const payload = await searchTavily(buildContactQuery(company), { topic: "general" });
  if (!payload?.results?.length) return [];

  const text = getPayloadText(payload);
  return dedupeContacts([
    ...extractEmails(text),
    ...extractPhones(text),
    ...extractLinkedInUrls(payload, text),
    ...extractWebsite(payload),
  ]);
}

export async function enrichContactsForCompany(
  company: ContactCompanyInput
): Promise<ContactEnrichment[]> {
  const seeded = isDemoMode() ? DEMO_CONTACTS[normalizeName(company.name)] ?? [] : [];
  const tavilyContacts = await enrichContactsFromTavily(company);
  const inferred: ContactEnrichment[] = [];
  const discoveredWebsite =
    company.website ?? tavilyContacts.find((contact) => contact.type === "WEBSITE")?.value ?? null;
  const domain = inferDomain(discoveredWebsite);

  if (domain) {
    inferred.push({
      type: "EMAIL",
      value: `hello@${domain}`,
      label: "Generic company inbox",
      confidence: 0.42,
      source: "DOMAIN_INFERENCE",
    });
    inferred.push({
      type: "WEBSITE",
      value: `https://${domain}`,
      label: "Website",
      confidence: 0.7,
      source: "DOMAIN_INFERENCE",
    });
  }

  if (company.linkedinUrl) {
    inferred.push({
      type: "LINKEDIN",
      value: company.linkedinUrl,
      label: "LinkedIn",
      confidence: 0.62,
      source: "INPUT_URL",
    });
  }

  if (company.xUrl) {
    inferred.push({
      type: "X",
      value: company.xUrl,
      label: "X launch post",
      confidence: 0.62,
      source: "INPUT_URL",
    });
  }

  return dedupeContacts([...seeded, ...tavilyContacts, ...inferred]);
}
