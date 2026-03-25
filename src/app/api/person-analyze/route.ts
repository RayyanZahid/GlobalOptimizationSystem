import { NextRequest } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import FirecrawlApp from '@mendable/firecrawl-js';
import type { SourceType, SourceResult, PersonDossier, ConsumptionSignal } from '@/lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sse(encoder: TextEncoder, event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function askClaude(prompt: string): Promise<string> {
  const q = query({
    prompt,
    options: { model: 'claude-sonnet-4-6', allowedTools: [], maxTurns: 1 },
  });
  let result = '';
  for await (const msg of q) {
    if (msg.type === 'result' && msg.subtype === 'success') result = msg.result;
  }
  return result;
}

function parseJSON(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

/** Extract a human name from a LinkedIn URL slug */
function nameFromSlug(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
  if (!match) return '';
  return match[1]
    .replace(/-\w{5,}$/, '') // remove trailing ID hashes
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Firecrawl wrappers (v1 API) ────────────────────────────────────────────

async function firecrawlSearch(
  fc: InstanceType<typeof FirecrawlApp>,
  searchQuery: string,
  limit = 5,
): Promise<Array<{ url: string; title?: string; markdown?: string }>> {
  try {
    const result = await fc.v1.search(searchQuery, {
      limit,
      scrapeOptions: { formats: ['markdown'] },
    });
    if (!result.success || !result.data) return [];
    return result.data
      .filter((d: { url?: string }) => d.url && !d.url.includes('gstatic.com'))
      .map((d: { url?: string; title?: string; markdown?: string }) => ({
        url: d.url || '',
        title: d.title,
        markdown: d.markdown,
      }));
  } catch {
    return [];
  }
}

async function firecrawlScrape(
  fc: InstanceType<typeof FirecrawlApp>,
  url: string,
): Promise<string | null> {
  try {
    const result = await fc.v1.scrapeUrl(url, { formats: ['markdown'] });
    if (result.success && result.markdown) return result.markdown;
    return null;
  } catch {
    return null;
  }
}

// ─── Claude Prompts ──────────────────────────────────────────────────────────

const PROFILE_PROMPT = `You are a career analyst and sustainability researcher. Given web content about a person, extract structured profile data and infer lifestyle/consumption signals for material footprint estimation.

INFERENCE RULES:
- Income: estimate from job title + company + location + industry. Use BLS/Glassdoor-level reasoning. Return annual USD.
- Country: from location info. Use full country name.
- Housing: executives/high-income in suburbs → "large_house"; urban professionals → "apartment"; mid-range → "house"
- Transport: consultants/frequent travelers → "frequent_flyer"; urban tech → "transit"; suburban → "car"
- Diet: default "omnivore" unless sustainability/health signals suggest otherwise
- Shopping: high-income + consumer → "frequent"; nonprofit/academia → "minimal"; default "average"
- Flights/year: consulting/sales/global → 8-12; regional → 2-4; local/remote → 0-2

Return ONLY valid JSON:
{
  "name": "string",
  "headline": "string",
  "location": "string or best guess",
  "summary": "1-2 sentences",
  "currentRole": { "title": "string", "company": "string", "industry": "string" },
  "experience": [{ "title": "string", "company": "string", "duration": "string" }],
  "education": [{ "school": "string", "degree": "string" }],
  "skills": ["string"],
  "lifestyle": {
    "estimatedIncome": number,
    "incomeConfidence": 0.0-1.0,
    "inferredCountry": "string",
    "inferredCity": "string or null",
    "inferredHousing": "apartment"|"house"|"large_house",
    "inferredTransport": "transit"|"car"|"suv"|"frequent_flyer",
    "inferredDiet": "vegan"|"vegetarian"|"omnivore"|"heavy_meat",
    "inferredShopping": "minimal"|"average"|"frequent",
    "inferredFlightsPerYear": number,
    "sustainabilityAwareness": "low"|"moderate"|"high",
    "travelIntensity": "sedentary"|"moderate"|"heavy"|"extreme",
    "reasoning": ["one sentence per inference explaining why"]
  },
  "webPresence": {
    "twitter": "url or null",
    "github": "url or null",
    "personalSite": "url or null"
  }
}`;

function enrichmentPrompt(existingDossier: string, newSourceType: string, newMarkdown: string) {
  return `You are analyzing additional data about a person to refine their material footprint profile.

EXISTING PROFILE (from prior sources):
${existingDossier}

NEW DATA SOURCE: ${newSourceType}
${newMarkdown.slice(0, 8000)}

Based on this new information, extract any NEW consumption/lifestyle signals not already captured. Look for:
- Property ownership, home size, location details → housing signal
- Vehicle mentions → transport signal
- Travel frequency, destinations → flights & transport
- Tech usage, devices, gadgets → tech footprint
- Dietary preferences, restaurant habits → diet signal
- Shopping habits, luxury goods, fashion → shopping signal
- Sustainability involvement, activism → awareness signal
- Company details, revenue, industry impact → income refinement
- Energy usage, solar panels, EV charging → energy source

Return ONLY valid JSON:
{
  "newSignals": [
    { "category": "string", "signal": "string", "value": "string", "confidence": 0.0-1.0 }
  ],
  "updatedFields": {
    "estimatedIncome": number_or_null,
    "inferredHousing": "apartment"|"house"|"large_house"|null,
    "inferredTransport": "transit"|"car"|"suv"|"frequent_flyer"|null,
    "inferredDiet": "vegan"|"vegetarian"|"omnivore"|"heavy_meat"|null,
    "inferredShopping": "minimal"|"average"|"frequent"|null,
    "inferredFlightsPerYear": number_or_null,
    "inferredEnergySource": "gas"|"electric"|"heat_pump"|"oil"|null,
    "techFootprint": "low"|"moderate"|"high"|null,
    "sustainabilityAwareness": "low"|"moderate"|"high"|null
  },
  "reasoning": ["one sentence per new finding"]
}

Only include fields in updatedFields if this new source gives STRONGER evidence than what we already have. Set to null to keep existing value.`;
}

// ─── Main SSE Handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { url } = body;
  if (!url || !url.includes('linkedin.com/in/')) {
    return new Response(JSON.stringify({ error: 'Must be a LinkedIn URL' }), { status: 400 });
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const fc = new FirecrawlApp({ apiKey });
  const personSlugName = nameFromSlug(url);

  const stream = new ReadableStream({
    async start(controller) {
      const dossier: PersonDossier = {
        name: personSlugName, headline: '', location: '', photoInitial: personSlugName.charAt(0), summary: '',
        currentRole: { title: '', company: '', industry: '' },
        experience: [], education: [], skills: [],
        webPresence: { linkedin: url, otherUrls: [] },
        signals: [],
        lifestyle: {
          estimatedIncome: 0, incomeConfidence: 0, inferredCountry: '',
          inferredHousing: 'house', inferredTransport: 'car', inferredDiet: 'omnivore',
          inferredShopping: 'average', inferredFlightsPerYear: 2,
          reasoning: [],
        },
        mappedInputs: {},
        sources: [],
        overallConfidence: 0,
        lastUpdated: new Date().toISOString(),
      };

      try {
        // ── Phase 1: LinkedIn search (Firecrawl can't scrape LinkedIn directly) ──
        controller.enqueue(sse(encoder, 'source_status', { type: 'linkedin', status: 'scraping', label: 'LinkedIn Search' }));

        // Search for the person's LinkedIn info via Firecrawl search
        const liSearchResults = await firecrawlSearch(fc, `"${personSlugName}" site:linkedin.com`, 3);
        const liSource: SourceResult = {
          type: 'linkedin', status: 'done', url, label: 'LinkedIn Search',
          findings: liSearchResults.length > 0
            ? [`Found ${liSearchResults.length} LinkedIn references`]
            : ['LinkedIn profile found — using URL slug data'],
        };

        // Combine any scraped LinkedIn content
        let liContent = liSearchResults
          .filter(r => r.markdown && r.markdown.length > 50)
          .map(r => r.markdown)
          .join('\n\n---\n\n');

        // If no markdown from search, try direct scrape as a longshot
        if (!liContent) {
          const directMarkdown = await firecrawlScrape(fc, url);
          if (directMarkdown) liContent = directMarkdown;
        }

        dossier.sources.push(liSource);
        controller.enqueue(sse(encoder, 'source_complete', liSource));
        controller.enqueue(sse(encoder, 'dossier', dossier));

        // ── Phase 2: Broad web search for this person ────────────────────
        controller.enqueue(sse(encoder, 'source_status', { type: 'google', status: 'scraping', label: 'Web Search' }));

        const webResults = await firecrawlSearch(fc, personSlugName, 8);
        const googleSource: SourceResult = {
          type: 'google', status: 'done', label: 'Web Search',
          findings: [`Found ${webResults.length} web results`],
        };
        dossier.sources.push(googleSource);
        controller.enqueue(sse(encoder, 'source_complete', googleSource));

        // Categorize and scrape results
        const junkDomains = ['google.com', 'gstatic.com', 'googleapis.com', 'facebook.com', 'instagram.com', 'youtube.com', 'tiktok.com'];
        const toEnrich: Array<{ url: string; type: SourceType; label: string; markdown?: string }> = [];
        for (const r of webResults) {
          if (!r.url) continue;
          const u = r.url;
          if (u.includes('linkedin.com')) continue;
          if (junkDomains.some(d => u.includes(d))) continue;

          if (u.includes('twitter.com') || u.includes('x.com')) {
            dossier.webPresence.twitter = dossier.webPresence.twitter || u;
            toEnrich.push({ url: u, type: 'twitter', label: 'Twitter / X', markdown: r.markdown });
          } else if (u.includes('github.com')) {
            dossier.webPresence.github = dossier.webPresence.github || u;
            toEnrich.push({ url: u, type: 'github', label: 'GitHub', markdown: r.markdown });
          } else if (u.includes('medium.com') || u.includes('substack.com') || u.includes('dev.to')) {
            dossier.webPresence.personalSite = dossier.webPresence.personalSite || u;
            toEnrich.push({ url: u, type: 'personal_site', label: 'Blog / Writing', markdown: r.markdown });
          } else {
            dossier.webPresence.otherUrls.push(u);
            toEnrich.push({ url: u, type: 'news', label: r.title?.slice(0, 30) || 'Web Page', markdown: r.markdown });
          }
        }

        controller.enqueue(sse(encoder, 'dossier', dossier));

        // ── Phase 3: Build initial profile from ALL collected content ─────
        // Combine LinkedIn + web content for a single comprehensive Claude call
        const allContent: string[] = [];
        if (liContent) allContent.push(`[LinkedIn Profile]\n${liContent.slice(0, 6000)}`);

        for (const item of toEnrich.slice(0, 5)) {
          if (item.markdown && item.markdown.length > 100) {
            allContent.push(`[${item.label} - ${item.url}]\n${item.markdown.slice(0, 3000)}`);
          }
        }

        if (allContent.length === 0) {
          // Nothing scraped yet — scrape the discovered URLs
          for (const item of toEnrich.slice(0, 3)) {
            controller.enqueue(sse(encoder, 'source_status', { type: item.type, status: 'scraping', label: item.label }));
            const md = await firecrawlScrape(fc, item.url);
            const src: SourceResult = {
              type: item.type, status: md ? 'done' : 'failed', url: item.url, label: item.label,
              rawLength: md?.length,
            };
            dossier.sources.push(src);
            controller.enqueue(sse(encoder, 'source_complete', src));
            if (md && md.length > 100) {
              item.markdown = md;
              allContent.push(`[${item.label} - ${item.url}]\n${md.slice(0, 3000)}`);
            }
          }
        }

        // If we still have nothing, use just the name from URL
        if (allContent.length === 0) {
          allContent.push(`Person's name (from LinkedIn URL): ${personSlugName}\nLinkedIn URL: ${url}`);
        }

        // ── Phase 4: Claude analysis of combined content ─────────────────
        controller.enqueue(sse(encoder, 'source_status', { type: 'linkedin', status: 'analyzing', label: 'Analyzing Profile' }));

        const profileResult = await askClaude(
          PROFILE_PROMPT + '\n\nHere is all the web content about this person:\n\n' + allContent.join('\n\n---\n\n')
        );

        let profileData;
        try {
          profileData = parseJSON(profileResult);
        } catch {
          console.error('[person-analyze] Claude returned non-JSON, attempting extraction');
          // Try to extract JSON from the response
          const jsonMatch = profileResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            profileData = JSON.parse(jsonMatch[0]);
          } else {
            // Use the raw text as a summary and keep going with defaults
            dossier.summary = profileResult.slice(0, 300);
            dossier.overallConfidence = 0.15;
            controller.enqueue(sse(encoder, 'dossier', dossier));
            controller.enqueue(sse(encoder, 'complete', dossier));
            controller.close();
            return;
          }
        }

        // Populate dossier
        dossier.name = profileData.name || personSlugName;
        dossier.headline = profileData.headline || '';
        dossier.location = profileData.location || '';
        dossier.photoInitial = dossier.name.charAt(0);
        dossier.summary = profileData.summary || '';
        dossier.currentRole = profileData.currentRole || dossier.currentRole;
        dossier.experience = profileData.experience || [];
        dossier.education = profileData.education || [];
        dossier.skills = profileData.skills || [];

        if (profileData.webPresence) {
          if (profileData.webPresence.twitter) dossier.webPresence.twitter = profileData.webPresence.twitter;
          if (profileData.webPresence.github) dossier.webPresence.github = profileData.webPresence.github;
          if (profileData.webPresence.personalSite) dossier.webPresence.personalSite = profileData.webPresence.personalSite;
        }

        if (profileData.lifestyle) {
          dossier.lifestyle = { ...dossier.lifestyle, ...profileData.lifestyle };
        }

        dossier.mappedInputs = {
          country: dossier.lifestyle.inferredCountry,
          income: dossier.lifestyle.estimatedIncome,
          housing: dossier.lifestyle.inferredHousing,
          transport: dossier.lifestyle.inferredTransport,
          diet: dossier.lifestyle.inferredDiet,
          shopping_frequency: dossier.lifestyle.inferredShopping,
          flights_per_year: dossier.lifestyle.inferredFlightsPerYear,
          energy_source: dossier.lifestyle.inferredEnergySource,
          food_waste: 'some',
        };

        dossier.overallConfidence = Math.min(0.6, 0.2 + allContent.length * 0.1);
        dossier.lastUpdated = new Date().toISOString();

        controller.enqueue(sse(encoder, 'source_complete', { type: 'linkedin', status: 'done', label: 'Profile Analysis' }));
        controller.enqueue(sse(encoder, 'dossier', dossier));

        // ── Phase 5: Deep enrichment — scrape remaining pages ────────────
        const enriched = new Set<string>();
        for (const item of toEnrich) {
          if (enriched.size >= 4) break;
          if (item.markdown && item.markdown.length > 100) continue; // already used in initial analysis
          if (enriched.has(item.url)) continue;
          enriched.add(item.url);

          controller.enqueue(sse(encoder, 'source_status', { type: item.type, status: 'scraping', label: item.label }));

          const md = await firecrawlScrape(fc, item.url);
          const src: SourceResult = {
            type: item.type, status: md ? 'done' : 'failed', url: item.url, label: item.label,
            rawLength: md?.length,
          };

          if (md && md.length > 100) {
            controller.enqueue(sse(encoder, 'source_status', { type: item.type, status: 'analyzing', label: item.label }));

            try {
              const dossierSummary = JSON.stringify({
                name: dossier.name, role: dossier.currentRole,
                location: dossier.location, lifestyle: dossier.lifestyle,
              });
              const enrichResult = await askClaude(enrichmentPrompt(dossierSummary, item.label, md));
              const enrichData = parseJSON(enrichResult);

              if (enrichData.newSignals) {
                for (const sig of enrichData.newSignals) {
                  dossier.signals.push({ ...sig, source: item.type } as ConsumptionSignal);
                }
              }
              if (enrichData.updatedFields) {
                for (const [key, val] of Object.entries(enrichData.updatedFields)) {
                  if (val !== null && val !== undefined) {
                    (dossier.lifestyle as Record<string, unknown>)[key] = val;
                  }
                }
              }
              if (enrichData.reasoning) {
                dossier.lifestyle.reasoning.push(...enrichData.reasoning);
              }

              dossier.mappedInputs = {
                country: dossier.lifestyle.inferredCountry,
                income: dossier.lifestyle.estimatedIncome,
                housing: dossier.lifestyle.inferredHousing,
                transport: dossier.lifestyle.inferredTransport,
                diet: dossier.lifestyle.inferredDiet,
                shopping_frequency: dossier.lifestyle.inferredShopping,
                flights_per_year: dossier.lifestyle.inferredFlightsPerYear,
                energy_source: dossier.lifestyle.inferredEnergySource,
                food_waste: 'some',
              };

              src.findings = enrichData.reasoning?.slice(0, 3) || [];
              dossier.overallConfidence = Math.min(0.95, dossier.overallConfidence + 0.08);
            } catch {
              src.findings = ['Analysis failed for this source'];
            }
          }

          src.status = src.status === 'failed' ? 'failed' : 'done';
          dossier.sources.push(src);
          controller.enqueue(sse(encoder, 'source_complete', src));
          dossier.lastUpdated = new Date().toISOString();
          controller.enqueue(sse(encoder, 'dossier', dossier));
        }

        // ── Done ─────────────────────────────────────────────────────────
        controller.enqueue(sse(encoder, 'complete', dossier));
      } catch (err) {
        console.error('[person-analyze] Error:', err);
        controller.enqueue(sse(encoder, 'error', { message: err instanceof Error ? err.message : 'Unknown error' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
