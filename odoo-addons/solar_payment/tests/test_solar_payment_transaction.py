# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for solar.payment.transaction.

Coverage:
  - Creation (UUID, name sequence, card fee auto-computation)
  - State machine: all valid transitions and terminal-state guards
  - action_refund: creates outbound refund + transitions original to refunded
  - net_amount computed field
  - Webhook handlers: handle_stripe_webhook, handle_bridge_webhook
  - create_transaction API method (partner guard, card fee)
  - get_transaction_dict safe fields
"""

from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError


@tagged('post_install', '-at_install', 'solar_payment')
class TestSolarPaymentTransaction(TransactionCase):
    """Unit tests for solar.payment.transaction."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Tx      = cls.env['solar.payment.transaction']
        cls.Partner = cls.env['res.partner']
        cls.eur     = cls.env.ref('base.EUR')
        cls.france  = cls.env.ref('base.fr')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_investor(self, email=None):
        return self.Partner.create({
            'name':          'Payment Investor',
            'email':         email or f'pay.{id(self)}@example.com',
            'x_is_investor': True,
            'country_id':    self.france.id,
        })

    def _create_tx(self, partner=None, **kwargs):
        if partner is None:
            partner = self._create_investor()
        defaults = {
            'partner_id':       partner.id,
            'direction':        'inbound',
            'transaction_type': 'subscription',
            'payment_method':   'sepa',
            'fiat_amount':      150.00,
            'currency_id':      self.eur.id,
        }
        defaults.update(kwargs)
        return self.Tx.create(defaults)

    def _bring_to(self, tx, state):
        if state == 'processing':
            tx.action_mark_processing()
        elif state == 'succeeded':
            tx.action_mark_processing()
            tx.action_mark_succeeded()
        elif state == 'failed':
            tx.action_mark_processing()
            tx.action_mark_failed(reason='test failure')
        elif state == 'cancelled':
            tx.action_cancel()

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_uuid_generated(self):
        tx = self._create_tx()
        self.assertEqual(len(tx.uuid), 36)

    def test_name_uses_sequence(self):
        tx = self._create_tx()
        self.assertTrue(tx.name.startswith('PAY-'))

    def test_initial_state_initiated(self):
        tx = self._create_tx()
        self.assertEqual(tx.state, 'initiated')

    def test_card_fee_computed(self):
        """Card payment: fee = 0.5% of fiat_amount (computed by create_transaction)."""
        partner = self._create_investor(email='cardfee@example.com')
        result = self.Tx.create_transaction(
            partner_uuid=partner.x_uuid,
            direction='inbound',
            transaction_type='subscription',
            fiat_amount=200.00,
            payment_method='card',
        )
        tx = self.Tx.search([('uuid', '=', result['transaction_uuid'])], limit=1)
        self.assertAlmostEqual(tx.fees_amount, 1.00)   # 0.5% of 200

    def test_net_amount_computed(self):
        tx = self._create_tx(fiat_amount=200.00, fees_amount=1.00)
        self.assertAlmostEqual(tx.net_amount, 199.00)

    def test_sepa_no_fee(self):
        partner = self._create_investor(email='sepa@example.com')
        result = self.Tx.create_transaction(
            partner_uuid=partner.x_uuid,
            direction='inbound',
            transaction_type='subscription',
            fiat_amount=500.00,
            payment_method='sepa',
        )
        tx = self.Tx.search([('uuid', '=', result['transaction_uuid'])], limit=1)
        self.assertAlmostEqual(tx.fees_amount, 0.00)

    # ------------------------------------------------------------------
    # State machine — valid transitions
    # ------------------------------------------------------------------

    def test_mark_processing(self):
        tx = self._create_tx()
        tx.action_mark_processing()
        self.assertEqual(tx.state, 'processing')
        self.assertIsNotNone(tx.processing_at)

    def test_mark_succeeded(self):
        tx = self._create_tx()
        self._bring_to(tx, 'succeeded')
        self.assertEqual(tx.state, 'succeeded')
        self.assertIsNotNone(tx.succeeded_at)

    def test_mark_failed(self):
        tx = self._create_tx()
        self._bring_to(tx, 'failed')
        self.assertEqual(tx.state, 'failed')
        self.assertEqual(tx.failure_reason, 'test failure')
        self.assertIsNotNone(tx.failed_at)

    def test_cancel_from_initiated(self):
        tx = self._create_tx()
        tx.action_cancel()
        self.assertEqual(tx.state, 'cancelled')

    def test_refund_creates_outbound_tx(self):
        tx = self._create_tx(fiat_amount=100.00)
        self._bring_to(tx, 'succeeded')
        refund = tx.action_refund()
        self.assertEqual(tx.state, 'refunded')
        self.assertEqual(refund.direction, 'outbound')
        self.assertEqual(refund.transaction_type, 'refund')
        self.assertAlmostEqual(refund.fiat_amount, 100.00)

    # ------------------------------------------------------------------
    # State machine — invalid transitions / terminal state guards
    # ------------------------------------------------------------------

    def test_cannot_mark_processing_twice(self):
        tx = self._create_tx()
        tx.action_mark_processing()
        with self.assertRaises(UserError):
            tx.action_mark_processing()

    def test_cannot_succeed_from_initiated(self):
        tx = self._create_tx()
        with self.assertRaises(UserError):
            tx.action_mark_succeeded()

    def test_cannot_cancel_from_processing(self):
        tx = self._create_tx()
        tx.action_mark_processing()
        with self.assertRaises(UserError):
            tx.action_cancel()

    def test_cannot_act_on_cancelled(self):
        tx = self._create_tx()
        tx.action_cancel()
        with self.assertRaises(UserError):
            tx.action_mark_processing()

    def test_cannot_act_on_refunded(self):
        tx = self._create_tx(fiat_amount=50.00)
        self._bring_to(tx, 'succeeded')
        tx.action_refund()
        with self.assertRaises(UserError):
            tx.action_mark_processing()

    def test_cannot_refund_outbound(self):
        tx = self._create_tx(direction='outbound',
                              transaction_type='yield_distribution')
        self._bring_to(tx, 'succeeded')
        with self.assertRaises(UserError):
            tx.action_refund()

    # ------------------------------------------------------------------
    # Stripe webhook handler
    # ------------------------------------------------------------------

    def test_stripe_webhook_succeeded(self):
        tx = self._create_tx(stripe_intent_id='pi_test_001')
        result = self.Tx.handle_stripe_webhook(
            event_type='payment_intent.succeeded',
            stripe_intent_id='pi_test_001',
            stripe_charge_id='ch_test_001',
        )
        self.assertEqual(result['state'], 'succeeded')
        self.assertEqual(tx.state, 'succeeded')
        self.assertEqual(tx.stripe_charge_id, 'ch_test_001')

    def test_stripe_webhook_failed(self):
        tx = self._create_tx(stripe_intent_id='pi_test_002')
        tx.action_mark_processing()
        self.Tx.handle_stripe_webhook(
            event_type='payment_intent.payment_failed',
            stripe_intent_id='pi_test_002',
        )
        self.assertEqual(tx.state, 'failed')

    def test_stripe_webhook_unknown_intent(self):
        result = self.Tx.handle_stripe_webhook(
            event_type='payment_intent.succeeded',
            stripe_intent_id='pi_not_existing',
        )
        self.assertEqual(result['status'], 'not_found')

    # ------------------------------------------------------------------
    # Bridge webhook handler
    # ------------------------------------------------------------------

    def test_bridge_webhook_completed(self):
        tx = self._create_tx(
            payment_method='stablecoin',
            bridge_conversion_id='brg_conv_001',
        )
        self.Tx.handle_bridge_webhook(
            event_type='conversion.completed',
            bridge_conversion_id='brg_conv_001',
            bridge_payment_id='brg_pay_001',
        )
        self.assertEqual(tx.state, 'succeeded')
        self.assertEqual(tx.bridge_payment_id, 'brg_pay_001')

    # ------------------------------------------------------------------
    # create_transaction API
    # ------------------------------------------------------------------

    def test_create_transaction_unknown_partner_raises(self):
        with self.assertRaises(UserError):
            self.Tx.create_transaction(
                partner_uuid='00000000-0000-0000-0000-000000000000',
                direction='inbound',
                transaction_type='subscription',
                fiat_amount=100.00,
            )

    def test_create_transaction_unknown_currency_raises(self):
        partner = self._create_investor(email='curr@example.com')
        with self.assertRaises(UserError):
            self.Tx.create_transaction(
                partner_uuid=partner.x_uuid,
                direction='inbound',
                transaction_type='subscription',
                fiat_amount=100.00,
                currency_code='XYZ',
            )

    # ------------------------------------------------------------------
    # get_transaction_dict
    # ------------------------------------------------------------------

    def test_get_transaction_dict_fields(self):
        tx = self._create_tx(fiat_amount=250.00, fees_amount=1.25)
        d = tx.get_transaction_dict()
        self.assertIn('uuid', d)
        self.assertIn('state', d)
        self.assertIn('net_amount', d)
        self.assertAlmostEqual(d['net_amount'], 248.75)
        self.assertNotIn('metadata', d)
        self.assertNotIn('stripe_intent_id', d)
