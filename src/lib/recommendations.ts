import { UserInputs } from './types';
import { computeProfile } from './estimation-engine';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  delta_co2e_kg: number;        // negative = reduction
  delta_material_tonnes: number;
  pct_reduction: number;
  category: 'diet' | 'transport' | 'housing' | 'energy' | 'consumption';
  icon: string;
  changeKey: keyof UserInputs;
  changeTo: string;
}

const SCENARIOS: {
  id: string;
  changeKey: keyof UserInputs;
  changeTo: string;
  title: string;
  description: string;
  category: 'diet' | 'transport' | 'housing' | 'energy' | 'consumption';
  icon: string;
}[] = [
  { id: 'diet_vegan', changeKey: 'diet', changeTo: 'vegan', title: 'Go fully plant-based', description: 'Eliminate all animal products from your diet', category: 'diet', icon: '🌱' },
  { id: 'diet_veg', changeKey: 'diet', changeTo: 'vegetarian', title: 'Go vegetarian', description: 'Cut meat but keep dairy and eggs', category: 'diet', icon: '🥗' },
  { id: 'reduce_waste', changeKey: 'food_waste', changeTo: 'none', title: 'Eliminate food waste', description: 'Plan meals, compost scraps, and use leftovers', category: 'diet', icon: '♻️' },
  { id: 'transit', changeKey: 'transport', changeTo: 'transit', title: 'Switch to public transit', description: 'Use buses, trains, and cycling instead of driving', category: 'transport', icon: '🚇' },
  { id: 'car', changeKey: 'transport', changeTo: 'car', title: 'Downsize to standard car', description: 'Switch from SUV/truck to a smaller vehicle', category: 'transport', icon: '🚗' },
  { id: 'reduce_flights', changeKey: 'flights_per_year', changeTo: '0', title: 'Stop flying', description: 'Eliminate air travel — the highest per-trip emission source', category: 'transport', icon: '✈️' },
  { id: 'apartment', changeKey: 'housing', changeTo: 'apartment', title: 'Downsize to apartment', description: 'Smaller living space = less materials in construction and heating', category: 'housing', icon: '🏢' },
  { id: 'house', changeKey: 'housing', changeTo: 'house', title: 'Downsize to standard house', description: 'Reduce from large house to standard size', category: 'housing', icon: '🏠' },
  { id: 'energy_heatpump', changeKey: 'energy_source', changeTo: 'heat_pump', title: 'Switch to heat pump', description: 'Replace gas/oil furnace with an electric heat pump', category: 'energy', icon: '♨️' },
  { id: 'energy_electric', changeKey: 'energy_source', changeTo: 'electric', title: 'Switch to electric heating', description: 'Replace fossil fuel heating with electric', category: 'energy', icon: '⚡' },
  { id: 'reduce_shopping', changeKey: 'shopping_frequency', changeTo: 'minimal', title: 'Buy less stuff', description: 'Reduce clothing and electronics purchases — repair and reuse', category: 'consumption', icon: '📦' },
];

export function computeRecommendations(inputs: UserInputs): Recommendation[] {
  const baseline = computeProfile(inputs);
  if (!baseline.carbon) return [];

  const baseCarbon = baseline.carbon.total_co2e_kg_per_year;
  const baseMaterial = baseline.annualThroughput_tonnes;
  const results: Recommendation[] = [];

  for (const scenario of SCENARIOS) {
    // Skip if user already has this value
    if (inputs[scenario.changeKey] === scenario.changeTo) continue;

    // Skip nonsensical upgrades (don't recommend large_house if in apartment)
    const currentVal = inputs[scenario.changeKey] as string | undefined;
    if (scenario.changeKey === 'housing') {
      if (scenario.changeTo === 'house' && currentVal !== 'large_house') continue;
      if (scenario.changeTo === 'apartment' && currentVal === 'apartment') continue;
    }
    if (scenario.changeKey === 'transport') {
      if (scenario.changeTo === 'car' && currentVal !== 'suv' && currentVal !== 'frequent_flyer') continue;
    }
    if (scenario.changeKey === 'diet') {
      if (scenario.changeTo === 'vegetarian' && (currentVal === 'vegan' || currentVal === 'vegetarian')) continue;
      if (scenario.changeTo === 'vegan' && currentVal === 'vegan') continue;
    }
    if (scenario.changeKey === 'food_waste') {
      if (currentVal === 'none') continue;
    }
    if (scenario.changeKey === 'energy_source') {
      if (scenario.changeTo === 'heat_pump' && currentVal === 'heat_pump') continue;
      if (scenario.changeTo === 'electric' && (currentVal === 'electric' || currentVal === 'heat_pump')) continue;
    }
    if (scenario.changeKey === 'shopping_frequency') {
      if (currentVal === 'minimal') continue;
    }
    if (scenario.changeKey === 'flights_per_year') {
      if (inputs.flights_per_year === undefined || inputs.flights_per_year === 0) continue;
    }

    const altInputs = { ...inputs, [scenario.changeKey]: scenario.changeTo };
    const altProfile = computeProfile(altInputs);
    if (!altProfile.carbon) continue;

    const deltaCO2 = altProfile.carbon.total_co2e_kg_per_year - baseCarbon;
    const deltaMaterial = altProfile.annualThroughput_tonnes - baseMaterial;

    // Only include if it's actually a reduction
    if (deltaCO2 >= 0) continue;

    results.push({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      delta_co2e_kg: deltaCO2,
      delta_material_tonnes: deltaMaterial,
      pct_reduction: Math.abs(deltaCO2 / baseCarbon) * 100,
      category: scenario.category,
      icon: scenario.icon,
      changeKey: scenario.changeKey,
      changeTo: scenario.changeTo,
    });
  }

  // Sort by biggest CO2 reduction first
  results.sort((a, b) => a.delta_co2e_kg - b.delta_co2e_kg);
  return results;
}
