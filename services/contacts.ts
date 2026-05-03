import type { ContactEnrichment } from "./types";

interface ContactCompanyInput {
  name: string;
  website?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
}

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

function inferDomain(website?: string | null) {
  if (!website) return null;
  try {
    const normalized = website.startsWith("http") ? website : `https://${website}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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

export async function enrichContactsForCompany(
  company: ContactCompanyInput
): Promise<ContactEnrichment[]> {
  const seeded = DEMO_CONTACTS[normalizeName(company.name)] ?? [];
  const inferred: ContactEnrichment[] = [];
  const domain = inferDomain(company.website);

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
      label: "X",
      confidence: 0.62,
      source: "INPUT_URL",
    });
  }

  return dedupeContacts([...seeded, ...inferred]);
}
