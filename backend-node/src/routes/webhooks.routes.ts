import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { handleStripeWebhook } from '../services/stripe.service';
import { odoo }   from '../lib/odoo-client';
import { logger } from '../lib/logger';
import { ok, fail } from '../types/api.types';

const router = Router();

// ── POST /webhooks/stripe ─────────────────────────────────────────────────────
// Note: le body doit être le Buffer RAW (express.raw) pour la vérification de signature
router.post('/stripe',
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json(fail('Stripe-Signature header manquant.'));
      return;
    }

    // req.body est un Buffer ici (grâce à express.raw appliqué sur cette route)
    const rawBody = req.body as Buffer;
    const result  = await handleStripeWebhook(rawBody, signature);

    res.json(ok(result));
  }),
);

// ── POST /webhooks/bridge ─────────────────────────────────────────────────────
router.post('/bridge',
  asyncHandler(async (req: Request, res: Response) => {
    // Bridge envoie un JSON classique
    const payload = req.body as {
      event_type?:          string;
      bridge_conversion_id?: string;
      bridge_payment_id?:    string;
      [key: string]:         unknown;
    };

    const { event_type, bridge_conversion_id, bridge_payment_id } = payload;
    if (!event_type) {
      res.status(400).json(fail('event_type manquant.'));
      return;
    }

    logger.info(`[Bridge] Webhook: ${event_type}`);

    const result = await odoo.callKw<Record<string, unknown>>(
      'solar.payment.transaction',
      'handle_bridge_webhook',
      [event_type, bridge_conversion_id, bridge_payment_id, payload],
    );

    res.json(ok(result));
  }),
);

// ── POST /webhooks/kyc-provider ───────────────────────────────────────────────
// Webhook Onfido / Sumsub → approuver ou rejeter le cas KYC
router.post('/kyc-provider',
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as {
      event:           string;
      applicant_id?:   string;
      check_id?:       string;
      provider?:       string;
      result?:         'clear' | 'consider' | 'rejected';
      breakdown?:      Record<string, unknown>;
    };

    logger.info(`[KYC Provider] Webhook: ${payload.event}`);

    // Trouver le cas KYC par provider_case_id
    if (!payload.applicant_id) {
      res.json(ok({ received: true }));
      return;
    }

    const cases = await odoo.callKw<{ id: number; state: string }[]>(
      'solar.kyc.case', 'search_read',
      [[['provider_case_id', '=', payload.applicant_id]]],
      { fields: ['id', 'state'], limit: 1 },
    );

    if (!cases.length) {
      logger.warn(`[KYC Provider] Cas non trouvé: ${payload.applicant_id}`);
      res.json(ok({ received: true }));
      return;
    }

    const caseId = cases[0].id;

    if (payload.result === 'clear') {
      // Approuver avec niveau L2 par défaut
      await odoo.callKw('solar.kyc.case', 'action_approve',
        [[caseId]], { kyc_level: 'L2', source: 'provider' });
    } else if (payload.result === 'rejected') {
      await odoo.callKw('solar.kyc.case', 'action_reject',
        [[caseId]], {
          reason: `Rejeté par le provider (${payload.provider})`,
          source: 'provider',
        });
    }

    res.json(ok({ received: true, case_id: caseId }));
  }),
);

export default router;
