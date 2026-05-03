---
title: Launch Signal Assessment - Project Skill Context
---

# Launch Signal Assessment

## Core Idea

Build an AI-assisted launch intelligence dashboard that collects startup launch signals from X, LinkedIn, Google/news, Tavily-powered funding announcement search, YC, incubator pages, and fundraising databases. The dashboard should compare each company's funding raised against launch traction, enrich founder/company contact methods, and draft outbound DMs for launches that performed below expectation.

## Current Product Shape

The app is now a Next.js dashboard MVP with Prisma/PostgreSQL-backed API routes and demo/API fallback services. It supports the main user workflow:

- Track launch posts, funding raised, X likes, LinkedIn likes, launch score, stage, investors, and launch date.
- Classify launches into signal states: `underperforming`, `strong_launch`, `needs_enrichment`, and `dm_ready`.
- Show KPI cards, funding-vs-engagement charts, platform comparison charts, launch tables, underperformer cards, contact directory, DM draft cards, and settings.
- Open a detail drawer from any table/card to inspect company context, contact methods, AI analysis, launch preview, and X/LinkedIn DM drafts.
- Import/analyze pasted X or LinkedIn launch URLs through `/api/import-launches`.
- Persist companies, launches, funding rounds, social metrics, contacts, DM drafts, and analysis runs.

## Stack And Conventions

- Framework: Next.js App Router with React client components.
- Language: TypeScript with strict mode enabled.
- Styling: Tailwind CSS v4 tokens in `app/globals.css`.
- UI system: shadcn/Radix-style components in `components/ui`.
- Icons: `lucide-react`.
- Charts: `recharts`.
- Theme: `next-themes` with light/system/dark toggle.
- Source aliases: `@/*` points to the project root.
- Data source today: Prisma models backed by PostgreSQL/Supabase through `DATABASE_URL`.
- Demo mode: controlled by `DEMO_MODE=true`, with deterministic fallbacks when external API keys are missing.

## Key Files

- `prisma/schema.prisma`: Company, Launch, FundingRound, SocialMetric, ContactMethod, DmDraft, and AnalysisRun models.
- `app/page.tsx`: main dashboard shell, API loading state, selected launch drawer state, import modal state.
- `app/api/import-launches/route.ts`: URL import pipeline, enrichment, scoring, and draft generation.
- `app/api/launches/route.ts`: dashboard data endpoint.
- `app/api/companies/[id]/route.ts`: company detail endpoint.
- `app/api/dm-drafts/generate/route.ts`: on-demand draft generation endpoint.
- `services/x.ts`: X post parsing and X API/demo metrics.
- `services/linkedin.ts`: LinkedIn URL parsing, manual/demo metrics support, no unauthorized scraping.
- `services/tavily.ts`: Tavily Search API wrapper.
- `services/funding.ts`: Tavily/demo funding announcement enrichment.
- `services/contacts.ts`: safe demo/domain contact enrichment.
- `services/ai.ts`: OpenAI structured JSON calls with deterministic fallback logic.
- `utils/scoring.ts`: launch score and signal classification.
- `lib/data.ts`: dashboard DTO types, KPI derivations, chart data helpers, integration status.
- `lib/api-serializers.ts`: Prisma-to-dashboard DTO mapping.
- `components/dashboard/launches-table.tsx`: sortable overview table.
- `components/dashboard/detail-drawer.tsx`: full launch analysis, contact methods, DM drafts, copy actions.
- `components/dashboard/tabs/launch-tracker.tsx`: searchable/filterable launch database.
- `components/dashboard/tabs/underperformers.tsx`: high-funding low-traction opportunity view.
- `components/dashboard/tabs/contacts.tsx`: contact enrichment directory and confidence scoring.
- `components/dashboard/tabs/dm-drafts.tsx`: platform-specific outreach drafts and contacted state.
- `components/dashboard/tabs/settings.tsx`: integration, webhook, notification, API key, and team settings UI.

## Skills Needed To Complete The Product

- Full-stack Next.js engineering: maintain server/API routes, Prisma data shape, and client fetch flows.
- Data ingestion: extend X API, LinkedIn/manual import, Tavily funding/news search, YC/incubator directories, and CSV/manual upload.
- Data normalization: map launch posts, companies, funding rounds, investors, social metrics, contacts, and AI scores into one consistent schema.
- AI enrichment: score launches, explain underperformance, identify outreach angles, generate platform-specific DMs, and regenerate drafts with user feedback.
- Contact enrichment: integrate email, phone, LinkedIn, and X profile discovery with confidence scoring and source attribution.
- Dashboard UX: preserve dense operational layout, sortable/filterable data views, drawer-based inspection, copy/open actions, and compact KPI/chart cards.
- Compliance and reliability: respect platform API limits, avoid storing secrets in client code, validate scraped/enriched data, and track provenance for each enrichment.
- Testing and quality: add unit tests for scoring/normalization, integration tests for ingestion, and UI tests for the dashboard flows.

## Production Roadmap

1. Add Supabase migrations and seed scripts for review data.
2. Move long-running enrichment to background jobs.
3. Add connectors for Google/news sources, YC/incubator pages, and richer contact enrichment providers.
4. Add manual LinkedIn metric entry per imported URL.
5. Persist filters, contacted status, and integration settings.
6. Add authentication, workspace/team permissions, API key handling, and webhook delivery.
7. Add tests for scoring, parsing, import routes, and dashboard states.

## Current Gaps

- Supabase `DATABASE_URL` is required before running the app against a real database.
- Auth, background jobs, persisted settings, team invites, reconnect integrations, save webhook, and danger-zone actions are still UI-only.
- LinkedIn metrics are represented as manual/demo mode.
- Production build works, but depends on fetching Google Fonts during build unless fonts are self-hosted or cached.
