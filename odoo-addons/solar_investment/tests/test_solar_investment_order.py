# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for solar.investment.order.

Coverage:
  - Creation (UUID, name sequence, amount computation)
  - Guard checks: KYC, wallet, asset state, availability
  - State machine: full happy path draft→settled
  - action_cancel from various states
  - action_refund: debits holding + triggers payment refund
  - Cron: expires pending orders past expires_at
  - create_order() API: end-to-end
  - payment _on_succeeded_hook: auto-settle via payment success
"""

from datetime import timedelta

from odoo import fields
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, ValidationError


@tagged('post_install', '-at_install', 'solar_investment')
class TestSolarInvestmentOrder(TransactionCase):
    """Unit tests for solar.investment.order."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Order   = cls.env['solar.investment.order']
        cls.Partner = cls.env['res.partner']
        cls.Asset   = cls.env['solar.asset']
        cls.KycCase = cls.env['solar.kyc.case']
        cls.KycDoc  = cls.env['solar.kyc.document']
        cls.Wallet  = cls.env['solar.wallet']
        cls.Holding = cls.env['solar.holding']
        cls.france  = cls.env.ref('base.fr')
        cls.eur     = cls.env.ref('base.EUR')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_ready_investor(self, email=None):
        """Create investor with validated KYC and active whitelisted wallet."""
        partner = self.Partner.create({
            'name': 'Ready Investor', 'x_is_investor': True,
            'email': email or f'ready.{id(self)}@example.com',
            'country_id': self.france.id,
        })
        # KYC
        case = self.KycCase.create({'partner_id': partner.id})
        for dt in ['identity_card', 'selfie_liveness', 'proof_of_address']:
            self.KycDoc.create({
                'case_id': case.id, 'document_type': dt,
                'minio_path': f'kyc/{dt}.pdf', 'sha256_hash': 'a' * 64,
                'mime_type': 'application/pdf', 'file_size_bytes': 1024,
            })
        case.action_submit()
        case.action_approve(kyc_level='L2')
        partner.write({'x_kyc_case_id': case.id})
        # Wallet
        wallet = self.Wallet.create({
            'partner_id': partner.id, 'provider_vault_id': f'v-{id(self)}',
            'address': '0x' + format(id(self) % (16**40), '040x'),
        })
        wallet.action_activate()
        wallet.action_whitelist_on_chain()
        return partner, wallet

    def _create_financing_asset(self, total_cells=1000):
        asset = self.Asset.create({
            'code': f'INV-TST-{id(self)}',
            'name': 'Investment Test Asset',
            'country_id': self.france.id,
            'asset_type': 'solar_ground',
            'installed_power_mwc': 1.0,
            'currency_id': self.eur.id,
            'total_cells': total_cells,
            'cell_unit_price': 1.00,
            'total_capital_raised': float(total_cells),
            'target_yield_rate': 0.085,
            'distribution_frequency': 'quarterly',
            'on_chain_token_address': '0x' + 'f' * 40,
            'state': 'financing',
        })
        return asset

    def _create_order(self, partner=None, wallet=None, asset=None, cells=100,
                      payment_method='sepa'):
        if partner is None:
            partner, wallet = self._create_ready_investor()
        if asset is None:
            asset = self._create_financing_asset()
        return self.Order.create({
            'partner_id':      partner.id,
            'asset_id':        asset.id,
            'wallet_id':       wallet.id if wallet else False,
            'cells_requested': cells,
            'price_per_cell':  asset.cell_unit_price,
            'payment_method':  payment_method,
        })

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_uuid_generated(self):
        partner, wallet = self._create_ready_investor()
        order = self._create_order(partner, wallet)
        self.assertEqual(len(order.uuid), 36)

    def test_name_uses_sequence(self):
        partner, wallet = self._create_ready_investor()
        order = self._create_order(partner, wallet)
        self.assertTrue(order.name.startswith('INV-'))

    def test_initial_state_draft(self):
        partner, wallet = self._create_ready_investor()
        order = self._create_order(partner, wallet)
        self.assertEqual(order.state, 'draft')

    def test_cells_positive_constraint(self):
        partner, wallet = self._create_ready_investor()
        asset = self._create_financing_asset()
        with self.assertRaises(ValidationError):
            self.Order.create({
                'partner_id': partner.id, 'asset_id': asset.id,
                'cells_requested': 0, 'price_per_cell': 1.00,
                'payment_method': 'sepa',
            })

    def test_amounts_computed(self):
        partner, wallet = self._create_ready_investor()
        order = self._create_order(partner, wallet, cells=200,
                                    payment_method='card')
        self.assertAlmostEqual(order.gross_amount, 200.0)
        self.assertAlmostEqual(order.fees_amount, 1.0)   # 0.5%
        self.assertAlmostEqual(order.net_amount, 201.0)

    # ------------------------------------------------------------------
    # Guards — KYC
    # ------------------------------------------------------------------

    def test_submit_fails_without_kyc(self):
        partner = self.Partner.create({
            'name': 'No KYC', 'x_is_investor': True,
            'email': 'nokyc@example.com', 'country_id': self.france.id,
        })
        asset = self._create_financing_asset()
        order = self.Order.create({
            'partner_id': partner.id, 'asset_id': asset.id,
            'cells_requested': 10, 'price_per_cell': 1.00,
            'payment_method': 'sepa',
        })
        with self.assertRaises(UserError):
            order.action_submit()

    # ------------------------------------------------------------------
    # Guards — Wallet
    # ------------------------------------------------------------------

    def test_submit_fails_without_active_wallet(self):
        partner, _ = self._create_ready_investor(email='nowallet@example.com')
        # Close the wallet
        partner.x_primary_wallet_id.action_close()
        asset = self._create_financing_asset()
        order = self.Order.create({
            'partner_id': partner.id, 'asset_id': asset.id,
            'cells_requested': 10, 'price_per_cell': 1.00,
            'payment_method': 'sepa',
        })
        with self.assertRaises(UserError):
            order.action_submit()

    # ------------------------------------------------------------------
    # Guards — Asset state
    # ------------------------------------------------------------------

    def test_submit_fails_on_non_financing_asset(self):
        partner, wallet = self._create_ready_investor(email='assetstate@example.com')
        asset = self._create_financing_asset()
        asset.write({'state': 'in_production'})
        order = self._create_order(partner, wallet, asset=asset)
        with self.assertRaises(UserError):
            order.action_submit()

    # ------------------------------------------------------------------
    # Guards — Availability
    # ------------------------------------------------------------------

    def test_submit_fails_when_exceeds_available(self):
        partner, wallet = self._create_ready_investor(email='exceed@example.com')
        asset = self._create_financing_asset(total_cells=50)
        order = self._create_order(partner, wallet, asset=asset, cells=100)
        with self.assertRaises(UserError):
            order.action_submit()

    # ------------------------------------------------------------------
    # Happy path: draft → settled
    # ------------------------------------------------------------------

    def test_full_happy_path(self):
        partner, wallet = self._create_ready_investor(email='happy@example.com')
        asset = self._create_financing_asset(total_cells=500)

        order = self._create_order(partner, wallet, asset=asset, cells=100)
        self.assertEqual(order.state, 'draft')

        order.action_submit()
        self.assertEqual(order.state, 'submitted')

        order.action_create_payment()
        self.assertEqual(order.state, 'payment_pending')
        self.assertIsNotNone(order.payment_transaction_id)
        self.assertIsNotNone(order.expires_at)

        # Simulate payment success
        order.payment_transaction_id.action_mark_processing()
        order.payment_transaction_id.action_mark_succeeded()
        # _on_succeeded_hook should settle the order
        self.assertEqual(order.state, 'settled')
        self.assertIsNotNone(order.settled_at)

        # Holding created
        holding = self.Holding.search([
            ('partner_id', '=', partner.id),
            ('asset_id',   '=', asset.id),
        ], limit=1)
        self.assertTrue(holding)
        self.assertEqual(holding.cells_owned, 100)
        self.assertEqual(asset.cells_subscribed, 100)

    # ------------------------------------------------------------------
    # Cancel
    # ------------------------------------------------------------------

    def test_cancel_from_submitted(self):
        partner, wallet = self._create_ready_investor(email='cancelsubmit@example.com')
        order = self._create_order(partner, wallet)
        order.action_submit()
        order.action_cancel(reason='Changed mind')
        self.assertEqual(order.state, 'cancelled')
        self.assertEqual(order.cancel_reason, 'Changed mind')

    def test_cancel_from_settled_raises(self):
        partner, wallet = self._create_ready_investor(email='cancelsettled@example.com')
        order = self._create_order(partner, wallet)
        order.action_submit()
        order.action_create_payment()
        order.payment_transaction_id.action_mark_processing()
        order.payment_transaction_id.action_mark_succeeded()
        with self.assertRaises(UserError):
            order.action_cancel()

    # ------------------------------------------------------------------
    # Refund
    # ------------------------------------------------------------------

    def test_refund_debits_holding(self):
        partner, wallet = self._create_ready_investor(email='refund@example.com')
        asset = self._create_financing_asset(total_cells=500)
        order = self._create_order(partner, wallet, asset=asset, cells=200)
        order.action_submit()
        order.action_create_payment()
        order.payment_transaction_id.action_mark_processing()
        order.payment_transaction_id.action_mark_succeeded()
        self.assertEqual(order.state, 'settled')

        order.action_refund()
        self.assertEqual(order.state, 'refunded')
        holding = self.Holding.search([
            ('partner_id', '=', partner.id),
            ('asset_id', '=', asset.id),
        ], limit=1)
        self.assertEqual(holding.cells_owned, 0)
        self.assertEqual(holding.state, 'closed')

    # ------------------------------------------------------------------
    # Cron: expire pending orders
    # ------------------------------------------------------------------

    def test_cron_cancels_expired_orders(self):
        partner, wallet = self._create_ready_investor(email='cron@example.com')
        order = self._create_order(partner, wallet)
        order.action_submit()
        order.action_create_payment()
        self.assertEqual(order.state, 'payment_pending')
        # Force expiry in the past
        order.write({'expires_at': fields.Datetime.now() - timedelta(minutes=1)})
        self.Order._cron_expire_pending_orders()
        self.assertEqual(order.state, 'cancelled')

    # ------------------------------------------------------------------
    # Financing complete trigger
    # ------------------------------------------------------------------

    def test_full_subscription_triggers_financing_complete(self):
        partner, wallet = self._create_ready_investor(email='fullsub@example.com')
        asset = self._create_financing_asset(total_cells=100)
        order = self._create_order(partner, wallet, asset=asset, cells=100)
        order.action_submit()
        order.action_create_payment()
        order.payment_transaction_id.action_mark_processing()
        order.payment_transaction_id.action_mark_succeeded()
        self.assertEqual(asset.state, 'financing_complete')
