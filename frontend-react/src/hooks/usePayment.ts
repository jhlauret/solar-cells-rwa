import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useCreateOrder, type CreateOrderInput } from './useInvestment';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentIntentResult {
  clientSecret: string;
  intentId:     string;
  amountCents:  number;
  currency:     string;
}

export interface StartPaymentInput extends CreateOrderInput {
  // Hérite de assetUuid, cellsRequested, paymentMethod
}

export interface StartPaymentResult {
  orderUuid:               string;
  orderName:               string;
  paymentTransactionUuid:  string;
  clientSecret:            string | null;   // null si SEPA (pas de carte)
  amountCents:             number;
  expiresAt:               string;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * Orchestration complète du paiement :
 * 1. Crée l'ordre Odoo (solar.investment.order)
 * 2. Si method=card → crée le PaymentIntent Stripe + retourne clientSecret
 * 3. Si method=sepa → retourne juste les infos de virement
 */
export function useStartPayment() {
  const qc          = useQueryClient();
  const createOrder = useCreateOrder();

  return useMutation({
    mutationFn: async (input: StartPaymentInput): Promise<StartPaymentResult> => {
      // Étape 1 — créer l'ordre dans Odoo
      const order = await createOrder.mutateAsync({
        assetUuid:      input.assetUuid,
        cellsRequested: input.cellsRequested,
        paymentMethod:  input.paymentMethod,
      });

      let clientSecret: string | null = null;

      // Étape 2 — pour les paiements par carte, créer le PaymentIntent Stripe
      if (input.paymentMethod === 'card') {
        const intent = await apiClient.post<PaymentIntentResult>(
          '/payments/intent',
          { paymentTransactionUuid: order.payment_transaction_uuid },
        );
        clientSecret = intent.clientSecret;
      }

      return {
        orderUuid:              order.order_uuid,
        orderName:              order.order_name,
        paymentTransactionUuid: order.payment_transaction_uuid as string,
        clientSecret,
        amountCents:            input.paymentMethod === 'card'
          ? Math.round((order.net_amount as number) * 100)
          : 0,
        expiresAt:              order.expires_at as string,
      };
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['assets', 'catalog'] });
    },
  });
}
