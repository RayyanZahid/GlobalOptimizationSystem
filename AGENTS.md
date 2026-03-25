# Agent Instructions

## Critical: Next.js 16

This is **NOT** the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Firecrawl SDK (v1 API)

The `@mendable/firecrawl-js` package uses a **nested v1 API**:

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Correct:
await fc.v1.scrapeUrl(url, { formats: ['markdown'] });
await fc.v1.search(query, { limit: 5, scrapeOptions: { formats: ['markdown'] } });

// WRONG (these don't exist):
await fc.scrapeUrl(url);  // TypeError: not a function
await fc.search(query);   // TypeError: not a function
```

**LinkedIn is blocked** by Firecrawl (403). Do NOT try to scrape `linkedin.com` directly. Instead:
- Extract the person's name from the URL slug
- Use `fc.v1.search("person name")` to find content from other sources
- Scrape those sources for profile data

## Claude Agent SDK

All AI calls use `query()` from `@anthropic-ai/claude-agent-sdk`:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const q = query({
  prompt: systemPrompt + '\n\n' + userMessage,
  options: {
    model: 'claude-sonnet-4-6',
    allowedTools: [],
    maxTurns: 1,
  },
});

let resultText = '';
for await (const message of q) {
  if (message.type === 'result' && message.subtype === 'success') {
    resultText = message.result;
  }
}
```

This is **NOT** the standard `@anthropic-ai/sdk`. Do not use `client.messages.create()`.

## Estimation Engine

The footprint model lives in `src/lib/estimation-engine.ts`:

```
Material Footprint = national_avg * income_ratio^0.75 * lifestyle_multipliers
```

- Country data: `src/data/country-footprints-real.json`
- Income elasticity: 0.75 (not linear — doubling income increases footprint by ~68%)
- Lifestyle multipliers: diet (0.7-1.3x), housing (0.7-1.4x), transport (0.6-1.5x)
- Body composition: `src/lib/elements.ts` (BODY_COMPOSITION constant)

## API Route Pattern

All API routes follow the same pattern (`src/app/api/*/route.ts`):

1. Parse request body
2. Check for hardcoded fallbacks (demo reliability)
3. Call Claude via `query()`
4. Strip markdown fences from response
5. Parse JSON (with fallback extraction via regex)
6. Return `NextResponse.json()`

For SSE routes (`person-analyze`), use `ReadableStream` with `text/event-stream`.

## Key Types

All in `src/lib/types.ts`:

- `PersonDossier` — full person analysis with web presence, signals, lifestyle, mapped inputs
- `UserInputs` — what feeds into the estimation engine
- `ElementalProfile` — output of `computeProfile()`, periodic table data
- `ConsumptionSignal` — individual data point from a source with confidence
- `SourceResult` — tracking status of each scrape source

## File Layout

```
src/app/analyze/page.tsx    # Main person analysis (SSE client, DataHub integration)
src/app/api/person-analyze/ # SSE pipeline (Firecrawl + Claude, multi-phase)
src/components/DataHub.tsx  # Bank/receipt/home/device input cards
src/data/sample-dumps.ts   # Demo data for all 4 card types
src/lib/estimation-engine.ts # Core footprint calculation
```

## Common Pitfalls

1. **Claude returns prose instead of JSON** — always wrap `JSON.parse()` with a fallback that extracts `{...}` via regex
2. **Firecrawl search returns junk URLs** — filter out `gstatic.com`, `googleapis.com`, `facebook.com`, etc.
3. **`profile.carbon` may be undefined** — use optional chaining: `carbon?.total_co2e_tonnes ?? 0`
4. **DataHub uses custom events** — `window.dispatchEvent(new CustomEvent('load-sample-data', { detail: { type, data } }))` to auto-fill cards from sample data buttons
