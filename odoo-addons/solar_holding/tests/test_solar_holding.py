# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for solar.holding.

Coverage:
  - Creation (UUID, defaults, unique constraint)
  - credit_cells: first credit, subsequent credit, weighted average
  - debit_cells: partial debit, full debit (→ closed), over-debit raises
  - cells_owned non-negative constraint
  - asset.cells_subscribed updated on credit/debit
  - auto_transition_financing_complete triggered on full subscription
  - get_or_create idempotency
  - res.partner computed portfolio totals
  - Summary dict fields
"""

from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, ValidationError


@tagged('post_install', '-at_install', 'solar_holding')
class TestSolarHolding(TransactionCase):
    """Unit tests for solar.holding."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Holding = cls.env['solar.holding']
        cls.Partner = cls.env['res.partner']
        cls.Asset   = cls.env['solar.asset']
        cls.france  = cls.env.ref('base.fr')
        cls.eur     = cls.env.ref('base.EUR')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_investor(self, email=None):
        return self.Partner.create({
            'name':          'Holding Investor',
            'email':         email or f'holding.{id(self)}@example.com',
            'x_is_investor': True,
            'country_id':    self.france.id,
        })

    def _create_asset(self, total_cells=10000, state='financing'):
        asset = self.Asset.create({
            'code':                 f'HLD-{id(self)}',
            'name':                 'Holding Test Asset',
            'country_id':           self.france.id,
            'asset_type':           'solar_ground',
            'installed_power_mwc':  1.0,
            'currency_id':          self.eur.id,
            'total_cells':          total_cells,
            'cell_unit_price':      1.00,
            'total_capital_raised': float(total_cells),
            'target_yield_rate':    0.08,
            'distribution_frequency': 'quarterly',
        })
        if state != 'draft':
            asset.write({
                'state': state,
                'on_chain_token_address': '0x' + 'c' * 40,
            })
        return asset

    def _create_holding(self, partner=None, asset=None):
        if partner is None:
            partner = self._create_investor()
        if asset is None:
            asset = self._create_asset()
        return self.Holding.create({
            'partner_id': partner.id,
            'asset_id':   asset.id,
        })

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_uuid_generated(self):
        h = self._create_holding()
        self.assertEqual(len(h.uuid), 36)

    def test_initial_state_active(self):
        h = self._create_holding()
        self.assertEqual(h.state, 'active')

    def test_initial_cells_zero(self):
        h = self._create_holding()
        self.assertEqual(h.cells_owned, 0)

    def test_unique_constraint_partner_asset(self):
        partner = self._create_investor()
        asset   = self._create_asset()
        self.Holding.create({'partner_id': partner.id, 'asset_id': asset.id})
        with self.assertRaises(ValidationError):
            self.Holding.create({'partner_id': partner.id, 'asset_id': asset.id})

    # ------------------------------------------------------------------
    # credit_cells
    # ------------------------------------------------------------------

    def test_credit_cells_first_time(self):
        h = self._create_holding()
        h.credit_cells(100, 1.00)
        self.assertEqual(h.cells_owned, 100)
        self.assertAlmostEqual(h.average_acquisition_price, 1.00)
        self.assertAlmostEqual(h.total_invested, 100.00)
        self.assertIsNotNone(h.first_acquired_at)

    def test_credit_cells_subsequent_weighted_average(self):
        """Weighted average: (100×1.00 + 200×1.50) / 300 = 1.33..."""
        h = self._create_holding()
        h.credit_cells(100, 1.00)
        h.credit_cells(200, 1.50)
        self.assertEqual(h.cells_owned, 300)
        expected_avg = (100 * 1.00 + 200 * 1.50) / 300
        self.assertAlmostEqual(h.average_acquisition_price, expected_avg, places=4)
        self.assertAlmostEqual(h.total_invested, 100 + 300, places=2)

    def test_credit_cells_updates_asset_cells_subscribed(self):
        asset = self._create_asset(total_cells=1000)
        h = self._create_holding(asset=asset)
        self.assertEqual(asset.cells_subscribed, 0)
        h.credit_cells(400, 1.00)
        self.assertEqual(asset.cells_subscribed, 400)

    def test_credit_zero_cells_raises(self):
        h = self._create_holding()
        with self.assertRaises(UserError):
            h.credit_cells(0, 1.00)

    def test_credit_negative_price_raises(self):
        h = self._create_holding()
        with self.assertRaises(UserError):
            h.credit_cells(10, -1.00)

    # ------------------------------------------------------------------
    # debit_cells
    # ------------------------------------------------------------------

    def test_debit_cells_partial(self):
        h = self._create_holding()
        h.credit_cells(500, 1.00)
        h.debit_cells(200)
        self.assertEqual(h.cells_owned, 300)
        self.assertEqual(h.state, 'active')

    def test_debit_all_cells_closes_holding(self):
        h = self._create_holding()
        h.credit_cells(100, 1.00)
        h.debit_cells(100)
        self.assertEqual(h.cells_owned, 0)
        self.assertEqual(h.state, 'closed')

    def test_debit_more_than_owned_raises(self):
        h = self._create_holding()
        h.credit_cells(50, 1.00)
        with self.assertRaises(UserError):
            h.debit_cells(51)

    def test_debit_updates_asset_cells_subscribed(self):
        asset = self._create_asset()
        h = self._create_holding(asset=asset)
        h.credit_cells(300, 1.00)
        self.assertEqual(asset.cells_subscribed, 300)
        h.debit_cells(100)
        self.assertEqual(asset.cells_subscribed, 200)

    def test_debit_zero_raises(self):
        h = self._create_holding()
        h.credit_cells(10, 1.00)
        with self.assertRaises(UserError):
            h.debit_cells(0)

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------

    def test_cells_owned_cannot_be_negative(self):
        h = self._create_holding()
        with self.assertRaises(ValidationError):
            h.write({'cells_owned': -1})

    # ------------------------------------------------------------------
    # Auto-transition financing_complete
    # ------------------------------------------------------------------

    def test_full_subscription_triggers_financing_complete(self):
        asset = self._create_asset(total_cells=100, state='financing')
        h = self._create_holding(asset=asset)
        h.credit_cells(100, 1.00)
        self.assertEqual(asset.state, 'financing_complete')

    def test_partial_subscription_does_not_trigger(self):
        asset = self._create_asset(total_cells=100, state='financing')
        h = self._create_holding(asset=asset)
        h.credit_cells(50, 1.00)
        self.assertEqual(asset.state, 'financing')

    # ------------------------------------------------------------------
    # get_or_create
    # ------------------------------------------------------------------

    def test_get_or_create_creates(self):
        partner = self._create_investor()
        asset   = self._create_asset()
        h = self.Holding.get_or_create(partner, asset)
        self.assertEqual(h.partner_id.id, partner.id)
        self.assertEqual(h.asset_id.id,   asset.id)

    def test_get_or_create_idempotent(self):
        partner = self._create_investor()
        asset   = self._create_asset()
        h1 = self.Holding.get_or_create(partner, asset)
        h2 = self.Holding.get_or_create(partner, asset)
        self.assertEqual(h1.id, h2.id)

    # ------------------------------------------------------------------
    # Computed fields
    # ------------------------------------------------------------------

    def test_current_value_computed(self):
        h = self._create_holding()
        h.credit_cells(200, 1.00)
        # asset.cell_unit_price = 1.00
        self.assertAlmostEqual(h.current_value, 200.0)

    def test_unrealised_gain_computed(self):
        h = self._create_holding()
        h.credit_cells(200, 0.80)   # paid 0.80, worth 1.00
        self.assertAlmostEqual(h.total_invested, 160.0)
        self.assertAlmostEqual(h.current_value,  200.0)
        self.assertAlmostEqual(h.unrealised_gain, 40.0)

    # ------------------------------------------------------------------
    # Summary dict
    # ------------------------------------------------------------------

    def test_summary_dict_fields(self):
        h = self._create_holding()
        h.credit_cells(100, 1.00)
        summary = h.get_summary_dict()
        self.assertIn('uuid', summary)
        self.assertIn('cells_owned', summary)
        self.assertIn('total_invested', summary)
        self.assertIn('unrealised_gain', summary)
        self.assertEqual(summary['cells_owned'], 100)
