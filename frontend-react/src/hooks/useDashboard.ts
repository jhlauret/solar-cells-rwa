import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────────────────────────────────────

export interface HoldingSummary {
  uuid:                      string;
  asset_uuid:                string;
  asset_code:                string;
  asset_name:                string;
  asset_state:               string;
  cells_owned:               number;
  average_acquisition_price: number;
  total_invested:            number;
  total_yield_received:      number;
  current_value:             number;
  unrealised_gain:           number;
  state:                     string;
  reinvest_enabled:          boolean;
  first_acquired_at:         string | null;
}

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio', 'holdings'],
    queryFn:  () => apiClient.get<{ holdings: HoldingSummary[] }>('/portfolio').then(r => r.holdings),
    staleTime: 30 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Yield
// ─────────────────────────────────────────────────────────────────────────────

export interface YieldLine {
  distribution_id:     [number, string];
  asset_id:            [number, string];
  cells_at_distribution: number;
  amount_gross:        number;
  amount_net:          number;
  state:               string;
  paid_at:             string | null;
}

export function useYield() {
  return useQuery({
    queryKey: ['yield', 'lines'],
    queryFn:  () => apiClient.get<YieldLine[]>('/yield'),
    staleTime: 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────────────────

export interface Transaction {
  uuid:             string;
  name:             string;
  direction:        'inbound' | 'outbound';
  transaction_type: string;
  payment_method:   string;
  fiat_amount:      number;
  fees_amount:      number;
  net_amount:       number;
  currency:         string;
  state:            string;
  initiated_at:     string;
  succeeded_at:     string | null;
}

export function useTransactionHistory() {
  return useQuery({
    queryKey: ['transfers', 'history'],
    queryFn:  () => apiClient.get<Transaction[]>('/transfers/history'),
    staleTime: 30 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Market orders
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketOrder {
  name:            string;
  asset_id:        [number, string];
  direction:       'sell' | 'buy';
  cells_offered:   number;
  cells_remaining: number;
  price_per_cell:  number;
  total_amount:    number;
  state:           string;
  expires_at:      string;
}

export function usePublishedMarketOrders(assetUuid?: string) {
  return useQuery({
    queryKey: ['market', 'orders', assetUuid ?? 'all'],
    queryFn:  () => apiClient.get<MarketOrder[]>('/transfers/market-orders', assetUuid ? { assetUuid } : {}),
    staleTime: 20 * 1000,
  });
}

export function useMyMarketOrders() {
  return useQuery({
    queryKey: ['market', 'orders', 'mine'],
    queryFn:  () => apiClient.get<MarketOrder[]>('/transfers/market-orders/mine'),
    staleTime: 20 * 1000,
  });
}

export function useCreateMarketOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      assetUuid:    string;
      direction:    'sell' | 'buy';
      cellsOffered: number;
      pricePerCell: number;
    }) => apiClient.post<{ orderId: number }>('/transfers/market-orders', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market', 'orders', 'mine'] });
      qc.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet
// ─────────────────────────────────────────────────────────────────────────────

export interface WalletInfo {
  uuid:                  string;
  wallet_type:           string;
  provider:              string;
  network:               string;
  address:               string | null;
  state:                 string;
  whitelisted_on_chain:  boolean;
  is_primary:            boolean;
  created_at:            string;
  activated_at:          string | null;
}

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn:  () => apiClient.get<WalletInfo | null>('/wallet'),
    staleTime: 60 * 1000,
  });
}

export function useCreateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      providerVaultId: string;
      address?:        string;
      walletType?:     string;
      network?:        string;
    }) => apiClient.post<{ wallet_uuid: string; state: string }>('/wallet', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wallet'] }),
  });
}
