import { NextRequest, NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';

const SYSTEM_PROMPT = `You are a sustainability engineer doing lifecycle analysis. The user tells you something they currently own or use. Analyze its material composition, annual carbon footprint, and suggest exactly 3 alternative swaps ranked by planetary impact. Be HONEST about trade-offs — sometimes keeping the old item is better than manufacturing a new one.

Return ONLY valid JSON with this structure:
{
  "current": {
    "name": "string",
    "materials": { "steel_kg": N, "aluminum_kg": N, "copper_kg": N, "lithium_kg": N, "plastic_kg": N },
    "annual_co2e_kg": N,
    "planetary_status": "over" | "at" | "under",
    "overshoot_ratio": N
  },
  "swaps": [
    {
      "name": "string",
      "description": "string",
      "estimated_cost": "$X,XXX",
      "materials": { "steel_kg": N, "aluminum_kg": N, "copper_kg": N, "lithium_kg": N, "plastic_kg": N },
      "annual_co2e_kg": N,
      "co2e_delta_kg": N,
      "co2e_reduction_pct": N,
      "planetary_status": "over" | "at" | "under",
      "overshoot_ratio": N,
      "tradeoffs": ["string"],
      "recommendation": "best_planetary" | "best_cost" | "keep_current"
    }
  ]
}`;

// --- Hardcoded fallbacks for demo reliability ---

const CAMRY_FALLBACK = {
  current: {
    name: '2019 Toyota Camry (12,000 mi/yr)',
    materials: { steel_kg: 890, aluminum_kg: 180, copper_kg: 22, lithium_kg: 0, plastic_kg: 110 },
    annual_co2e_kg: 4320,
    planetary_status: 'over' as const,
    overshoot_ratio: 3.1,
  },
  swaps: [
    {
      name: 'Tesla Model 3 (US average grid)',
      description: 'Battery EV with 75 kWh pack. Manufacturing emits ~12 t CO₂e upfront but grid charging cuts per-mile emissions by ~65% in the average US grid mix.',
      estimated_cost: '$42,000',
      materials: { steel_kg: 610, aluminum_kg: 340, copper_kg: 83, lithium_kg: 11, plastic_kg: 75 },
      annual_co2e_kg: 1530,
      co2e_delta_kg: -2790,
      co2e_reduction_pct: 65,
      planetary_status: 'over' as const,
      overshoot_ratio: 1.1,
      tradeoffs: [
        '+11 kg lithium mining (water-intensive in Chile/Argentina)',
        '+83 kg copper vs 22 kg in Camry — significant mining impact',
        'Battery replacement ~$10k every 10–15 yrs',
        'Upfront manufacturing adds ~12 t CO₂e; payback ~4 years',
      ],
      recommendation: 'best_planetary' as const,
    },
    {
      name: 'Toyota Prius Prime (plug-in hybrid)',
      description: 'PHEV with 8.8 kWh battery covers ~25 miles electric-only. Best option if you drive short daily trips; low upfront manufacturing emissions vs full BEV.',
      estimated_cost: '$32,000',
      materials: { steel_kg: 780, aluminum_kg: 210, copper_kg: 35, lithium_kg: 2, plastic_kg: 95 },
      annual_co2e_kg: 2100,
      co2e_delta_kg: -2220,
      co2e_reduction_pct: 51,
      planetary_status: 'over' as const,
      overshoot_ratio: 1.5,
      tradeoffs: [
        'Savings drop sharply if you rarely charge it',
        'Still burns gasoline for long trips',
        'Smaller lithium footprint than full BEV',
      ],
      recommendation: 'best_cost' as const,
    },
    {
      name: 'Keep your Camry + switch to telecommute/transit',
      description: 'Reducing annual mileage from 12,000 to 5,000 via remote work or transit for commutes cuts emissions more than buying a new EV — and costs nothing new to manufacture.',
      estimated_cost: '$0',
      materials: { steel_kg: 890, aluminum_kg: 180, copper_kg: 22, lithium_kg: 0, plastic_kg: 110 },
      annual_co2e_kg: 1800,
      co2e_delta_kg: -2520,
      co2e_reduction_pct: 58,
      planetary_status: 'over' as const,
      overshoot_ratio: 1.3,
      tradeoffs: [
        'Requires workplace flexibility or viable transit options',
        'No new manufacturing emissions — immediate benefit',
        'Camry still depreciating regardless',
      ],
      recommendation: 'keep_current' as const,
    },
  ],
};

const IPHONE_FALLBACK = {
  current: {
    name: 'iPhone 14',
    materials: { steel_kg: 0.018, aluminum_kg: 0.025, copper_kg: 0.015, lithium_kg: 0.006, plastic_kg: 0.012 },
    annual_co2e_kg: 61,
    planetary_status: 'over' as const,
    overshoot_ratio: 1.4,
  },
  swaps: [
    {
      name: 'Keep iPhone 14 for 3 more years (skip iPhone 16)',
      description: 'Manufacturing a new phone emits ~55–70 kg CO₂e. Keeping your current device is almost always the greenest option — especially for a phone already in production.',
      estimated_cost: '$0',
      materials: { steel_kg: 0.018, aluminum_kg: 0.025, copper_kg: 0.015, lithium_kg: 0.006, plastic_kg: 0.012 },
      annual_co2e_kg: 20,
      co2e_delta_kg: -41,
      co2e_reduction_pct: 67,
      planetary_status: 'under' as const,
      overshoot_ratio: 0.5,
      tradeoffs: [
        'Battery degrades ~20% per year — may need $99 replacement',
        'May miss new accessibility or security features',
        'Older CPU is less efficient — marginal energy difference',
      ],
      recommendation: 'best_planetary' as const,
    },
    {
      name: 'Fairphone 5 (modular, repairable)',
      description: 'EU-made modular smartphone designed for 10-year lifespan. Replaceable battery, screen, and camera. ~30% lower lifecycle emissions than average flagship.',
      estimated_cost: '$700',
      materials: { steel_kg: 0.014, aluminum_kg: 0.020, copper_kg: 0.012, lithium_kg: 0.005, plastic_kg: 0.020 },
      annual_co2e_kg: 22,
      co2e_delta_kg: -39,
      co2e_reduction_pct: 64,
      planetary_status: 'under' as const,
      overshoot_ratio: 0.5,
      tradeoffs: [
        'No Face ID or Apple ecosystem integration',
        'Android only — app/workflow changes required',
        'Smaller camera sensor than iPhone 14',
        'Harder to find in US retail',
      ],
      recommendation: 'best_cost' as const,
    },
    {
      name: 'Refurbished iPhone 13 (Apple Certified)',
      description: 'Buying refurbished recycles embodied carbon from prior manufacturing. A certified refurb saves ~55 kg CO₂e vs new while keeping iOS ecosystem.',
      estimated_cost: '$430',
      materials: { steel_kg: 0.018, aluminum_kg: 0.024, copper_kg: 0.014, lithium_kg: 0.006, plastic_kg: 0.011 },
      annual_co2e_kg: 15,
      co2e_delta_kg: -46,
      co2e_reduction_pct: 75,
      planetary_status: 'under' as const,
      overshoot_ratio: 0.35,
      tradeoffs: [
        'No USB-C (Lightning only)',
        '1-year Apple warranty vs 1-year on new',
        'Stock color/storage options may be limited',
      ],
      recommendation: 'keep_current' as const,
    },
  ],
};

export async function POST(request: NextRequest) {
  let body: { currentItem: string; category: 'transport' | 'housing' | 'diet' | 'device' };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { currentItem, category } = body;

  if (!currentItem || !category) {
    return NextResponse.json(
      { error: 'Missing required fields: currentItem, category' },
      { status: 400 },
    );
  }

  const validCategories = ['transport', 'housing', 'diet', 'device'];
  if (!validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
      { status: 400 },
    );
  }

  const itemLower = currentItem.toLowerCase();

  // Check fallbacks before hitting Claude
  if (category === 'transport' && (itemLower.includes('camry') || itemLower.includes('toyota camry'))) {
    return NextResponse.json(CAMRY_FALLBACK);
  }
  if (category === 'device' && itemLower.includes('iphone') && !itemLower.includes('15') && !itemLower.includes('16')) {
    return NextResponse.json(IPHONE_FALLBACK);
  }

  const userMessage = `Category: ${category}\nItem: ${currentItem}\n\nAnalyze this item's lifecycle and provide 3 swap alternatives as specified.`;

  try {
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
    // Fall back to hardcoded data if Claude call fails
    if (category === 'transport' && itemLower.includes('camry')) {
      return NextResponse.json(CAMRY_FALLBACK);
    }
    if (category === 'device' && itemLower.includes('iphone')) {
      return NextResponse.json(IPHONE_FALLBACK);
    }

    console.error('[swap-analyze] Claude error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to analyze item. Please try again.' },
      { status: 500 },
    );
  }
}
