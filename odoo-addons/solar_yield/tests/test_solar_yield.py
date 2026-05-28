# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""Tests for solar.yield.distribution and solar.yield.line."""

from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError


@tagged('post_install', '-at_install', 'solar_yield')
class TestSolarYield(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Dist    = cls.env['solar.yield.distribution']
        cls.Line    = cls.env['solar.yield.line']
        cls.Holding = cls.env['solar.holding']
        cls.Partner = cls.env['res.partner']
        cls.Asset   = cls.env['solar.asset']
        cls.france  = cls.env.ref('base.fr')
        cls.eur     = cls.env.ref('base.EUR')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _investor(self, email=None):
        return self.Partner.create({
            'name': 'YldInvestor', 'x_is_investor': True,
            'email': email or f'yld.{id(self)}@x.com',
            'country_id': self.france.id,
        })

    def _prod_asset(self, cells=10000):
        return self.Asset.create({
            'code': f'YLD-{id(self)}', 'name': 'YldAsset',
            'country_id': self.france.id, 'asset_type': 'solar_ground',
            'installed_power_mwc': 1.0, 'currency_id': self.eur.id,
            'total_cells': cells, 'cell_unit_price': 1.0,
            'total_capital_raised': float(cells),
            'target_yield_rate': 0.085, 'distribution_frequency': 'quarterly',
            'on_chain_token_address': '0x'+'e'*40, 'state': 'in_production',
        })

    def _with_holding(self, partner, asset, cells):
        h = self.Holding.get_or_create(partner, asset)
        h.credit_cells(cells, 1.0)
        return h

    def _create_dist(self, asset, gross_revenue=1000.0):
        from odoo import fields as F
        return self.Dist.create({
            'asset_id': asset.id, 'period': 'Q1',
            'year': 2025,
            'distribution_date': F.Date.today(),
            'gross_revenue': gross_revenue,
        })

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_distribution_uuid_generated(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        self.assertEqual(len(d.uuid), 36)

    def test_distribution_name_uses_sequence(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        self.assertTrue(d.name.startswith('YLD-'))

    def test_initial_state_draft(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        self.assertEqual(d.state, 'draft')

    # ------------------------------------------------------------------
    # action_validate
    # ------------------------------------------------------------------

    def test_validate_locks_per_cell(self):
        asset = self._prod_asset(cells=10000)
        d = self._create_dist(asset, gross_revenue=850.0)
        d.action_validate()
        self.assertAlmostEqual(d.distribution_per_cell, 850.0 / 10000, places=6)
        self.assertEqual(d.state, 'validated')

    def test_validate_creates_lines_for_active_holdings(self):
        asset = self._prod_asset(cells=10000)
        p1 = self._investor(email='y1@x.com')
        p2 = self._investor(email='y2@x.com')
        self._with_holding(p1, asset, 1000)
        self._with_holding(p2, asset, 500)
        d = self._create_dist(asset, gross_revenue=1000.0)
        d.action_validate()
        self.assertEqual(d.line_count, 2)

    def test_validate_no_lines_if_no_holdings(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        d.action_validate()
        self.assertEqual(d.line_count, 0)

    def test_line_amount_proportional_to_cells(self):
        asset = self._prod_asset(cells=1000)
        p1 = self._investor(email='prop1@x.com')
        p2 = self._investor(email='prop2@x.com')
        self._with_holding(p1, asset, 300)
        self._with_holding(p2, asset, 700)
        d = self._create_dist(asset, gross_revenue=100.0)
        d.action_validate()
        l1 = d.line_ids.filtered(lambda l: l.partner_id == p1)
        l2 = d.line_ids.filtered(lambda l: l.partner_id == p2)
        self.assertAlmostEqual(l1.amount_gross, 30.0, places=2)
        self.assertAlmostEqual(l2.amount_gross, 70.0, places=2)

    def test_cannot_validate_twice(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        d.action_validate()
        with self.assertRaises(UserError):
            d.action_validate()

    def test_cancel_from_draft(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        d.action_cancel()
        self.assertEqual(d.state, 'cancelled')

    def test_cannot_cancel_from_completed(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        d.action_validate()
        d.action_pay_all()
        with self.assertRaises(UserError):
            d.action_cancel()

    # ------------------------------------------------------------------
    # action_pay_all
    # ------------------------------------------------------------------

    def test_pay_all_marks_lines_paid(self):
        asset = self._prod_asset(cells=1000)
        p = self._investor(email='pay1@x.com')
        self._with_holding(p, asset, 500)
        d = self._create_dist(asset, gross_revenue=50.0)
        d.action_validate()
        d.action_pay_all()
        for line in d.line_ids:
            self.assertEqual(line.state, 'paid')
        self.assertEqual(d.state, 'completed')

    def test_pay_all_updates_holding_total_yield(self):
        asset = self._prod_asset(cells=1000)
        p = self._investor(email='pay2@x.com')
        h = self._with_holding(p, asset, 1000)
        d = self._create_dist(asset, gross_revenue=85.0)
        d.action_validate()
        initial_yield = h.total_yield_received
        d.action_pay_all()
        self.assertGreater(h.total_yield_received, initial_yield)

    def test_pay_all_creates_payment_transactions(self):
        asset = self._prod_asset(cells=1000)
        p = self._investor(email='pay3@x.com')
        p.write({'x_iban': 'FR7630006000012345678901189'})
        self._with_holding(p, asset, 1000)
        d = self._create_dist(asset, gross_revenue=100.0)
        d.action_validate()
        d.action_pay_all()
        for line in d.line_ids:
            self.assertTrue(line.payment_transaction_id)
            self.assertEqual(line.payment_transaction_id.state, 'succeeded')

    # ------------------------------------------------------------------
    # yield.line.action_pay
    # ------------------------------------------------------------------

    def test_line_pay_already_paid_raises(self):
        asset = self._prod_asset(cells=1000)
        p = self._investor(email='lp1@x.com')
        self._with_holding(p, asset, 500)
        d = self._create_dist(asset, gross_revenue=50.0)
        d.action_validate()
        line = d.line_ids[0]
        line.action_pay()
        with self.assertRaises(UserError):
            line.action_pay()

    # ------------------------------------------------------------------
    # Extensions
    # ------------------------------------------------------------------

    def test_asset_distribution_ids(self):
        asset = self._prod_asset()
        d = self._create_dist(asset)
        self.assertIn(d, asset.distribution_ids)

    def test_holding_yield_line_ids(self):
        asset = self._prod_asset(cells=1000)
        p = self._investor(email='ext@x.com')
        h = self._with_holding(p, asset, 500)
        d = self._create_dist(asset, gross_revenue=50.0)
        d.action_validate()
        self.assertTrue(len(h.yield_line_ids) > 0)
