export type ElementSymbol =
  | 'H' | 'He' | 'Li' | 'Be' | 'B' | 'C' | 'N' | 'O' | 'F' | 'Ne'
  | 'Na' | 'Mg' | 'Al' | 'Si' | 'P' | 'S' | 'Cl' | 'Ar' | 'K' | 'Ca'
  | 'Sc' | 'Ti' | 'V' | 'Cr' | 'Mn' | 'Fe' | 'Co' | 'Ni' | 'Cu' | 'Zn'
  | 'Ga' | 'Ge' | 'As' | 'Se' | 'Br' | 'Kr' | 'Rb' | 'Sr' | 'Y' | 'Zr'
  | 'Nb' | 'Mo' | 'Tc' | 'Ru' | 'Rh' | 'Pd' | 'Ag' | 'Cd' | 'In' | 'Sn'
  | 'Sb' | 'Te' | 'I' | 'Xe' | 'Cs' | 'Ba' | 'La' | 'Ce' | 'Pr' | 'Nd'
  | 'Pm' | 'Sm' | 'Eu' | 'Gd' | 'Tb' | 'Dy' | 'Ho' | 'Er' | 'Tm' | 'Yb'
  | 'Lu' | 'Hf' | 'Ta' | 'W' | 'Re' | 'Os' | 'Ir' | 'Pt' | 'Au' | 'Hg'
  | 'Tl' | 'Pb' | 'Bi' | 'Po' | 'At' | 'Rn' | 'Fr' | 'Ra' | 'Ac' | 'Th'
  | 'Pa' | 'U' | 'Np' | 'Pu' | 'Am' | 'Cm' | 'Bk' | 'Cf' | 'Es' | 'Fm'
  | 'Md' | 'No' | 'Lr' | 'Rf' | 'Db' | 'Sg' | 'Bh' | 'Hs' | 'Mt' | 'Ds'
  | 'Rg' | 'Cn' | 'Nh' | 'Fl' | 'Mc' | 'Lv' | 'Ts' | 'Og';

export type Scope = 'person' | 'product' | 'city' | 'country' | 'planet';

export type MaterialCategory = 'biomass' | 'metals' | 'minerals' | 'fossil_fuels';

export interface ElementData {
  symbol: ElementSymbol;
  name: string;
  number: number;
  mass: number; // atomic mass
  category: string;
  row: number;
  col: number;
  color: string; // neon color for this category
}

export interface ElementContribution {
  mass_kg: number;
  percentage: number;
  confidence: number;
}

export interface MaterialFlows {
  inbound: Record<MaterialCategory, number>; // kg/year
  outbound: Record<MaterialCategory, number>;
}

export interface ElementalProfile {
  scope: Scope;
  name: string;
  confidence: number;
  population?: number;
  composition: Partial<Record<ElementSymbol, ElementContribution>>;
  flows: MaterialFlows;
  knownInputs: string[];
  totalMass_kg: number;
  annualThroughput_tonnes: number;
  carbon?: import('./carbon').CarbonFootprint;
  molecules?: import('./carbon').MolecularComposition;
  biologicalThroughput?: {
    air_kg_per_year: number;
    water_kg_per_year: number;
    food_kg_per_year: number;
  };
}

export interface UserInputs {
  country?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  weight_kg?: number;
  income?: number;
  diet?: 'vegan' | 'vegetarian' | 'omnivore' | 'heavy_meat';
  housing?: 'apartment' | 'house' | 'large_house';
  transport?: 'transit' | 'car' | 'suv' | 'frequent_flyer';
  energy_source?: 'gas' | 'electric' | 'heat_pump' | 'oil';
  monthly_kwh?: number;
  miles_per_week?: number;
  flights_per_year?: number;
  food_waste?: 'none' | 'some' | 'significant';
  shopping_frequency?: 'minimal' | 'average' | 'frequent';
}

export interface ImpactMetrics {
  earths_needed: number;
  global_percentile: number;    // 0-100
  overshoot_day: string;        // "March 14" format, or "never"
  total_co2e_tonnes: number;
  pct_above_global_avg: number;
}

export interface ScaleData {
  scope: Scope;
  label: string;
  population: number;
  multiplier: number;
}

export interface FunFact {
  element: ElementSymbol;
  fact: string;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  summary: string;
  currentRole: {
    title: string;
    company: string;
    industry: string;
  };
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
  }>;
  skills: string[];
}

export interface PersonAnalysis {
  profile: LinkedInProfile;
  lifestyleSignals: {
    estimatedIncome: number;
    incomeConfidence: number;
    inferredCountry: string;
    inferredHousing: UserInputs['housing'];
    inferredTransport: UserInputs['transport'];
    inferredDiet: UserInputs['diet'];
    inferredShopping: UserInputs['shopping_frequency'];
    inferredFlightsPerYear: number;
    reasoning: string[];
  };
  mappedInputs: UserInputs;
}

// ─── Multi-Source Person Intelligence ────────────────────────────────────────

export type SourceType =
  | 'linkedin'
  | 'google'
  | 'company'
  | 'personal_site'
  | 'twitter'
  | 'github'
  | 'news'
  | 'property'
  | 'salary';

export type SourceStatus = 'pending' | 'scraping' | 'analyzing' | 'done' | 'failed';

export interface SourceResult {
  type: SourceType;
  status: SourceStatus;
  url?: string;
  label: string;
  rawLength?: number;
  findings?: string[];
  error?: string;
}

export interface WebPresence {
  linkedin?: string;
  twitter?: string;
  github?: string;
  personalSite?: string;
  companyPage?: string;
  otherUrls: string[];
}

export interface ConsumptionSignal {
  category: string;
  signal: string;
  value: string;
  source: SourceType;
  confidence: number;
}

export interface PersonDossier {
  // Identity
  name: string;
  headline: string;
  location: string;
  photoInitial: string;
  summary: string;

  // Professional
  currentRole: {
    title: string;
    company: string;
    industry: string;
    companySize?: string;
    companyRevenue?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
  }>;
  skills: string[];

  // Web presence
  webPresence: WebPresence;

  // Inferred signals from ALL sources
  signals: ConsumptionSignal[];

  // Synthesized lifestyle (updated as sources arrive)
  lifestyle: {
    estimatedIncome: number;
    incomeConfidence: number;
    estimatedNetWorth?: number;
    inferredCountry: string;
    inferredCity?: string;
    inferredHousing: UserInputs['housing'];
    inferredTransport: UserInputs['transport'];
    inferredDiet: UserInputs['diet'];
    inferredShopping: UserInputs['shopping_frequency'];
    inferredFlightsPerYear: number;
    inferredEnergySource?: UserInputs['energy_source'];
    techFootprint?: 'low' | 'moderate' | 'high';
    travelIntensity?: 'sedentary' | 'moderate' | 'heavy' | 'extreme';
    sustainabilityAwareness?: 'low' | 'moderate' | 'high';
    reasoning: string[];
  };

  // Direct mapping to footprint model
  mappedInputs: UserInputs;

  // Meta
  sources: SourceResult[];
  overallConfidence: number;
  lastUpdated: string;
}
