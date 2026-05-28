# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""Tests for solar.market.order and solar.market.trade."""

from datetime import timedelta
from odoo import fields
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, ValidationError


@tagged('post_install', '-at_install', 'solar_market')
class TestSolarMarket(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Order   = cls.env['solar.market.order']
        cls.Trade   = cls.env['solar.market.trade']
        cls.Partner = cls.env['res.partner']
        cls.Asset   = cls.env['solar.asset']
        cls.Holding = cls.env['solar.holding']
        cls.KycCase = cls.env['solar.kyc.case']
        cls.KycDoc  = cls.env['solar.kyc.document']
        cls.Wallet  = cls.env['solar.wallet']
        cls.france  = cls.env.ref('base.fr')
        cls.eur     = cls.env.ref('base.EUR')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _ready_investor(self, email=None):
        p = self.Partner.create({
            'name': 'MktInv', 'x_is_investor': True,
            'email': email or f'mkt.{id(self)}@x.com',
            'country_id': self.france.id,
        })
        case = self.KycCase.create({'partner_id': p.id})
        for dt in ['identity_card', 'selfie_liveness', 'proof_of_address']:
            self.KycDoc.create({
                'case_id': case.id, 'document_type': dt,
                'minio_path': f'kyc/{dt}.pdf', 'sha256_hash': 'a'*64,
                'mime_type': 'application/pdf', 'file_size_bytes': 512,
            })
        case.action_submit()
        case.action_approve(kyc_level='L2')
        p.write({'x_kyc_case_id': case.id})
        w = self.Wallet.create({
            'partner_id': p.id, 'provider_vault_id': f'v{id(p)}',
            'address': '0x' + format(id(p) % (16**40), '040x'),
        })
        w.action_activate()
        w.action_whitelist_on_chain()
        return p, w

    def _financing_asset(self, cells=1000):
        return self.Asset.create({
            'code': f'MKT-{id(self)}', 'name': 'MktAsset',
            'country_id': self.france.id, 'asset_type': 'solar_ground',
            'installed_power_mwc': 1.0, 'currency_id': self.eur.id,
            'total_cells': cells, 'cell_unit_price': 1.0,
            'total_capital_raised': float(cells),
            'target_yield_rate': 0.08, 'distribution_frequency': 'quarterly',
            'on_chain_token_address': '0x'+'f'*40, 'state': 'in_production',
            'is_secondary_market_enabled': True,
        })

    def _give_holding(self, partner, asset, cells=200):
        h = self.Holding.get_or_create(partner, asset)
        h.credit_cells(cells, 1.0)
        return h

    # ------------------------------------------------------------------
    # Market Order creation
    # ------------------------------------------------------------------

    def test_order_uuid_generated(self):
        seller, _ = self._ready_investor(email='s1@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 100)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 50, 'price_per_cell': 1.02,
        })
        self.assertEqual(len(o.uuid), 36)

    def test_order_name_uses_sequence(self):
        seller, _ = self._ready_investor(email='s2@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 100)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 50, 'price_per_cell': 1.0,
        })
        self.assertTrue(o.name.startswith('MKT-'))

    def test_cells_positive_constraint(self):
        seller, _ = self._ready_investor(email='s3@x.com')
        asset = self._financing_asset()
        with self.assertRaises(ValidationError):
            self.Order.create({
                'partner_id': seller.id, 'asset_id': asset.id,
                'direction': 'sell', 'cells_offered': 0, 'price_per_cell': 1.0,
            })

    def test_total_amount_computed(self):
        seller, _ = self._ready_investor(email='s4@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 200)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 100, 'price_per_cell': 1.05,
        })
        self.assertAlmostEqual(o.total_amount, 105.0)

    # ------------------------------------------------------------------
    # Publish guards
    # ------------------------------------------------------------------

    def test_publish_requires_kyc(self):
        p = self.Partner.create({
            'name': 'NoKYC', 'x_is_investor': True,
            'email': 'nokyc2@x.com', 'country_id': self.france.id,
        })
        asset = self._financing_asset()
        o = self.Order.create({
            'partner_id': p.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 10, 'price_per_cell': 1.0,
        })
        with self.assertRaises(UserError):
            o.action_publish()

    def test_publish_requires_sufficient_cells(self):
        seller, _ = self._ready_investor(email='insuf@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 50)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 200, 'price_per_cell': 1.0,
        })
        with self.assertRaises(UserError):
            o.action_publish()

    def test_publish_succeeds(self):
        seller, _ = self._ready_investor(email='pub@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 200)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 100, 'price_per_cell': 1.0,
        })
        o.action_publish()
        self.assertEqual(o.state, 'published')
        self.assertIsNotNone(o.expires_at)

    def test_cancel_published_order(self):
        seller, _ = self._ready_investor(email='canc@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 100)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 50, 'price_per_cell': 1.0,
        })
        o.action_publish()
        o.action_cancel()
        self.assertEqual(o.state, 'cancelled')

    # ------------------------------------------------------------------
    # Cron
    # ------------------------------------------------------------------

    def test_cron_expires_overdue_orders(self):
        seller, _ = self._ready_investor(email='exp@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 100)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 50, 'price_per_cell': 1.0,
        })
        o.action_publish()
        o.write({'expires_at': fields.Datetime.now() - timedelta(days=1)})
        self.Order._cron_expire_market_orders()
        self.assertEqual(o.state, 'expired')

    # ------------------------------------------------------------------
    # Trade settlement
    # ------------------------------------------------------------------

    def test_trade_settle_transfers_cells(self):
        seller, _ = self._ready_investor(email='tsell@x.com')
        buyer,  _ = self._ready_investor(email='tbuy@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 300)

        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 100, 'price_per_cell': 1.02,
        })
        o.action_publish()

        t = self.Trade.create({
            'order_id': o.id, 'seller_id': seller.id, 'buyer_id': buyer.id,
            'asset_id': asset.id, 'cells_traded': 100, 'price_per_cell': 1.02,
        })
        t.action_settle()

        self.assertEqual(t.state, 'settled')
        # Seller debited
        sh = self.Holding.search([
            ('partner_id', '=', seller.id), ('asset_id', '=', asset.id)])
        self.assertEqual(sh.cells_owned, 200)
        # Buyer credited
        bh = self.Holding.search([
            ('partner_id', '=', buyer.id), ('asset_id', '=', asset.id)])
        self.assertEqual(bh.cells_owned, 100)

    def test_trade_settle_updates_order_state(self):
        seller, _ = self._ready_investor(email='tord@x.com')
        buyer,  _ = self._ready_investor(email='tbord@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 100)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 100, 'price_per_cell': 1.0,
        })
        o.action_publish()
        t = self.Trade.create({
            'order_id': o.id, 'seller_id': seller.id, 'buyer_id': buyer.id,
            'asset_id': asset.id, 'cells_traded': 100, 'price_per_cell': 1.0,
        })
        t.action_settle()
        self.assertEqual(o.state, 'filled')
        self.assertEqual(o.cells_remaining, 0)

    def test_trade_partial_fill(self):
        seller, _ = self._ready_investor(email='part@x.com')
        buyer,  _ = self._ready_investor(email='bpart@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 200)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 200, 'price_per_cell': 1.0,
        })
        o.action_publish()
        t = self.Trade.create({
            'order_id': o.id, 'seller_id': seller.id, 'buyer_id': buyer.id,
            'asset_id': asset.id, 'cells_traded': 50, 'price_per_cell': 1.0,
        })
        t.action_settle()
        self.assertEqual(o.state, 'partial')
        self.assertEqual(o.cells_remaining, 150)

    def test_trade_already_settled_raises(self):
        seller, _ = self._ready_investor(email='dup@x.com')
        buyer,  _ = self._ready_investor(email='bdup@x.com')
        asset = self._financing_asset()
        self._give_holding(seller, asset, 100)
        o = self.Order.create({
            'partner_id': seller.id, 'asset_id': asset.id,
            'direction': 'sell', 'cells_offered': 100, 'price_per_cell': 1.0,
        })
        o.action_publish()
        t = self.Trade.create({
            'order_id': o.id, 'seller_id': seller.id, 'buyer_id': buyer.id,
            'asset_id': asset.id, 'cells_traded': 100, 'price_per_cell': 1.0,
        })
        t.action_settle()
        with self.assertRaises(UserError):
            t.action_settle()
