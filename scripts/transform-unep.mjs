/**
 * Transform UNEP IRP Global Material Flows CSV into our app's JSON format.
 * Extracts the most recent year of Domestic Material Consumption (DMC)
 * per country per material category, in tonnes.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'src', 'data', 'unep-material-flows.csv');
const outPath = join(__dirname, '..', 'src', 'data', 'country-footprints-real.json');

// ISO 3166 country name → 2-letter code mapping (most common ones)
const COUNTRY_CODES = {
  'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Angola': 'AO',
  'Argentina': 'AR', 'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT',
  'Azerbaijan': 'AZ', 'Bahamas': 'BS', 'Bahrain': 'BH', 'Bangladesh': 'BD',
  'Belarus': 'BY', 'Belgium': 'BE', 'Benin': 'BJ', 'Bolivia': 'BO',
  'Bosnia and Herzegovina': 'BA', 'Botswana': 'BW', 'Brazil': 'BR',
  'Brunei Darussalam': 'BN', 'Bulgaria': 'BG', 'Burkina Faso': 'BF',
  'Burundi': 'BI', 'Cambodia': 'KH', 'Cameroon': 'CM', 'Canada': 'CA',
  'Central African Republic': 'CF', 'Chad': 'TD', 'Chile': 'CL',
  'China': 'CN', 'Colombia': 'CO', 'Congo': 'CG',
  'Democratic Republic of the Congo': 'CD', 'Costa Rica': 'CR',
  "Cote d'Ivoire": 'CI', 'Croatia': 'HR', 'Cuba': 'CU', 'Cyprus': 'CY',
  'Czech Republic': 'CZ', 'Denmark': 'DK', 'Dominican Republic': 'DO',
  'Ecuador': 'EC', 'Egypt': 'EG', 'El Salvador': 'SV', 'Estonia': 'EE',
  'Ethiopia': 'ET', 'Finland': 'FI', 'France': 'FR', 'Gabon': 'GA',
  'Gambia': 'GM', 'Georgia': 'GE', 'Germany': 'DE', 'Ghana': 'GH',
  'Greece': 'GR', 'Guatemala': 'GT', 'Guinea': 'GN', 'Haiti': 'HT',
  'Honduras': 'HN', 'Hungary': 'HU', 'Iceland': 'IS', 'India': 'IN',
  'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE',
  'Israel': 'IL', 'Italy': 'IT', 'Jamaica': 'JM', 'Japan': 'JP',
  'Jordan': 'JO', 'Kazakhstan': 'KZ', 'Kenya': 'KE',
  'Korea Republic of': 'KR', "Korea  Republic of": 'KR',
  'Kuwait': 'KW', 'Kyrgyzstan': 'KG', 'Lao PDR': 'LA',
  'Latvia': 'LV', 'Lebanon': 'LB', 'Libya': 'LY', 'Lithuania': 'LT',
  'Luxembourg': 'LU', 'Madagascar': 'MG', 'Malawi': 'MW', 'Malaysia': 'MY',
  'Mali': 'ML', 'Mauritania': 'MR', 'Mauritius': 'MU', 'Mexico': 'MX',
  'Moldova': 'MD', 'Mongolia': 'MN', 'Morocco': 'MA', 'Mozambique': 'MZ',
  'Myanmar': 'MM', 'Namibia': 'NA', 'Nepal': 'NP', 'Netherlands': 'NL',
  'New Zealand': 'NZ', 'Nicaragua': 'NI', 'Niger': 'NE', 'Nigeria': 'NG',
  'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK', 'Panama': 'PA',
  'Papua New Guinea': 'PG', 'Paraguay': 'PY', 'Peru': 'PE',
  'Philippines': 'PH', 'Poland': 'PL', 'Portugal': 'PT', 'Qatar': 'QA',
  'Romania': 'RO', 'Russian Federation': 'RU', 'Rwanda': 'RW',
  'Saudi Arabia': 'SA', 'Senegal': 'SN', 'Serbia': 'RS',
  'Sierra Leone': 'SL', 'Singapore': 'SG', 'Slovakia': 'SK',
  'Slovenia': 'SI', 'Somalia': 'SO', 'South Africa': 'ZA', 'Spain': 'ES',
  'Sri Lanka': 'LK', 'Sudan': 'SD', 'Sweden': 'SE', 'Switzerland': 'CH',
  'Syria': 'SY', 'Taiwan': 'TW', 'Tajikistan': 'TJ', 'Tanzania': 'TZ',
  'Thailand': 'TH', 'Togo': 'TG', 'Trinidad and Tobago': 'TT',
  'Tunisia': 'TN', 'Turkey': 'TR', 'Turkmenistan': 'TM', 'Uganda': 'UG',
  'Ukraine': 'UA', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
  'United States': 'US', 'United States of America': 'US', 'Uruguay': 'UY', 'Uzbekistan': 'UZ',
  'Venezuela': 'VE', 'Viet Nam': 'VN', 'Yemen': 'YE', 'Zambia': 'ZM',
  'Zimbabwe': 'ZW', 'World': 'GLOBAL',
  'Ireland': 'IE', 'Czechia': 'CZ',
};

// World Bank population estimates 2023 (millions) for major countries
const POPULATIONS = {
  'AF': 41, 'AL': 2.8, 'DZ': 45, 'AO': 36, 'AR': 46, 'AM': 3, 'AU': 26,
  'AT': 9.1, 'AZ': 10, 'BD': 173, 'BY': 9.2, 'BE': 11.7, 'BJ': 13,
  'BO': 12, 'BA': 3.2, 'BW': 2.6, 'BR': 216, 'BG': 6.5, 'BF': 23,
  'BI': 13, 'KH': 17, 'CM': 28, 'CA': 40, 'CF': 5.5, 'TD': 18,
  'CL': 19.5, 'CN': 1412, 'CO': 52, 'CG': 6, 'CD': 102, 'CR': 5.2,
  'CI': 28, 'HR': 3.9, 'CU': 11, 'CY': 1.3, 'CZ': 10.8, 'DK': 5.9,
  'DO': 11, 'EC': 18, 'EG': 112, 'SV': 6.3, 'EE': 1.4, 'ET': 126,
  'FI': 5.6, 'FR': 68, 'GA': 2.4, 'GM': 2.7, 'GE': 3.7, 'DE': 84,
  'GH': 34, 'GR': 10.4, 'GT': 18, 'GN': 14, 'HT': 12, 'HN': 10,
  'HU': 9.6, 'IS': 0.38, 'IN': 1440, 'ID': 277, 'IR': 88, 'IQ': 44,
  'IE': 5.1, 'IL': 9.8, 'IT': 59, 'JM': 2.8, 'JP': 124, 'JO': 11,
  'KZ': 20, 'KE': 55, 'KR': 52, 'KW': 4.3, 'KG': 7, 'LA': 7.5,
  'LV': 1.8, 'LB': 5.5, 'LY': 7, 'LT': 2.9, 'LU': 0.66, 'MG': 30,
  'MW': 20, 'MY': 34, 'ML': 23, 'MR': 4.9, 'MU': 1.3, 'MX': 129,
  'MD': 2.5, 'MN': 3.4, 'MA': 37, 'MZ': 33, 'MM': 55, 'NA': 2.6,
  'NP': 31, 'NL': 17.7, 'NZ': 5.2, 'NI': 7, 'NE': 27, 'NG': 224,
  'NO': 5.5, 'OM': 4.6, 'PK': 240, 'PA': 4.4, 'PG': 10, 'PY': 6.8,
  'PE': 34, 'PH': 117, 'PL': 37, 'PT': 10.3, 'QA': 2.7, 'RO': 19,
  'RU': 144, 'RW': 14, 'SA': 37, 'SN': 18, 'RS': 6.6, 'SL': 8.6,
  'SG': 6, 'SK': 5.4, 'SI': 2.1, 'SO': 18, 'ZA': 60, 'ES': 48,
  'LK': 22, 'SD': 48, 'SE': 10.5, 'CH': 8.8, 'SY': 23, 'TW': 23.6,
  'TJ': 10, 'TZ': 67, 'TH': 72, 'TG': 9, 'TT': 1.5, 'TN': 12,
  'TR': 86, 'TM': 6.5, 'UG': 49, 'UA': 37, 'AE': 10, 'GB': 68,
  'US': 335, 'UY': 3.4, 'UZ': 36, 'VE': 28, 'VN': 100, 'YE': 34,
  'ZM': 20, 'ZW': 16, 'GLOBAL': 8100,
};

// Parse CSV
const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter(l => l.trim());
const header = lines[0].split(',').map(h => h.replace(/"/g, ''));
const yearCols = header.slice(5); // "1970", "1971", ...
const latestYear = yearCols[yearCols.length - 1]; // "2019"
const latestIdx = header.indexOf(latestYear);

// We want: DMC per country per primary category (Biomass, Fossil fuels, Metal ores, Non-metallic minerals)
const PRIMARY_CATS = ['Biomass', 'Fossil fuels', 'Metal ores', 'Non-metallic minerals'];
const CAT_MAP = {
  'Biomass': 'biomass',
  'Fossil fuels': 'fossil_fuels',
  'Metal ores': 'metals',
  'Non-metallic minerals': 'minerals',
};

// Accumulate data
const countryData = {};

for (let i = 1; i < lines.length; i++) {
  // Parse CSV line (handles quoted fields)
  const match = lines[i].match(/(".*?"|[^,]+)/g);
  if (!match) continue;
  const fields = match.map(f => f.replace(/"/g, ''));

  const country = fields[0];
  const category = fields[1];
  const flowName = fields[2];

  // Only want Domestic Material Consumption for primary categories
  if (flowName !== 'Domestic Material Consumption') continue;
  if (!PRIMARY_CATS.includes(category)) continue;

  const code = COUNTRY_CODES[country];
  if (!code) continue; // skip countries we can't map

  // Get latest year value (tonnes)
  const value = parseFloat(fields[latestIdx]) || 0;
  const tonnes = value; // already in tonnes

  if (!countryData[code]) {
    countryData[code] = {
      name: country,
      population: (POPULATIONS[code] || 10) * 1e6,
      biomass: 0,
      metals: 0,
      minerals: 0,
      fossil_fuels: 0,
    };
  }

  countryData[code][CAT_MAP[category]] = tonnes;
}

// Calculate per-capita and totals
for (const [code, data] of Object.entries(countryData)) {
  const totalDMC = data.biomass + data.metals + data.minerals + data.fossil_fuels;
  const pop = data.population;

  data.material_footprint_tonnes_per_capita = Math.round((totalDMC / pop) * 10) / 10;
  // Supply chain multiplier: roughly 2-3x DMC for developed, 1.5x for developing
  const devMultiplier = data.material_footprint_tonnes_per_capita > 15 ? 2.5 : 1.8;
  data.total_with_supply_chain = Math.round(data.material_footprint_tonnes_per_capita * devMultiplier * 10) / 10;

  // Convert absolute tonnes to per-capita tonnes for the category breakdown
  data.biomass = Math.round((data.biomass / pop) * 100) / 100;
  data.metals = Math.round((data.metals / pop) * 100) / 100;
  data.minerals = Math.round((data.minerals / pop) * 100) / 100;
  data.fossil_fuels = Math.round((data.fossil_fuels / pop) * 100) / 100;
  data.population = Math.round(pop);
}

// Add GLOBAL entry if we have World data
if (countryData['GLOBAL']) {
  countryData['GLOBAL'].name = 'Earth';
}

console.log(`Processed ${Object.keys(countryData).length} countries`);
console.log('Sample (US):', JSON.stringify(countryData['US'], null, 2));
console.log('Sample (IN):', JSON.stringify(countryData['IN'], null, 2));
console.log('Sample (GLOBAL):', JSON.stringify(countryData['GLOBAL'], null, 2));

writeFileSync(outPath, JSON.stringify(countryData, null, 2));
console.log(`\nWritten to ${outPath}`);
