import { z } from 'zod';

export const investAmountSchema = z.object({
  amount: z
    .number({ required_error: 'Montant requis' })
    .min(1, 'Montant minimum : 1 €')
    .max(100_000, 'Montant maximum : 100 000 €'),
});

export const investPaymentSchema = z.object({
  paymentMethod: z.enum(['sepa', 'card', 'stablecoin'], {
    required_error: 'Sélectionnez un mode de paiement',
  }),
  iban: z.string().optional(),
});

export type InvestAmountValues  = z.infer<typeof investAmountSchema>;
export type InvestPaymentValues = z.infer<typeof investPaymentSchema>;

export type PaymentMethod = 'sepa' | 'card' | 'stablecoin';

export interface InvestState {
  assetId:         string;
  assetName:       string;
  assetStatus:     string;
  assetLocation:   string;
  cellUnitPrice:   number;
  targetYieldRate: number;
  amount:          number;
  paymentMethod:   PaymentMethod | null;
}

// ─── Frais selon mode de paiement ────────────────────────────────────────
export const FEES: Record<PaymentMethod, { rate: number; label: string }> = {
  sepa:       { rate: 0,     label: 'Aucun frais'     },
  card:       { rate: 0.005, label: '+0,5 %'          },
  stablecoin: { rate: 0,     label: 'Aucun frais'     },
};

export function computeOrder(state: InvestState) {
  const fees = state.paymentMethod ? FEES[state.paymentMethod].rate * state.amount : 0;
  const total = state.amount + fees;
  const cells = Math.floor(state.amount / state.cellUnitPrice);
  const annualRevenue = state.amount * state.targetYieldRate;
  return { fees, total, cells, annualRevenue };
}
