import { NextRequest, NextResponse } from 'next/server';

// eGRID subregion carbon intensity (kg CO2 per kWh) — EPA eGRID 2022 data
const GRID_CARBON_INTENSITY: Record<string, number> = {
  'CAMX': 0.22, 'NWPP': 0.30, 'ERCT': 0.39, 'NYCW': 0.25, 'NYLI': 0.30,
  'NYUP': 0.12, 'FRCC': 0.40, 'RFCM': 0.48, 'RFCE': 0.30, 'RFCW': 0.55,
  'SRSO': 0.42, 'SRVC': 0.35, 'NEWE': 0.20, 'AZNM': 0.41, 'RMPA': 0.52,
  'MROW': 0.44, 'MROE': 0.50, 'SRMW': 0.62, 'SRMV': 0.42, 'SRTV': 0.40,
  'SPSO': 0.45, 'SPNO': 0.51, 'HIOA': 0.65, 'AKGD': 0.45,
};

// Map US state abbreviations to eGRID subregions for grid mix context
const STATE_TO_REGION: Record<string, string> = {
  'CA': 'CAMX', 'WA': 'NWPP', 'OR': 'NWPP', 'TX': 'ERCT', 'NY': 'NYCW',
  'FL': 'FRCC', 'IL': 'RFCM', 'PA': 'RFCE', 'OH': 'RFCW', 'GA': 'SRSO',
  'NC': 'SRVC', 'MI': 'RFCM', 'NJ': 'RFCE', 'VA': 'SRVC', 'MA': 'NEWE',
  'AZ': 'AZNM', 'CO': 'RMPA', 'MN': 'MROW', 'WI': 'MROE', 'MO': 'SRMW',
  'MD': 'RFCE', 'IN': 'RFCW', 'TN': 'SRTV', 'CT': 'NEWE', 'SC': 'SRVC',
  'AL': 'SRSO', 'LA': 'SRMV', 'KY': 'SRTV', 'OK': 'SPSO', 'IA': 'MROW',
  'UT': 'NWPP', 'NV': 'NWPP', 'KS': 'SPNO', 'AR': 'SRMV', 'MS': 'SRMV',
  'NE': 'MROW', 'NM': 'AZNM', 'WV': 'RFCW', 'ID': 'NWPP', 'HI': 'HIOA',
  'ME': 'NEWE', 'NH': 'NEWE', 'RI': 'NEWE', 'MT': 'NWPP', 'DE': 'RFCE',
  'SD': 'MROW', 'ND': 'MROW', 'AK': 'AKGD', 'VT': 'NEWE', 'WY': 'RMPA',
  'DC': 'RFCE',
};

// Country code to our data country code mapping
const COUNTRY_MAP: Record<string, string> = {
  'US': 'US', 'CA': 'CA', 'GB': 'GB', 'DE': 'DE', 'FR': 'FR', 'JP': 'JP',
  'AU': 'AU', 'BR': 'BR', 'IN': 'IN', 'CN': 'CN', 'MX': 'MX', 'KR': 'KR',
  'IT': 'IT', 'ES': 'ES', 'NL': 'NL', 'SE': 'SE', 'NO': 'NO', 'CH': 'CH',
  'AT': 'AT', 'BE': 'BE', 'DK': 'DK', 'FI': 'FI', 'IE': 'IE', 'NZ': 'NZ',
  'SG': 'SG', 'IL': 'IL', 'PL': 'PL', 'CZ': 'CZ', 'PT': 'PT', 'GR': 'GR',
  'RO': 'RO', 'HU': 'HU', 'CL': 'CL', 'CO': 'CO', 'AR': 'AR', 'PE': 'PE',
  'PH': 'PH', 'TH': 'TH', 'VN': 'VN', 'ID': 'ID', 'MY': 'MY', 'PK': 'PK',
  'BD': 'BD', 'NG': 'NG', 'EG': 'EG', 'ZA': 'ZA', 'KE': 'KE', 'SA': 'SA',
  'AE': 'AE', 'TR': 'TR', 'RU': 'RU', 'UA': 'UA',
};

interface AutoProfile {
  country?: string;
  state?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  income?: number;
  housing?: 'apartment' | 'house' | 'large_house';
  transport?: 'transit' | 'car' | 'suv' | 'frequent_flyer';
  householdSize?: number;
  medianRooms?: number;
  commuteMode?: string;
  heatingFuel?: string;
  gridRegion?: string;
  gridCarbonIntensity?: number; // kg CO2 per kWh
  confidence: number;
  sources: string[];
}

export async function GET(request: NextRequest) {
  const profile: AutoProfile = { confidence: 0, sources: [] };

  // Step 1: IP Geolocation
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || '';

    // Use ip-api.com (free, no key needed, 45 req/min)
    const geoUrl = ip && ip !== '127.0.0.1' && ip !== '::1'
      ? `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,isp,query`
      : `http://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,isp,query`;

    const geoRes = await fetch(geoUrl, { next: { revalidate: 3600 } });
    const geo = await geoRes.json();

    if (geo.status === 'success') {
      profile.country = COUNTRY_MAP[geo.countryCode] || geo.countryCode;
      profile.state = geo.region;
      profile.city = geo.city;
      profile.zip = geo.zip;
      profile.lat = geo.lat;
      profile.lon = geo.lon;
      profile.confidence += 0.15;
      profile.sources.push('ip-geolocation');

      // Map state to grid region
      if (geo.countryCode === 'US' && geo.region) {
        profile.gridRegion = STATE_TO_REGION[geo.region];
        if (profile.gridRegion && GRID_CARBON_INTENSITY[profile.gridRegion]) {
          profile.gridCarbonIntensity = GRID_CARBON_INTENSITY[profile.gridRegion];
        }
      }
    }
  } catch (e) {
    // IP geolocation failed, continue without it
  }

  // Step 2: Census ACS data (if US zip code available)
  if (profile.country === 'US' && profile.zip) {
    try {
      // Census ACS 5-year: median income, household size, median rooms, commute mode, heating fuel
      const censusVars = [
        'B19013_001E', // median household income
        'B11001_001E', // total households (for avg size calc)
        'B01003_001E', // total population
        'B25018_001E', // median rooms
        'B25035_001E', // median year built
        'B08301_001E', // total commuters
        'B08301_003E', // drove alone
        'B08301_010E', // public transit
        'B08301_019E', // walked
        'B25040_002E', // gas heating
        'B25040_003E', // electric heating
        'B25040_005E', // fuel oil heating
        'B25044_003E', // 1 vehicle available
        'B25044_004E', // 2 vehicles
        'B25044_005E', // 3+ vehicles
      ].join(',');

      const censusUrl = `https://api.census.gov/data/2022/acs/acs5?get=${censusVars}&for=zip%20code%20tabulation%20area:${profile.zip}`;
      const censusRes = await fetch(censusUrl, { next: { revalidate: 86400 } });

      if (censusRes.ok) {
        const censusData = await censusRes.json();
        if (censusData.length > 1) {
          const row = censusData[1]; // first row is headers

          const medianIncome = parseInt(row[0]) || 0;
          const totalHouseholds = parseInt(row[1]) || 1;
          const totalPop = parseInt(row[2]) || 1;
          const medianRooms = parseFloat(row[3]) || 5;
          const medianYearBuilt = parseInt(row[4]) || 1980;
          const totalCommuters = parseInt(row[5]) || 1;
          const droveAlone = parseInt(row[6]) || 0;
          const publicTransit = parseInt(row[7]) || 0;
          const walked = parseInt(row[8]) || 0;
          const gasHeat = parseInt(row[9]) || 0;
          const electricHeat = parseInt(row[10]) || 0;
          const fuelOilHeat = parseInt(row[11]) || 0;
          const oneVehicle = parseInt(row[12]) || 0;
          const twoVehicle = parseInt(row[13]) || 0;
          const threeVehicle = parseInt(row[14]) || 0;

          // Income
          if (medianIncome > 0) {
            profile.income = medianIncome;
            profile.confidence += 0.10;
            profile.sources.push('census-income');
          }

          // Household size
          profile.householdSize = Math.round((totalPop / totalHouseholds) * 10) / 10;

          // Median rooms → housing type
          profile.medianRooms = medianRooms;
          if (medianRooms <= 4) {
            profile.housing = 'apartment';
          } else if (medianRooms <= 6) {
            profile.housing = 'house';
          } else {
            profile.housing = 'large_house';
          }
          profile.confidence += 0.08;
          profile.sources.push('census-housing');

          // Commute mode → transport type
          const carPct = droveAlone / totalCommuters;
          const transitPct = publicTransit / totalCommuters;
          const walkPct = walked / totalCommuters;

          if (transitPct > 0.3 || walkPct > 0.2) {
            profile.transport = 'transit';
          } else if (carPct > 0.8) {
            profile.transport = 'car';
          } else {
            profile.transport = 'car';
          }
          profile.commuteMode = `${Math.round(carPct * 100)}% drive, ${Math.round(transitPct * 100)}% transit, ${Math.round(walkPct * 100)}% walk`;
          profile.confidence += 0.08;
          profile.sources.push('census-commute');

          // Heating fuel
          const totalHeat = gasHeat + electricHeat + fuelOilHeat;
          if (totalHeat > 0) {
            if (gasHeat > electricHeat && gasHeat > fuelOilHeat) profile.heatingFuel = 'natural_gas';
            else if (electricHeat > gasHeat) profile.heatingFuel = 'electric';
            else profile.heatingFuel = 'fuel_oil';
            profile.sources.push('census-heating');
          }

          profile.confidence += 0.05;
        }
      }
    } catch (e) {
      // Census API failed, continue
    }
  }

  return NextResponse.json(profile);
}
