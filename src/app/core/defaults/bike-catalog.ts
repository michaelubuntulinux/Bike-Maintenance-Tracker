/** Catálogo local de marcas y modelos MTB frecuentes (seleccionables + texto libre). */
export interface BrandModels {
  brand: string;
  models: string[];
}

export const BIKE_BRAND_CATALOG: BrandModels[] = [
  {
    brand: 'Merida',
    models: [
      'One-Twenty',
      'One-Forty',
      'One-Sixty',
      'Ninety-Six',
      'Big Nine',
      'Big Trail',
      'Big Seven',
      'eOne-Sixty',
      'eOne-Forty',
    ],
  },
  {
    brand: 'Norco',
    models: [
      'Fluid FS',
      'Sight',
      'Optic',
      'Range',
      'Revolver',
      'Storm',
      'Torrent',
      'Fluid HT',
      'Charger',
    ],
  },
  {
    brand: 'Trek',
    models: [
      'Top Fuel',
      'Fuel EX',
      'Slash',
      'Remedy',
      'Session',
      'Supercaliber',
      'Procaliber',
      'Roscoe',
      'Marlin',
      'X-Caliber',
      'Rail',
    ],
  },
  {
    brand: 'Specialized',
    models: [
      'Stumpjumper',
      'Stumpjumper EVO',
      'Epic',
      'Epic EVO',
      'Epic World Cup',
      'Enduro',
      'Status',
      'Demo',
      'Rockhopper',
      'Chisel',
      'Turbo Levo',
      'Kenevo',
    ],
  },
  {
    brand: 'Giant',
    models: [
      'Trance',
      'Trance X',
      'Anthem',
      'Reign',
      'Stance',
      'Talon',
      'Fathom',
      'Tempt',
      'Yukon',
      'Glory',
      'Intrigue',
    ],
  },
  {
    brand: 'Santa Cruz',
    models: [
      'Hightower',
      'Tallboy',
      'Bronson',
      'Nomad',
      'Megatower',
      'Blur',
      'Chameleon',
      '5010',
      'Bullit',
    ],
  },
  {
    brand: 'Canyon',
    models: [
      'Neuron',
      'Spectral',
      'Strive',
      'Torque',
      'Lux',
      'Grand Canyon',
      'Exceed',
      'Sender',
    ],
  },
  {
    brand: 'Orbea',
    models: ['Occam', 'Rallon', 'Oiz', 'Alma', 'Laufey', 'Rise', 'Wild'],
  },
  {
    brand: 'Scott',
    models: ['Spark', 'Genius', 'Ransom', 'Scale', 'Gambler', 'Voltage', 'Lumen'],
  },
  {
    brand: 'Cannondale',
    models: ['Habit', 'Jekyll', 'Scalpel', 'Trail', 'Rush', 'Moterra'],
  },
  {
    brand: 'Cube',
    models: ['Stereo', 'Stereo Hybrid', 'Aim', 'Reaction', 'Two15', 'Elite'],
  },
  {
    brand: 'YT',
    models: ['Jeffsy', 'Capra', 'Izzo', 'Tues', 'Decoy'],
  },
  {
    brand: 'Commencal',
    models: ['Meta TR', 'Meta SX', 'Clash', 'Supreme', 'Meta HT'],
  },
  {
    brand: 'Yeti',
    models: ['SB140', 'SB160', 'SB120', 'SB165', 'ARC', '160E'],
  },
  {
    brand: 'Pivot',
    models: ['Trail 429', 'Switchblade', 'Firebird', 'Mach 4 SL', 'Mach 6'],
  },
  {
    brand: 'Ibis',
    models: ['Ripmo', 'Ripley', 'Mojo', 'Exie', 'HD'],
  },
  {
    brand: 'BMC',
    models: ['Fourstroke', 'Speedfox', 'Twostroke', 'Urge'],
  },
  {
    brand: 'Cervelo',
    models: ['ZFS-5', 'ZHT-5'],
  },
];

export const BIKE_BRANDS: string[] = BIKE_BRAND_CATALOG.map((b) => b.brand);

export function modelsForBrand(brand: string): string[] {
  const normalized = brand.trim().toLowerCase();
  const entry = BIKE_BRAND_CATALOG.find((b) => b.brand.toLowerCase() === normalized);
  return entry?.models ?? [];
}

export function filterBrands(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return BIKE_BRANDS;
  }
  return BIKE_BRANDS.filter((b) => b.toLowerCase().includes(q));
}

export function filterModels(brand: string, query: string): string[] {
  const models = modelsForBrand(brand);
  const q = query.trim().toLowerCase();
  if (!q) {
    return models;
  }
  return models.filter((m) => m.toLowerCase().includes(q));
}
