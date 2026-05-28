import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { Asset } from '@/features/marketplace/mock/assets.mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssetFilters {
  country_id?:  number;
  asset_type?:  string;
  min_yield?:   number;
  max_yield?:   number;
}

export interface SimulationResult {
  cells:                number;
  amount:               number;
  fees:                 number;
  total_charged:        number;
  annual_revenue:       number;
  quarterly_revenue:    number;
  target_yield_rate:    number;
  distribution_frequency: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const assetKeys = {
  all:        ['assets']               as const,
  catalog:    (f?: AssetFilters) => ['assets', 'catalog', f] as const,
  detail:     (uuid: string)    => ['assets', 'detail', uuid] as const,
  simulation: (uuid: string, cells: number) => ['assets', 'simulate', uuid, cells] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Catalogue public des actifs (marketplace).
 */
export function useAssets(filters?: AssetFilters) {
  return useQuery({
    queryKey: assetKeys.catalog(filters),
    queryFn:  () => apiClient.get<Asset[]>('/assets', filters as Record<string, unknown>),
    staleTime: 60 * 1000,  // 1 minute — le catalogue ne change pas souvent
  });
}

/**
 * Détail d'un actif par UUID.
 */
export function useAsset(uuid: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(uuid ?? ''),
    queryFn:  () => apiClient.get<Asset & Record<string, unknown>>(`/assets/${uuid}`),
    enabled:  !!uuid,
  });
}

/**
 * Simulation d'investissement.
 */
export function useSimulation(uuid: string | undefined, cells: number) {
  return useQuery({
    queryKey: assetKeys.simulation(uuid ?? '', cells),
    queryFn:  () => apiClient.get<SimulationResult>(
      `/assets/${uuid}/simulate`, { cells },
    ),
    enabled:  !!uuid && cells > 0,
    staleTime: 5 * 60 * 1000,  // résultat stable
  });
}
