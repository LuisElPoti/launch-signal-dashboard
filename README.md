# Launch Signal Dashboard

Launch Signal Dashboard is a technical assessment MVP for finding startup launches where funding momentum is stronger than launch traction. It imports launch URLs, enriches company/funding/contact data, scores performance, and drafts outreach messages for underperforming launches.

## MVP Scope

- Import X and LinkedIn launch URLs.
- Detect platform and extract post IDs where possible.
- Fetch X metrics with `X_BEARER_TOKEN`, or use realistic demo metrics.
- Support LinkedIn manual/hybrid mode because LinkedIn API permissions are restricted.
- Match or create companies, funding rounds, social metrics, contact methods, DM drafts, and analysis runs.
- Use Tavily to search funding announcements when `TAVILY_API_KEY` is configured.
- Use OpenAI for structured extraction, performance analysis, and DM drafts when `OPENAI_API_KEY` is configured.
- Fall back to deterministic demo logic when API keys are missing or `DEMO_MODE=true`.

## Architecture

- `prisma/schema.prisma`: PostgreSQL data model for companies, launches, funding, metrics, contacts, drafts, and analysis runs.
- `app/api/import-launches/route.ts`: import pipeline for launch URLs.
- `app/api/launches/route.ts`: dashboard data endpoint.
- `app/api/companies/[id]/route.ts`: company detail endpoint.
- `app/api/dm-drafts/generate/route.ts`: on-demand DM generation.
- `services/x.ts`: X post parsing and metrics/details fetch with demo fallback.
- `services/linkedin.ts`: LinkedIn URL parsing, manual metrics normalization, and demo fallback.
- `services/tavily.ts`: Tavily Search API wrapper.
- `services/funding.ts`: Tavily-powered funding announcement enrichment, otherwise seeded demo funding.
- `services/contacts.ts`: safe contact enrichment with seeded/demo data and domain-based generic emails.
- `services/ai.ts`: OpenAI structured JSON calls with deterministic fallback.
- `utils/scoring.ts`: launch scoring and signal classification.
- `lib/api-serializers.ts`: Prisma-to-dashboard DTO mapping.

## LinkedIn Hybrid Mode

LinkedIn APIs are limited and often require approved partner permissions. This MVP does not scrape LinkedIn or bypass permissions. LinkedIn launches can be imported by URL, then metrics are either:

- supplied manually through future UI/API expansion, or
- generated through demo fallback for assessment flows.

The source is stored as `MANUAL` or `DEMO` so reviewers can see where the data came from.

## Data Model

The Prisma schema includes:

- `Company`
- `Launch`
- `FundingRound`
- `SocialMetric`
- `ContactMethod`
- `DmDraft`
- `AnalysisRun`

Additional launch fields store computed MVP results: `launchScore`, `signal`, `performanceReason`, and `outreachAngle`.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
DATABASE_URL=
OPENAI_API_KEY=
X_BEARER_TOKEN=
TAVILY_API_KEY=
TAVILY_SEARCH_DEPTH=basic
DEMO_MODE=true
```

`DATABASE_URL` should point to your Supabase PostgreSQL database. Keep `DEMO_MODE=true` for review-friendly local runs without external API calls. Set it to `false` to use configured external APIs.

## Run Locally

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

Open `http://localhost:3000`, click **Import Launches**, and paste one URL per line.

Example URLs:

```text
https://x.com/cerebralai/status/1234567890
https://linkedin.com/posts/nomad-intelligence_launch
```

## API Usage

### Import Launches

`POST /api/import-launches`

```json
{
  "urls": ["https://x.com/cerebralai/status/1234567890"],
  "options": {
    "fetchXMetrics": true,
    "enrichFunding": true,
    "enrichContacts": true,
    "generateDmDrafts": true
  }
}
```

### List Launches

`GET /api/launches`

Returns launches with company, latest metrics, funding, contacts, drafts, and dashboard KPIs.

### Company Detail

`GET /api/companies/:id`

Returns company metadata, funding, contacts, and related launches.

### Generate DM Draft

`POST /api/dm-drafts/generate`

```json
{
  "launchId": "launch_id",
  "platform": "X",
  "tone": "warm"
}
```

## Demo Mode

Demo mode is intentional for the assessment:

- missing X/OpenAI/Tavily keys do not block the app,
- imported URLs still create records,
- metrics/funding/contact enrichment are deterministic enough for repeatable review,
- generated DMs are safe and do not claim private data.

## Future Improvements

- Add authenticated workspaces and team roles.
- Add background jobs for enrichment retries and metric refreshes.
- Add manual LinkedIn metrics UI per imported URL.
- Add source attribution UI for every enriched data point.
- Add CRM export and webhook delivery.
- Add tests for scoring, URL parsing, enrichment fallbacks, and import route behavior.
- Add rate-limit handling and API usage telemetry.
