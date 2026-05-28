import { Router, Request, Response } from 'express';
import { z }                from 'zod';
import { requireAuth }      from '../middleware/auth';
import { validate }         from '../middleware/validate';
import { asyncHandler }     from '../middleware/error-handler';
import { odoo }             from '../lib/odoo-client';
import { stripe }           from '../services/stripe.service';
import { ok, fail }         from '../types/api.types';
import { logger }           from '../lib/logger';

const router = Router();

// ── Schéma de validation ──────────────────────────────────────────────────────
const createIntentSchema = z.object({
  paymentTransactionUuid: z.string().uuid(),
});

// ── POST /payments/intent ─────────────────────────────────────────────────────
// Crée un Stripe PaymentIntent à partir d'un solar.payment.transaction Odoo.
// Retourne le clientSecret à utiliser avec stripe.confirmCardPayment().
router.post(
  '/intent',
  requireAuth,
  validate(createIntentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { paymentTransactionUuid } = req.body as { paymentTransactionUuid: string };

    // 1. Charger la transaction Odoo
    type TxRecord = {
      id:           number;
      fiat_amount:  number;
      currency_id:  [number, string];
      partner_id:   [number, string];
      state:        string;
      direction:    string;
    };

    const txs = await odoo.callKw<TxRecord[]>(
      'solar.payment.transaction',
      'search_read',
      [[['uuid', '=', paymentTransactionUuid]]],
      { fields: ['id', 'fiat_amount', 'currency_id', 'partner_id', 'state', 'direction'], limit: 1 },
    );

    if (!txs.length) {
      res.status(404).json(fail('Transaction introuvable.', 'NOT_FOUND'));
      return;
    }

    const tx = txs[0];

    // Vérifications de sécurité
    if (tx.direction !== 'inbound') {
      res.status(400).json(fail('Seules les transactions inbound peuvent être payées par carte.'));
      return;
    }
    if (!['initiated'].includes(tx.state)) {
      res.status(409).json(fail(`Transaction déjà dans l'état "${tx.state}".`, 'INVALID_STATE'));
      return;
    }

    // Vérifier que l'investisseur est bien le propriétaire de la transaction
    const partnerName = Array.isArray(tx.partner_id) ? tx.partner_id[1] : '';
    logger.info(`[Payments] Création PaymentIntent pour "${partnerName}", montant: ${tx.fiat_amount} EUR`);

    // 2. Créer le PaymentIntent Stripe (montant en centimes)
    const amountCents = Math.round(tx.fiat_amount * 100);
    const currencyCode = Array.isArray(tx.currency_id)
      ? tx.currency_id[1].toLowerCase()
      : 'eur';

    const { clientSecret, intentId } = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: currencyCode,
      automatic_payment_methods: { enabled: true },
      metadata: {
        solarcells_tx_uuid: paymentTransactionUuid,
        partner:            partnerName,
      },
    }).then(pi => ({ clientSecret: pi.client_secret!, intentId: pi.id }));

    // 3. Mettre à jour la transaction Odoo avec stripe_intent_id
    await odoo.callKw(
      'solar.payment.transaction',
      'write',
      [[tx.id], { stripe_intent_id: intentId }],
    );

    logger.info(`[Payments] PaymentIntent créé: ${intentId} pour tx ${paymentTransactionUuid}`);

    res.status(201).json(ok({
      clientSecret,
      intentId,
      amountCents,
      currency: currencyCode,
    }));
  }),
);

export default router;
