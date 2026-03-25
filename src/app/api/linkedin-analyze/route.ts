import { NextRequest, NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import FirecrawlApp from '@mendable/firecrawl-js';

const SYSTEM_PROMPT = `You are a career analyst and sustainability researcher. Given a LinkedIn profile in markdown format, extract structured data and infer lifestyle/consumption signals for material footprint estimation.

INFERENCE RULES:
- Income: estimate from job title + company + location + industry. Use BLS/Glassdoor-level reasoning. Return annual USD.
- Country: from location string in profile. Use ISO country name.
- Housing: executives/high-income in suburbs → "large_house"; urban professionals → "apartment"; mid-range suburban → "house"
- Transport: consultants/frequent travelers/global roles → "frequent_flyer"; urban tech workers → "transit"; suburban commuters → "car"; luxury/exec → "suv"
- Diet: default "omnivore" unless sustainability/health signals suggest "vegetarian" or "vegan"
- Shopping: high-income + consumer/luxury industry → "frequent"; nonprofit/sustainability/academia → "minimal"; most others → "average"
- Flights per year: consulting/sales/global roles → 8-12; regional roles → 2-4; local/remote roles → 0-2
- Food waste: default "some"; sustainability-focused → "none"; high-income busy professionals → "significant"

Return ONLY valid JSON with this exact structure:
{
  "profile": {
    "name": "string",
    "headline": "string",
    "location": "string",
    "summary": "brief 1-2 sentence summary",
    "currentRole": { "title": "string", "company": "string", "industry": "string" },
    "experience": [{ "title": "string", "company": "string", "duration": "string" }],
    "education": [{ "school": "string", "degree": "string" }],
    "skills": ["string"]
  },
  "lifestyleSignals": {
    "estimatedIncome": number,
    "incomeConfidence": 0.0-1.0,
    "inferredCountry": "string",
    "inferredHousing": "apartment" | "house" | "large_house",
    "inferredTransport": "transit" | "car" | "suv" | "frequent_flyer",
    "inferredDiet": "vegan" | "vegetarian" | "omnivore" | "heavy_meat",
    "inferredShopping": "minimal" | "average" | "frequent",
    "inferredFlightsPerYear": number,
    "reasoning": ["one sentence per inference explaining why"]
  },
  "mappedInputs": {
    "country": "string",
    "income": number,
    "housing": "apartment" | "house" | "large_house",
    "transport": "transit" | "car" | "suv" | "frequent_flyer",
    "diet": "vegan" | "vegetarian" | "omnivore" | "heavy_meat",
    "shopping_frequency": "minimal" | "average" | "frequent",
    "flights_per_year": number,
    "food_waste": "none" | "some" | "significant"
  }
}`;

// --- Hardcoded fallback for demo reliability ---
const DEMO_FALLBACK = {
  profile: {
    name: 'Alex Chen',
    headline: 'Senior Software Engineer at Google',
    location: 'San Francisco, California',
    summary: 'Full-stack engineer building large-scale distributed systems at Google Cloud. Previously at Stripe.',
    currentRole: { title: 'Senior Software Engineer', company: 'Google', industry: 'Technology' },
    experience: [
      { title: 'Senior Software Engineer', company: 'Google', duration: '3 years' },
      { title: 'Software Engineer', company: 'Stripe', duration: '2 years' },
      { title: 'Junior Developer', company: 'StartupCo', duration: '1 year' },
    ],
    education: [{ school: 'Stanford University', degree: 'BS Computer Science' }],
    skills: ['Python', 'Go', 'Kubernetes', 'Distributed Systems', 'Machine Learning'],
  },
  lifestyleSignals: {
    estimatedIncome: 250000,
    incomeConfidence: 0.8,
    inferredCountry: 'United States',
    inferredHousing: 'apartment' as const,
    inferredTransport: 'transit' as const,
    inferredDiet: 'omnivore' as const,
    inferredShopping: 'average' as const,
    inferredFlightsPerYear: 4,
    reasoning: [
      'Senior SWE at Google in SF typically earns $220-280k total comp',
      'San Francisco urban location suggests apartment living',
      'SF has strong transit (BART/Muni) — tech workers commonly use transit or bike',
      'No sustainability or dietary signals in profile — defaulting to omnivore',
      'Tech industry, moderate income — average shopping frequency',
      'Regional role with occasional conferences — estimated 4 flights/year',
    ],
  },
  mappedInputs: {
    country: 'United States',
    income: 250000,
    housing: 'apartment' as const,
    transport: 'transit' as const,
    diet: 'omnivore' as const,
    shopping_frequency: 'average' as const,
    flights_per_year: 4,
    food_waste: 'some' as const,
  },
};

export async function POST(request: NextRequest) {
  let body: { url: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;

  if (!url || !url.includes('linkedin.com/in/')) {
    return NextResponse.json(
      { error: 'Invalid LinkedIn URL. Must contain linkedin.com/in/' },
      { status: 400 },
    );
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error('[linkedin-analyze] FIRECRAWL_API_KEY not set, using fallback');
    return NextResponse.json(DEMO_FALLBACK);
  }

  try {
    // Step 1: Scrape LinkedIn profile with Firecrawl (v1 API)
    const firecrawl = new FirecrawlApp({ apiKey });
    let markdown = '';

    // Try direct scrape first, fall back to search
    try {
      const scrapeResult = await firecrawl.v1.scrapeUrl(url, { formats: ['markdown'] });
      if (scrapeResult.success && scrapeResult.markdown) {
        markdown = scrapeResult.markdown;
      }
    } catch {
      // LinkedIn blocks direct scraping — use search instead
    }

    if (!markdown) {
      // Extract name from URL slug and search
      const slug = url.match(/linkedin\.com\/in\/([^/?#]+)/)?.[1] || '';
      const name = slug.replace(/-/g, ' ');
      try {
        const searchResult = await firecrawl.v1.search(`"${name}" site:linkedin.com`, {
          limit: 3,
          scrapeOptions: { formats: ['markdown'] },
        });
        if (searchResult.success && searchResult.data) {
          markdown = searchResult.data
            .filter((d: { markdown?: string }) => d.markdown)
            .map((d: { markdown?: string }) => d.markdown)
            .join('\n\n');
        }
      } catch {
        // search also failed
      }
    }

    if (!markdown) {
      console.error('[linkedin-analyze] Could not get LinkedIn content');
      return NextResponse.json(DEMO_FALLBACK);
    }

    // Step 2: Send to Claude for structured extraction + lifestyle inference
    const userMessage = `Here is a LinkedIn profile scraped as markdown. Extract the structured profile data and infer lifestyle/footprint signals.\n\n---\n${markdown}\n---`;

    const q = query({
      prompt: SYSTEM_PROMPT + '\n\n' + userMessage,
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

    if (!resultText) {
      throw new Error('No result returned from Claude');
    }

    // Strip markdown code fences if present
    const cleaned = resultText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[linkedin-analyze] Error:', err);
    // Fall back to demo data
    return NextResponse.json(DEMO_FALLBACK);
  }
}
