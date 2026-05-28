import Stripe from 'stripe';
import { env }  from '../config/env';
import { odoo } from '../lib/odoo-client';
import { logger } from '../lib/logger';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Vérifie la signature du webhook Stripe et traite l'événement.
 * Appelle handle_stripe_webhook() dans Odoo.
 *
 * @param rawBody   Buffer brut du body (avant JSON.parse) — requis pour la vérification sig.
 * @param signature En-tête Stripe-Signature.
 */
export async function handleStripeWebhook(
  rawBody:   Buffer,
  signature: string,
): Promise<{ received: boolean; transaction_uuid?: string; state?: string }> {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.warn('[Stripe] Webhook signature invalide:', err);
    throw Object.assign(new Error('Webhook signature invalide.'), { status: 400 });
  }

  logger.info(`[Stripe] Event: ${event.type} (${event.id})`);

  // Événements supportés
  const HANDLED_EVENTS = new Set([
    'payment_intent.created',
    'payment_intent.processing',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'payout.paid',
    'payout.failed',
  ]);

  if (!HANDLED_EVENTS.has(event.type)) {
    logger.debug(`[Stripe] Event non géré: ${event.type}`);
    return { received: true };
  }

  const object = event.data.object as Stripe.PaymentIntent | Stripe.Payout;

  const stripeIntentId  = 'client_secret'   in object ? object.id : undefined;
  const stripePayoutId  = 'arrival_date'    in object ? object.id : undefined;
  const stripeChargeId  = 'latest_charge'   in object
    ? (object as Stripe.PaymentIntent).latest_charge as string | undefined
    : undefined;

  try {
    const result = await odoo.callKw<{ transaction_uuid?: string; state?: string }>(
      'solar.payment.transaction',
      'handle_stripe_webhook',
      [event.type, stripeIntentId ?? stripePayoutId, stripeChargeId, object],
    );
    return { received: true, ...result };
  } catch (err) {
    logger.error('[Stripe] Erreur Odoo lors du traitement webhook:', err);
    // Ne pas throw — Stripe retry si on retourne une erreur HTTP
    return { received: true };
  }
}

/**
 * Crée un PaymentIntent Stripe pour une souscription par carte.
 */
export async function createPaymentIntent(
  amount:      number,        // en centimes EUR
  currency:    string,
  metadata:    Record<string, string>,
): Promise<{ clientSecret: string; intentId: string }> {
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata,
  });

  return {
    clientSecret: intent.client_secret!,
    intentId:     intent.id,
  };
}
