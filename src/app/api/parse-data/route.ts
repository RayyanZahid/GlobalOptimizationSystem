import { NextRequest, NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';

const SYSTEM_PROMPTS: Record<string, string> = {
  bank: 'You are a financial analyst. Extract spending categories and monthly totals from this bank statement or transaction list. Return ONLY valid JSON: { categories: { groceries: number, gas_stations: number, utilities: number, restaurants: number, shopping: number, housing: number, transportation: number, other: number }, monthly_total: number, currency: string }. Amounts in the original currency. If unclear, estimate conservatively.',
  receipt: 'You are a nutritionist. Extract food items with estimated quantities from this grocery receipt. Return ONLY valid JSON: { items: [{ name: string, quantity_kg: number, category: \'produce\'|\'meat\'|\'dairy\'|\'grains\'|\'processed\'|\'beverage\' }], total_kg: number, estimated_co2e_kg: number }',
  home: 'You are a construction engineer. Given this home description, estimate the material stock locked in the building. Return ONLY valid JSON: { sqft: number, year_built: number, stories: number, materials: { concrete_tonnes: number, steel_tonnes: number, wood_tonnes: number, glass_tonnes: number, copper_kg: number, aluminum_kg: number }, estimated_co2e_embodied_tonnes: number }',
  devices: 'You are an electronics materials expert. List these devices with estimated material content based on typical teardown data. Return ONLY valid JSON: { devices: [{ name: string, weight_kg: number, elements: { Li?: number, Co?: number, Cu?: number, Au?: number, Ag?: number, Al?: number, Fe?: number, Si?: number } }], total_weight_kg: number, total_co2e_manufacturing_kg: number }',
};

export async function POST(request: NextRequest) {
  let body: { type: string; text: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, text } = body;

  if (!type || !text) {
    return NextResponse.json({ error: 'Missing required fields: type, text' }, { status: 400 });
  }

  const systemPrompt = SYSTEM_PROMPTS[type];
  if (!systemPrompt) {
    return NextResponse.json(
      { error: `Unknown type "${type}". Must be one of: bank, receipt, home, devices` },
      { status: 400 },
    );
  }

  try {
    const q = query({
      prompt: systemPrompt + '\n\nUser data:\n' + text,
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
    let cleaned = resultText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try extracting the first JSON object from the response
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[parse-data] Claude error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse data. Please try again.' },
      { status: 500 },
    );
  }
}
