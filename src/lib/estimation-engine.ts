import { ElementalProfile, UserInputs, ElementSymbol, MaterialCategory, Scope, ScaleData, ImpactMetrics } from './types';
import { BODY_COMPOSITION } from './elements';
import { computeCarbonFootprint, computeMolecularComposition } from './carbon';
import countryData from '../data/country-footprints-real.json';

type CountryRecord = {
  name: string;
  population: number;
  material_footprint_tonnes_per_capita: number;
  total_with_supply_chain: number;
  biomass: number;
  metals: number;
  minerals: number;
  fossil_fuels: number;
};

const countries = countryData as Record<string, CountryRecord>;

// Multipliers for lifestyle factors
const DIET_MULTIPLIERS: Record<string, number> = {
  vegan: 0.7,
  vegetarian: 0.85,
  omnivore: 1.0,
  heavy_meat: 1.3,
};

const HOUSING_MULTIPLIERS: Record<string, number> = {
  apartment: 0.7,
  house: 1.0,
  large_house: 1.4,
};

const TRANSPORT_MULTIPLIERS: Record<string, number> = {
  transit: 0.6,
  car: 1.0,
  suv: 1.3,
  frequent_flyer: 1.5,
};

const ENERGY_SOURCE_MULTIPLIERS: Record<string, number> = {
  gas: 1.0,
  electric: 0.7,
  heat_pump: 0.5,
  oil: 1.2,
};

const FOOD_WASTE_MULTIPLIERS: Record<string, number> = {
  none: 0.85,
  some: 1.0,
  significant: 1.2,
};

const SHOPPING_MULTIPLIERS: Record<string, number> = {
  minimal: 0.75,
  average: 1.0,
  frequent: 1.4,
};

// Material category breakdown by element (approximate mass fractions)
// These map material categories to their dominant elements
const CATEGORY_ELEMENTS: Record<MaterialCategory, Partial<Record<ElementSymbol, number>>> = {
  biomass: { C: 0.45, O: 0.40, H: 0.06, N: 0.02, K: 0.01, P: 0.005, S: 0.003, Ca: 0.01, Mg: 0.002 },
  metals: { Fe: 0.55, Al: 0.15, Cu: 0.05, Zn: 0.03, Mn: 0.02, Cr: 0.02, Ni: 0.02, Ti: 0.01, Si: 0.05, O: 0.10 },
  minerals: { Si: 0.25, O: 0.45, Ca: 0.10, Al: 0.05, Fe: 0.03, Mg: 0.02, Na: 0.02, K: 0.02, C: 0.03, H: 0.01 },
  fossil_fuels: { C: 0.75, H: 0.12, O: 0.05, N: 0.02, S: 0.03, Fe: 0.005 },
};

export function computeProfile(inputs: UserInputs): ElementalProfile {
  const knownInputs: string[] = [];
  let confidence = 0.1; // base confidence from just existing

  // Determine body mass
  const weight = inputs.weight_kg ?? (inputs.sex === 'female' ? 62 : 75);
  if (inputs.weight_kg) { knownInputs.push('weight'); confidence += 0.05; }

  // Body composition
  const composition: Partial<Record<ElementSymbol, { mass_kg: number; percentage: number; confidence: number }>> = {};
  for (const [sym, frac] of Object.entries(BODY_COMPOSITION)) {
    composition[sym as ElementSymbol] = {
      mass_kg: weight * frac,
      percentage: frac * 100,
      confidence: inputs.weight_kg ? 0.9 : 0.6,
    };
  }

  if (inputs.age) { knownInputs.push('age'); confidence += 0.05; }
  if (inputs.sex) { knownInputs.push('sex'); confidence += 0.05; }

  // Get country data for material footprint
  const country = inputs.country && countries[inputs.country] ? inputs.country : 'US';
  const cd = countries[country];
  if (inputs.country) { knownInputs.push('country'); confidence += 0.1; }

  // Base annual throughput (tonnes/year)
  let baseThroughput = cd.total_with_supply_chain;

  // Income adjustment
  if (inputs.income) {
    knownInputs.push('income');
    confidence += 0.15;
    // Scale relative to median US income (~$60k)
    const incomeRatio = inputs.income / 60000;
    baseThroughput = baseThroughput * (0.5 + 0.5 * incomeRatio);
  }

  // Diet adjustment
  const dietMult = inputs.diet ? DIET_MULTIPLIERS[inputs.diet] : 1.0;
  if (inputs.diet) { knownInputs.push('diet'); confidence += 0.1; }

  // Housing adjustment
  const housingMult = inputs.housing ? HOUSING_MULTIPLIERS[inputs.housing] : 1.0;
  if (inputs.housing) { knownInputs.push('housing'); confidence += 0.1; }

  // Transport adjustment
  const transportMult = inputs.transport ? TRANSPORT_MULTIPLIERS[inputs.transport] : 1.0;
  if (inputs.transport) { knownInputs.push('transport'); confidence += 0.08; }

  // Energy source adjustment
  const energyMult = inputs.energy_source ? ENERGY_SOURCE_MULTIPLIERS[inputs.energy_source] : 1.0;
  if (inputs.energy_source) { knownInputs.push('energy_source'); confidence += 0.05; }

  // Food waste adjustment
  const wasteMult = inputs.food_waste ? FOOD_WASTE_MULTIPLIERS[inputs.food_waste] : 1.0;
  if (inputs.food_waste) { knownInputs.push('food_waste'); confidence += 0.05; }

  // Shopping frequency adjustment
  const shoppingMult = inputs.shopping_frequency ? SHOPPING_MULTIPLIERS[inputs.shopping_frequency] : 1.0;
  if (inputs.shopping_frequency) { knownInputs.push('shopping_frequency'); confidence += 0.05; }

  // Flights adjustment (adds directly to fossil fuel flow later)
  const flightsPerYear = inputs.flights_per_year ?? 0;
  if (inputs.flights_per_year !== undefined) { knownInputs.push('flights_per_year'); confidence += 0.05; }

  // Miles per week (refines transport estimate)
  if (inputs.miles_per_week !== undefined) { knownInputs.push('miles_per_week'); confidence += 0.05; }

  // Combined multiplier
  const lifestyleMult = (dietMult * wasteMult + housingMult * energyMult + transportMult + shoppingMult) / 4;
  const adjustedThroughput = baseThroughput * lifestyleMult;

  // Break down into categories (proportional to country mix)
  const totalCategoryRaw = cd.biomass + cd.metals + cd.minerals + cd.fossil_fuels;

  // Flight CO2: ~0.5 tonnes fossil fuel equivalent per round-trip flight
  const flightFossilKg = flightsPerYear * 500;

  // Miles-per-week refinement: if provided, scale transport relative to 250 mi/wk US avg
  const milesTransportMult = inputs.miles_per_week !== undefined
    ? (inputs.miles_per_week / 250)
    : 1.0;

  const flows: Record<MaterialCategory, number> = {
    biomass: (cd.biomass / totalCategoryRaw) * adjustedThroughput * 1000 * dietMult * wasteMult,
    metals: (cd.metals / totalCategoryRaw) * adjustedThroughput * 1000 * housingMult * shoppingMult,
    minerals: (cd.minerals / totalCategoryRaw) * adjustedThroughput * 1000 * housingMult * energyMult,
    fossil_fuels: (cd.fossil_fuels / totalCategoryRaw) * adjustedThroughput * 1000 * transportMult * milesTransportMult + flightFossilKg,
  };

  // Add throughput elements to composition (annual flow, not static body)
  const throughputComposition: Partial<Record<ElementSymbol, number>> = {};
  for (const [cat, kg] of Object.entries(flows) as [MaterialCategory, number][]) {
    const elementBreakdown = CATEGORY_ELEMENTS[cat];
    for (const [sym, frac] of Object.entries(elementBreakdown)) {
      throughputComposition[sym as ElementSymbol] = (throughputComposition[sym as ElementSymbol] ?? 0) + kg * frac;
    }
  }

  const profileFlows = {
    inbound: flows,
    outbound: {
      biomass: flows.biomass * 0.95,
      metals: flows.metals * 0.1,
      minerals: flows.minerals * 0.05,
      fossil_fuels: flows.fossil_fuels * 0.98,
    },
  };

  const carbon = computeCarbonFootprint(profileFlows);
  const molecules = computeMolecularComposition(profileFlows, carbon);

  // Biological throughput: air, water, food passing through the body
  // These are part of total material flow but often invisible
  const biologicalThroughput = {
    air_kg_per_year: 5475 * (weight / 70),   // ~15 kg/day × 365, scaled by body mass
    water_kg_per_year: 912 * (weight / 70),   // ~2.5 L/day × 365
    food_kg_per_year: 548 * dietMult,          // ~1.5 kg/day × 365, scaled by diet
  };

  return {
    scope: 'person',
    name: 'You',
    confidence: Math.min(confidence, 0.65),
    composition,
    flows: profileFlows,
    knownInputs,
    totalMass_kg: weight,
    annualThroughput_tonnes: adjustedThroughput,
    carbon,
    molecules,
    biologicalThroughput,
  };
}

export function scaleProfile(personProfile: ElementalProfile, scale: Scope): ElementalProfile {
  const scaleFactors: Record<Scope, ScaleData> = {
    person: { scope: 'person', label: 'You', population: 1, multiplier: 1 },
    product: { scope: 'product', label: 'Product', population: 1, multiplier: 1 },
    city: { scope: 'city', label: 'Your City', population: 500000, multiplier: 500000 },
    country: { scope: 'country', label: 'United States', population: 331000000, multiplier: 331000000 },
    planet: { scope: 'planet', label: 'Earth', population: 8100000000, multiplier: 8100000000 },
  };

  const sd = scaleFactors[scale];
  if (scale === 'person') return personProfile;

  const scaledComposition: typeof personProfile.composition = {};
  for (const [sym, data] of Object.entries(personProfile.composition)) {
    if (data) {
      scaledComposition[sym as ElementSymbol] = {
        mass_kg: data.mass_kg * sd.multiplier,
        percentage: data.percentage,
        confidence: data.confidence * 0.8, // less confident at larger scales
      };
    }
  }

  return {
    ...personProfile,
    scope: scale,
    name: sd.label,
    population: sd.population,
    confidence: personProfile.confidence * 0.7,
    composition: scaledComposition,
    flows: {
      inbound: Object.fromEntries(
        Object.entries(personProfile.flows.inbound).map(([k, v]) => [k, v * sd.multiplier])
      ) as Record<MaterialCategory, number>,
      outbound: Object.fromEntries(
        Object.entries(personProfile.flows.outbound).map(([k, v]) => [k, v * sd.multiplier])
      ) as Record<MaterialCategory, number>,
    },
    totalMass_kg: personProfile.totalMass_kg * sd.multiplier,
    annualThroughput_tonnes: personProfile.annualThroughput_tonnes * sd.multiplier,
    carbon: personProfile.carbon ? {
      ...personProfile.carbon,
      total_co2e_kg_per_year: personProfile.carbon.total_co2e_kg_per_year * sd.multiplier,
      by_category: Object.fromEntries(
        Object.entries(personProfile.carbon.by_category).map(([k, v]) => [k, v * sd.multiplier])
      ) as Record<MaterialCategory, number>,
      breakdown: {
        co2_kg: personProfile.carbon.breakdown.co2_kg * sd.multiplier,
        ch4_kg: personProfile.carbon.breakdown.ch4_kg * sd.multiplier,
        n2o_kg: personProfile.carbon.breakdown.n2o_kg * sd.multiplier,
        h2o_kg: personProfile.carbon.breakdown.h2o_kg * sd.multiplier,
      },
    } : undefined,
  };
}

export function getComparison(country: string = 'US'): ElementalProfile {
  const cd = countries[country] || countries['US'];
  return computeProfile({ country });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function overshootDay(targetThroughput: number, yourThroughput: number): string {
  if (yourThroughput <= 0) return 'never';
  const ratio = targetThroughput / yourThroughput;
  if (ratio >= 1) return 'never';
  const dayOfYear = Math.floor(365 * ratio);
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + dayOfYear);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function computeImpactMetrics(
  profile: ElementalProfile,
  sustainableTarget: ElementalProfile,
  globalAvg: ElementalProfile,
): ImpactMetrics {
  const throughput = profile.annualThroughput_tonnes;
  const targetThroughput = sustainableTarget.annualThroughput_tonnes;
  const globalThroughput = globalAvg.annualThroughput_tonnes;

  const earths_needed = targetThroughput > 0 ? throughput / targetThroughput : 1;

  // Sigmoid mapping for percentile: global avg = 50th, 2x global = ~85th, 0.5x global = ~15th
  const ratio = globalThroughput > 0 ? throughput / globalThroughput : 1;
  const global_percentile = Math.min(99, Math.max(1, 50 + 35 * Math.tanh((ratio - 1) * 1.5)));

  const overshoot_day = overshootDay(targetThroughput, throughput);
  const total_co2e_tonnes = (profile.carbon?.total_co2e_kg_per_year ?? 0) / 1000;
  const pct_above_global_avg = globalThroughput > 0
    ? ((throughput - globalThroughput) / globalThroughput) * 100
    : 0;

  return { earths_needed, global_percentile, overshoot_day, total_co2e_tonnes, pct_above_global_avg };
}

export function formatMass(kg: number): string {
  if (kg >= 1e12) return `${(kg / 1e12).toFixed(1)}T tonnes`;
  if (kg >= 1e9) return `${(kg / 1e9).toFixed(1)}B tonnes`;
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(1)}M tonnes`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tonnes`;
  if (kg >= 1) return `${kg.toFixed(1)} kg`;
  if (kg >= 0.001) return `${(kg * 1000).toFixed(1)} g`;
  return `${(kg * 1e6).toFixed(1)} mg`;
}
