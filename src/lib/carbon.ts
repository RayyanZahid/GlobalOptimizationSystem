import { MaterialCategory } from './types';

// kg CO2-equivalent per kg of material consumed
export const CARBON_INTENSITY: Record<MaterialCategory, number> = {
  biomass: 0.5,       // agriculture, land use change
  metals: 3.0,        // smelting, mining energy
  minerals: 0.1,      // quarrying (cement is higher but averaged)
  fossil_fuels: 3.1,  // combustion
};

export interface CarbonFootprint {
  total_co2e_kg_per_year: number;
  by_category: Record<MaterialCategory, number>;
  breakdown: {
    co2_kg: number;   // fossil fuel combustion + industrial
    ch4_kg: number;   // livestock, agriculture
    n2o_kg: number;   // fertilizers
    h2o_kg: number;   // metabolic water
  };
}

export interface MoleculeData {
  formula: string;
  name: string;
  mass_kg_per_year: number;
  color: string;
  category: 'emission' | 'biological' | 'mineral';
}

export interface MolecularComposition {
  molecules: MoleculeData[];
}

export function computeCarbonFootprint(flows: {
  inbound: Record<MaterialCategory, number>;
}): CarbonFootprint {
  const by_category: Record<MaterialCategory, number> = {
    biomass: flows.inbound.biomass * CARBON_INTENSITY.biomass,
    metals: flows.inbound.metals * CARBON_INTENSITY.metals,
    minerals: flows.inbound.minerals * CARBON_INTENSITY.minerals,
    fossil_fuels: flows.inbound.fossil_fuels * CARBON_INTENSITY.fossil_fuels,
  };

  const total_co2e_kg_per_year = by_category.biomass + by_category.metals + by_category.minerals + by_category.fossil_fuels;

  return {
    total_co2e_kg_per_year,
    by_category,
    breakdown: {
      co2_kg: flows.inbound.fossil_fuels * 3.1 + flows.inbound.minerals * 0.08,
      ch4_kg: flows.inbound.biomass * 0.02,     // ~2% of biomass throughput as methane
      n2o_kg: flows.inbound.biomass * 0.003,     // fertilizer-derived
      h2o_kg: flows.inbound.biomass * 0.6,       // metabolic water
    },
  };
}

export function computeMolecularComposition(
  flows: { inbound: Record<MaterialCategory, number> },
  carbon: CarbonFootprint
): MolecularComposition {
  const b = flows.inbound.biomass;
  const m = flows.inbound.metals;
  const n = flows.inbound.minerals;

  const molecules: MoleculeData[] = ([
    // Emissions
    { formula: 'CO₂', name: 'Carbon Dioxide', mass_kg_per_year: carbon.breakdown.co2_kg, color: '#ff0040', category: 'emission' as const },
    { formula: 'CH₄', name: 'Methane', mass_kg_per_year: carbon.breakdown.ch4_kg, color: '#ff6b00', category: 'emission' as const },
    { formula: 'N₂O', name: 'Nitrous Oxide', mass_kg_per_year: carbon.breakdown.n2o_kg, color: '#ffff00', category: 'emission' as const },
    { formula: 'H₂O', name: 'Water (metabolic)', mass_kg_per_year: carbon.breakdown.h2o_kg, color: '#00f0ff', category: 'biological' as const },
    // Biological
    { formula: 'C₆H₁₂O₆', name: 'Glucose (carbs)', mass_kg_per_year: b * 0.20, color: '#00ff88', category: 'biological' as const },
    { formula: 'R-NH₂', name: 'Amino Acids (protein)', mass_kg_per_year: b * 0.15, color: '#00ff88', category: 'biological' as const },
    { formula: 'Lipids', name: 'Fats & Oils', mass_kg_per_year: b * 0.10, color: '#00ff88', category: 'biological' as const },
    { formula: 'Cellulose', name: 'Plant Fiber', mass_kg_per_year: b * 0.12, color: '#00cc66', category: 'biological' as const },
    // Minerals
    { formula: 'SiO₂', name: 'Silica (sand/glass)', mass_kg_per_year: n * 0.40, color: '#00f0ff', category: 'mineral' as const },
    { formula: 'CaCO₃', name: 'Calcium Carbonate', mass_kg_per_year: n * 0.30, color: '#00ccff', category: 'mineral' as const },
    { formula: 'Fe₂O₃', name: 'Iron Oxide', mass_kg_per_year: m * 0.25, color: '#ff6b00', category: 'mineral' as const },
    { formula: 'Al₂O₃', name: 'Alumina', mass_kg_per_year: m * 0.12, color: '#ff6b00', category: 'mineral' as const },
    { formula: 'NaCl', name: 'Sodium Chloride', mass_kg_per_year: n * 0.015, color: '#b000ff', category: 'mineral' as const },
  ] satisfies MoleculeData[]).filter(mol => mol.mass_kg_per_year > 0);

  molecules.sort((a, b) => b.mass_kg_per_year - a.mass_kg_per_year);

  return { molecules };
}
