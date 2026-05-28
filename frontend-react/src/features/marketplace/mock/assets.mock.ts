export type AssetStatus =
  | 'in_production'
  | 'financing'
  | 'financing_complete'
  | 'coming_soon'
  | 'cancelled';

export type AssetType =
  | 'solar_ground'
  | 'solar_canopy'
  | 'solar_industrial'
  | 'solar_residential'
  | 'battery_storage'
  | 'ev_charging';

export interface Asset {
  id:                 string;
  slug:               string;
  name:               string;
  countryCode:        string;
  countryName:        string;
  region:             string;
  assetType:          AssetType;
  status:             AssetStatus;
  installedPower:     string;          // "5.2 MWc" ou "800 kWh"
  targetYieldRate:    number;          // 0.078 = 7.8 %
  cellUnitPrice:      number;          // 1.00
  totalCells:         number;
  cellsSubscribed:    number;
  imageUrl?:          string;
  isFavorite?:        boolean;
}

/** Données extraites du PDF p.2 */
export const MOCK_ASSETS: Asset[] = [
  {
    id:              'asset-001',
    slug:            'centrale-solaire-valensole',
    name:            'Centrale Solaire Valensole',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Provence-Alpes-Côte d\'Azur',
    assetType:       'solar_ground',
    status:          'in_production',
    installedPower:  '5.2 MWc',
    targetYieldRate: 0.078,
    cellUnitPrice:   1.00,
    totalCells:      8700,
    cellsSubscribed: 8000,
  },
  {
    id:              'asset-002',
    slug:            'ombriere-greenpark-lyon',
    name:            'Ombrière GreenPark Lyon',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Auvergne-Rhône-Alpes',
    assetType:       'solar_canopy',
    status:          'financing',
    installedPower:  '2.1 MWc',
    targetYieldRate: 0.092,
    cellUnitPrice:   1.00,
    totalCells:      5800,
    cellsSubscribed: 3700,
  },
  {
    id:              'asset-003',
    slug:            'toiture-industrielle-marseille',
    name:            'Toiture Industrielle Marseille',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Provence-Alpes-Côte d\'Azur',
    assetType:       'solar_industrial',
    status:          'financing_complete',
    installedPower:  '1.3 MWc',
    targetYieldRate: 0.071,
    cellUnitPrice:   1.00,
    totalCells:      1300,
    cellsSubscribed: 1300,
  },
  {
    id:              'asset-004',
    slug:            'stockage-solaire-bordeaux',
    name:            'Stockage Solaire Bordeaux',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Nouvelle-Aquitaine',
    assetType:       'battery_storage',
    status:          'financing',
    installedPower:  '800 kWh',
    targetYieldRate: 0.105,
    cellUnitPrice:   1.00,
    totalCells:      4300,
    cellsSubscribed: 1770,
  },
  {
    id:              'asset-005',
    slug:            'centrale-solaire-occitanie',
    name:            'Centrale Solaire Occitanie',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Occitanie',
    assetType:       'solar_ground',
    status:          'financing',
    installedPower:  '10 MWc',
    targetYieldRate: 0.063,
    cellUnitPrice:   1.00,
    totalCells:      12000,
    cellsSubscribed: 3200,
  },
  {
    id:              'asset-006',
    slug:            'residentiel-collectif-nantes',
    name:            'Résidentiel Collectif Nantes',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Pays de la Loire',
    assetType:       'solar_residential',
    status:          'in_production',
    installedPower:  '450 kWc',
    targetYieldRate: 0.08,
    cellUnitPrice:   1.00,
    totalCells:      4500,
    cellsSubscribed: 4500,
  },
  {
    id:              'asset-007',
    slug:            'irve-solaire-toulouse',
    name:            'IRVE Solaire Toulouse',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Occitanie',
    assetType:       'ev_charging',
    status:          'financing',
    installedPower:  '250 kWc',
    targetYieldRate: 0.098,
    cellUnitPrice:   1.00,
    totalCells:      2800,
    cellsSubscribed: 840,
  },
  {
    id:              'asset-008',
    slug:            'centrale-solaire-gard',
    name:            'Centrale Solaire Gard',
    countryCode:     'FR',
    countryName:     'France',
    region:          'Occitanie',
    assetType:       'solar_ground',
    status:          'coming_soon',
    installedPower:  '3.6 MWc',
    targetYieldRate: 0.075,
    cellUnitPrice:   1.00,
    totalCells:      6000,
    cellsSubscribed: 0,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────
export function getFinancingPct(asset: Asset): number {
  if (asset.totalCells === 0) return 0;
  return Math.round((asset.cellsSubscribed / asset.totalCells) * 100);
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  solar_ground:     'Centrale solaire au sol',
  solar_canopy:     'Ombrière',
  solar_industrial: 'Toiture industrielle',
  solar_residential:'Résidentiel collectif',
  battery_storage:  'Batterie / Stockage',
  ev_charging:      'Borne de recharge (IRVE)',
};
