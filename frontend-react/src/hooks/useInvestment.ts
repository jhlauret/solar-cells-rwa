import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvestmentOrder {
  name:              string;
  asset_id:          [number, string];
  cells_requested:   number;
  gross_amount:      number;
  net_amount:        number;
  state:             string;
  created_at:        string;
  settled_at:        string | null;
  payment_method:    string;
}

export interface CreateOrderResult {
  order_uuid:               string;
  order_name:               string;
  cells_requested:          number;
  gross_amount:             number;
  net_amount:               number;
  payment_transaction_uuid: string;
  expires_at:               string;
}

export interface CreateOrderInput {
  assetUuid:      string;
  cellsRequested: number;
  paymentMethod:  'sepa' | 'card' | 'stablecoin';
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const investmentKeys = {
  all:    ['investments']         as const,
  orders: ['investments', 'list'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Liste des ordres de l'investisseur connecté */
export function useMyOrders() {
  return useQuery({
    queryKey: investmentKeys.orders,
    queryFn:  () => apiClient.get<InvestmentOrder[]>('/investments'),
    staleTime: 30 * 1000,
  });
}

/** Création d'un ordre + paiement en une seule mutation */
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      apiClient.post<CreateOrderResult>('/investments', input),
    onSuccess: () => {
      // Invalider le portfolio et les ordres
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['assets', 'catalog'] });
    },
  });
}
