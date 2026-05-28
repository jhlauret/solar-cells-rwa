# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for solar.asset.

Coverage:
  - Creation (UUID, slug auto-generation, defaults)
  - Field constraints (code unique, slug unique, capital consistency,
    power positive, cells positive)
  - State machine: all valid transitions + guards
  - on_chain_token_address required before approve
  - commissioning_date required before commission
  - cells_available computation
  - project_end_date computation
  - Cron: auto-mature past end date
  - API: get_public_catalog, get_public_detail, simulate_investment
"""

from datetime import date, timedelta

from odoo import fields
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, ValidationError


@tagged('post_install', '-at_install', 'solar_asset')
class TestSolarAsset(TransactionCase):
    """Unit tests for solar.asset."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Asset   = cls.env['solar.asset']
        cls.france  = cls.env.ref('base.fr')
        cls.eur     = cls.env.ref('base.EUR')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_asset(self, **kwargs):
        defaults = {
            'code':                  f'TST-{id(kwargs)}',
            'name':                  'Test Solar Asset',
            'country_id':             self.france.id,
            'asset_type':            'solar_ground',
            'installed_power_mwc':   5.0,
            'currency_id':            self.eur.id,
            'total_cells':           100000,
            'cell_unit_price':       1.00,
            'total_capital_raised':  100000.00,
            'target_yield_rate':     0.085,
            'distribution_frequency':'quarterly',
        }
        defaults.update(kwargs)
        return self.Asset.create(defaults)

    def _bring_to_state(self, asset, target_state):
        """Bring asset to a target state by running necessary transitions."""
        if target_state in ('draft',):
            return
        if asset.state == 'draft':
            asset.write({'on_chain_token_address': '0x' + 'a' * 40})
            asset.action_request_approval()
        if target_state == 'pending_approval':
            return
        if asset.state == 'pending_approval':
            asset.action_approve()
        if target_state == 'financing':
            return
        if asset.state == 'financing':
            asset.write({
                'cells_subscribed': asset.total_cells,
                'state': 'financing_complete',
            })
        if target_state == 'financing_complete':
            return
        if asset.state == 'financing_complete':
            asset.write({'commissioning_date': date.today()})
            asset.action_commission()
        if target_state == 'in_production':
            return
        if target_state == 'paused':
            asset.action_pause()
        if target_state == 'mature':
            asset.write({'state': 'mature'})
        if target_state == 'decommissioned':
            asset.write({'state': 'mature'})
            asset.action_decommission()

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_uuid_generated(self):
        asset = self._create_asset()
        self.assertEqual(len(asset.uuid), 36)

    def test_slug_auto_generated_from_code(self):
        asset = self._create_asset(code='FR-PROV-01')
        self.assertEqual(asset.slug, 'fr-prov-01')

    def test_initial_state_draft(self):
        asset = self._create_asset()
        self.assertEqual(asset.state, 'draft')

    def test_cells_available_computed(self):
        asset = self._create_asset()
        self.assertEqual(asset.cells_available, asset.total_cells)
        asset.write({'cells_subscribed': 30000})
        self.assertEqual(asset.cells_available, 70000)

    def test_project_end_date_computed(self):
        today = date.today()
        asset = self._create_asset(
            commissioning_date=today,
            project_duration_years=20,
        )
        from dateutil.relativedelta import relativedelta
        expected = today + relativedelta(years=20)
        self.assertEqual(asset.project_end_date, expected)

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------

    def test_code_unique_constraint(self):
        self._create_asset(code='UNIQUE-CODE')
        with self.assertRaises(ValidationError):
            self._create_asset(code='UNIQUE-CODE')

    def test_slug_unique_constraint(self):
        self._create_asset(code='SLG-01', slug='my-unique-slug')
        with self.assertRaises(ValidationError):
            self._create_asset(code='SLG-02', slug='my-unique-slug')

    def test_capital_consistency_constraint(self):
        with self.assertRaises(ValidationError):
            self._create_asset(
                total_cells=100000,
                cell_unit_price=1.00,
                total_capital_raised=99000.00,  # wrong: should be 100000
            )

    def test_power_must_be_positive(self):
        with self.assertRaises(ValidationError):
            self._create_asset(installed_power_mwc=0.0)

    def test_total_cells_must_be_positive(self):
        with self.assertRaises(ValidationError):
            self._create_asset(total_cells=0, total_capital_raised=0)

    # ------------------------------------------------------------------
    # State machine — valid transitions
    # ------------------------------------------------------------------

    def test_request_approval(self):
        asset = self._create_asset()
        asset.action_request_approval()
        self.assertEqual(asset.state, 'pending_approval')

    def test_approve_requires_on_chain_address(self):
        asset = self._create_asset()
        asset.action_request_approval()
        with self.assertRaises(UserError):
            asset.action_approve()

    def test_approve_with_on_chain_address(self):
        asset = self._create_asset()
        asset.action_request_approval()
        asset.write({'on_chain_token_address': '0x' + 'b' * 40})
        asset.action_approve()
        self.assertEqual(asset.state, 'financing')

    def test_commission_requires_date(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'financing_complete')
        asset.write({'commissioning_date': False})
        with self.assertRaises(UserError):
            asset.action_commission()

    def test_commission_success(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'financing_complete')
        asset.write({'commissioning_date': date.today()})
        asset.action_commission()
        self.assertEqual(asset.state, 'in_production')

    def test_pause_and_resume(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'in_production')
        asset.action_pause()
        self.assertEqual(asset.state, 'paused')
        asset.action_resume()
        self.assertEqual(asset.state, 'in_production')

    def test_cancel_from_pending_approval(self):
        asset = self._create_asset()
        asset.action_request_approval()
        asset.action_cancel()
        self.assertEqual(asset.state, 'cancelled')

    def test_decommission_from_mature(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'mature')
        asset.action_decommission()
        self.assertEqual(asset.state, 'decommissioned')

    # ------------------------------------------------------------------
    # State machine — invalid guards
    # ------------------------------------------------------------------

    def test_cannot_approve_from_draft(self):
        asset = self._create_asset()
        with self.assertRaises(UserError):
            asset.action_approve()

    def test_cannot_pause_from_draft(self):
        asset = self._create_asset()
        with self.assertRaises(UserError):
            asset.action_pause()

    def test_cannot_cancel_from_in_production(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'in_production')
        with self.assertRaises(UserError):
            asset.action_cancel()

    # ------------------------------------------------------------------
    # Cron
    # ------------------------------------------------------------------

    def test_cron_matures_assets_past_end_date(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'in_production')
        # Set project end date in the past
        asset.write({'project_end_date': date.today() - timedelta(days=1)})
        self.Asset._cron_auto_mature_assets()
        self.assertEqual(asset.state, 'mature')

    def test_cron_does_not_mature_future_assets(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'in_production')
        # project_end_date is 20 years in future by default
        self.Asset._cron_auto_mature_assets()
        self.assertEqual(asset.state, 'in_production')

    # ------------------------------------------------------------------
    # API
    # ------------------------------------------------------------------

    def test_get_public_catalog_excludes_draft(self):
        # draft asset
        self._create_asset(code='DRAFT-01')
        # public asset
        pub = self._create_asset(code='PUB-01')
        self._bring_to_state(pub, 'in_production')
        catalog = self.Asset.get_public_catalog()
        codes = [a['code'] for a in catalog]
        self.assertNotIn('DRAFT-01', codes)
        self.assertIn('PUB-01', codes)

    def test_simulate_investment(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'financing')
        result = asset.simulate_investment(100)
        self.assertEqual(result['cells'], 100)
        self.assertAlmostEqual(result['amount'], 100.0)
        self.assertAlmostEqual(result['annual_revenue'], 100 * 0.085)

    def test_simulate_investment_exceeds_available_raises(self):
        asset = self._create_asset()
        self._bring_to_state(asset, 'financing')
        with self.assertRaises(UserError):
            asset.simulate_investment(asset.total_cells + 1)
