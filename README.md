# Global Optimization System

> "Know your true material footprint — beyond carbon"

**Live Site:** [https://global-optimization-system.vercel.app](https://global-optimization-system.vercel.app)

**Google Maps for physical reality** — see the material composition and flow of everything.

Enter a LinkedIn URL. We scrape the web, infer your lifestyle, and compute your full elemental footprint: how many tonnes of biomass, metals, minerals, and fossil fuels flow through your life every year, broken down to the periodic table.

## What This Does

Most carbon calculators give you one number. We give you:

- **Elemental-level material tracking** — not just CO2, but every element from Hydrogen to Uranium
- **Multi-source person analysis** — Firecrawl scrapes LinkedIn, blogs, news; Claude infers income, housing, transport, diet
- **Progressive confidence** — start with a URL, add bank statements, receipts, home descriptions, device lists to sharpen the model
- **Cross-scale comparison** — zoom from person to city to country to planet
- **Actionable swaps** — lifecycle-analyzed alternatives for your biggest impacts

## Quick Start

```bash
npm install
```

Create `.env.local`:
```
FIRECRAWL_API_KEY=your-firecrawl-api-key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## The Flow

```
LinkedIn URL
    |
    v
/analyze ---- Firecrawl scrapes web ---- Claude extracts profile + infers lifestyle
    |
    |  SSE streams source pills as each completes
    |
    v
Person Dossier (identity, experience, web presence, inferred signals)
    |
    |  "BOOST CONFIDENCE" section
    |  Paste bank statements, grocery receipts, home descriptions, device lists
    |  Each one refines the model live
    |
    v
Material Footprint (tonnes/year, elemental breakdown, carbon metrics)
    |
    v
/dashboard ---- Full periodic table, flow diagrams, comparisons, swap recommendations
```

## Routes

| Route | What it does |
|-------|-------------|
| `/` | Landing page with hero CTA |
| `/analyze` | Deep scan a person from LinkedIn URL. SSE streaming, multi-source enrichment, data dumps |
| `/quiz` | Manual onboarding wizard with auto-profile detection (IP geolocation + US Census) |
| `/dashboard` | Full analysis: periodic table, material flows, carbon metrics, comparisons, recommendations |

## API Endpoints

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/api/person-analyze` | POST | SSE stream. Firecrawl search + scrape, Claude analysis, progressive enrichment |
| `/api/linkedin-analyze` | POST | Single-shot LinkedIn profile analysis |
| `/api/auto-profile` | GET | IP geolocation + Census data for auto-detection |
| `/api/parse-data` | POST | Claude parses bank statements, receipts, home descriptions, device lists |
| `/api/product-scan` | GET | Claude estimates elemental composition of any product |
| `/api/swap-analyze` | POST | Claude suggests lifecycle-analyzed alternatives |

## Architecture

```
src/
  app/
    analyze/page.tsx       # Person analysis page (SSE, DataHub, dossier)
    dashboard/page.tsx     # Full dashboard with tabs
    quiz/page.tsx          # Onboarding wizard
    page.tsx               # Landing
    api/
      person-analyze/      # Multi-source SSE scraping pipeline
      linkedin-analyze/    # Single LinkedIn analysis
      auto-profile/        # IP + Census auto-detection
      parse-data/          # Unstructured data parsing
      product-scan/        # Product composition estimation
      swap-analyze/        # Lifecycle swap recommendations
  components/
    PeriodicTable.tsx      # Interactive periodic table with glow effects
    DataHub.tsx            # Bank/receipt/home/device data input cards
    LinkedInImport.tsx     # LinkedIn URL import component
    OnboardingWizard.tsx   # Multi-step quiz form
    FlowDiagram.tsx        # Sankey-style material flows
    ImpactHero.tsx         # Main carbon footprint visualization
    ComparisonView.tsx     # Side-by-side vs global/national averages
    ScaleSlider.tsx        # Person -> city -> country -> planet zoom
    + 10 more
  lib/
    types.ts               # All TypeScript interfaces (PersonDossier, UserInputs, etc.)
    estimation-engine.ts   # Income elasticity model: MF ~ national_avg x income_ratio^0.75
    carbon.ts              # CO2e calculations and molecular composition
    elements.ts            # Periodic table data + human body composition
    recommendations.ts     # Swap recommendation engine
  data/
    country-footprints-real.json  # Per-capita material footprint by country
    sample-dumps.ts               # Demo bank/receipt/home/device data
    unep-material-flows.csv       # UNEP IRP raw material flows
```

## Key Research Baked In

| Fact | Value | Source |
|------|-------|--------|
| Income elasticity of material footprint | ~0.75 | UNEP IRP |
| US per-capita material footprint | 25-28 t/yr direct, ~95 t/yr with supply chain | USGS, UNEP |
| Global average material footprint | 13.2 t/capita/yr | UNEP IRP 2024 |
| Human biological throughput | ~7 t/yr (5.5t air + 0.9t water + 0.55t food) | Physiology literature |
| Planetary boundary per capita | ~2.5 t CO2e/yr | IPCC AR6 |

## Tech Stack

- **Next.js 16** with Turbopack
- **React 19**
- **Framer Motion** for animations
- **Tailwind CSS 4**
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) for all AI analysis
- **Firecrawl** (`@mendable/firecrawl-js`) for web scraping
- Dark neon-glow aesthetic throughout

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIRECRAWL_API_KEY` | Yes (for /analyze) | Firecrawl API key for web scraping |

Claude credentials are read automatically from `~/.claude/.credentials.json` via the Agent SDK.

## For AI Agents

See `AGENTS.md` for agent-specific instructions. Key points:

- This is **Next.js 16** — APIs may differ from your training data. Check `node_modules/next/dist/docs/` before making changes.
- The Firecrawl SDK uses `.v1.scrapeUrl()` and `.v1.search()` (not top-level methods).
- LinkedIn cannot be scraped directly (403). Use `fc.v1.search()` to find content about a person instead.
- All Claude calls use `query()` from `@anthropic-ai/claude-agent-sdk`, not the standard Anthropic SDK.
- The estimation engine uses income elasticity (`MF ~ national_avg x income_ratio^0.75`) with lifestyle multipliers.

## License

MIT
