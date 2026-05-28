# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.asset — Solar installation tokenised on the platform.

One record per physical solar installation (or battery, EV charging hub, etc.).
The model covers the full lifecycle from draft specification to decommissioning.

State machine
-------------
draft → pending_approval    (action_request_approval)
pending_approval → financing (action_approve + on-chain token deployment)
pending_approval → cancelled (action_cancel)
financing → financing_complete  (automatic when cells_subscribed == total_cells)
financing → cancelled           (action_cancel, compliance only)
financing_complete → in_production (action_commission)
in_production → paused           (action_pause)
paused        → in_production    (action_resume)
in_production → mature           (cron: asset past project end date)
mature        → decommissioned   (action_decommission)
in_production → decommissioned   (action_decommission, exceptional)

Relations added by downstream addons
-------------------------------------
solar_holding    : holding_ids   (One2many)
                   cells_subscribed (Integer, updated on order settlement)
solar_investment : investment_order_ids (One2many)
solar_market     : market_order_ids     (One2many)
solar_yield      : distribution_ids     (One2many)
"""

import logging
import uuid as uuid_lib
from datetime import date

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Selection lists
# ---------------------------------------------------------------------------

ASSET_STATE_SELECTION = [
    ('draft',              'Draft'),
    ('pending_approval',   'Pending approval'),
    ('financing',          'Financing'),
    ('financing_complete', 'Financing complete'),
    ('in_production',      'In production'),
    ('paused',             'Paused'),
    ('mature',             'Mature'),
    ('decommissioned',     'Decommissioned'),
    ('cancelled',          'Cancelled'),
]

ASSET_TYPE_SELECTION = [
    ('solar_ground',      'Ground-mounted solar'),
    ('solar_canopy',      'Solar canopy / car park'),
    ('solar_industrial',  'Industrial rooftop'),
    ('solar_residential', 'Residential collective'),
    ('battery_storage',   'Battery storage (BESS)'),
    ('ev_charging',       'EV charging station (IRVE)'),
]

PPA_TYPE_SELECTION = [
    ('ppa_long_term',   'Long-term PPA (≥ 10 years)'),
    ('ppa_short_term',  'Short-term PPA (< 10 years)'),
    ('feed_in_tariff',  'Feed-in tariff'),
    ('spot_market',     'Spot market'),
    ('mixed',           'Mixed / Other'),
]

DISTRIBUTION_FREQUENCY_SELECTION = [
    ('monthly',   'Monthly'),
    ('quarterly', 'Quarterly'),
    ('biannual',  'Bi-annual'),
    ('annual',    'Annual'),
]

# States that are visible to investors via the public API
PUBLIC_STATES = ('financing', 'financing_complete', 'in_production', 'mature')


class SolarAsset(models.Model):
    """Solar installation tokenised on the SolarCells RWA platform."""

    _name        = 'solar.asset'
    _description = 'Solar Asset'
    _inherit     = ['mail.thread', 'mail.activity.mixin']
    _order       = 'code asc'
    _rec_name    = 'name'

    # ==================================================================
    # IDENTITY
    # ==================================================================

    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
    )
    code = fields.Char(
        string="Code",
        required=True,
        copy=False,
        index=True,
        help="Short unique identifier shown to investors (e.g. FR-PROV-01).",
    )
    name = fields.Char(
        string="Name",
        required=True,
        translate=True,
        tracking=True,
    )
    slug = fields.Char(
        string="URL slug",
        required=True,
        copy=False,
        index=True,
        help="Lowercase URL-friendly identifier used in frontend routes.",
    )

    # ==================================================================
    # STATE MACHINE
    # ==================================================================

    state = fields.Selection(
        selection=ASSET_STATE_SELECTION,
        string="State",
        default='draft',
        required=True,
        tracking=True,
        index=True,
    )

    # ==================================================================
    # GEOGRAPHY
    # ==================================================================

    country_id = fields.Many2one(
        'res.country',
        string="Country",
        required=True,
        tracking=True,
    )
    region = fields.Char(string="Region / Department")
    city   = fields.Char(string="City / Commune")
    latitude  = fields.Float(string="Latitude",  digits=(10, 7))
    longitude = fields.Float(string="Longitude", digits=(10, 7))

    # ==================================================================
    # TECHNICAL SPECIFICATIONS
    # ==================================================================

    asset_type = fields.Selection(
        selection=ASSET_TYPE_SELECTION,
        string="Asset type",
        required=True,
        default='solar_ground',
        tracking=True,
    )
    installed_power_mwc = fields.Float(
        string="Installed power (MWc / MWh)",
        digits=(10, 3),
        required=True,
        tracking=True,
        help="Peak power in MWc for solar, storage capacity in MWh for BESS.",
    )
    annual_production_mwh = fields.Float(
        string="Annual production (MWh)",
        digits=(12, 2),
        help="Estimated annual energy production based on PVSyst simulations.",
    )
    commissioning_date = fields.Date(
        string="Commissioning date",
        tracking=True,
        help="Date the installation was (or will be) connected to the grid.",
    )
    project_duration_years = fields.Integer(
        string="Project duration (years)",
        default=20,
        required=True,
        help="Expected operational lifetime of the asset (typically 20–25 years).",
    )
    project_end_date = fields.Date(
        string="Projected end date",
        compute='_compute_project_end_date',
        store=True,
    )

    @api.depends('commissioning_date', 'project_duration_years')
    def _compute_project_end_date(self):
        from dateutil.relativedelta import relativedelta
        for asset in self:
            if asset.commissioning_date and asset.project_duration_years:
                asset.project_end_date = (
                    asset.commissioning_date
                    + relativedelta(years=asset.project_duration_years)
                )
            else:
                asset.project_end_date = False

    # ==================================================================
    # FINANCIAL
    # ==================================================================

    currency_id = fields.Many2one(
        'res.currency',
        string="Currency",
        required=True,
        default=lambda self: self.env.ref('base.EUR', raise_if_not_found=False),
    )
    total_capital_raised = fields.Monetary(
        string="Total capital to raise",
        currency_field='currency_id',
        tracking=True,
        help="Total amount to be raised through Solar Cell subscriptions.",
    )
    cell_unit_price = fields.Monetary(
        string="Cell unit price",
        currency_field='currency_id',
        default=1.00,
        required=True,
        help="Price per Solar Cell (typically 1.00 EUR).",
    )
    total_cells = fields.Integer(
        string="Total Solar Cells",
        required=True,
        tracking=True,
        help="Total number of Solar Cells issued = total_capital / cell_unit_price.",
    )
    # cells_subscribed is maintained by solar_investment addon.
    # Default 0 here; solar_investment overrides via _inherit.
    cells_subscribed = fields.Integer(
        string="Cells subscribed",
        default=0,
        help="Total Solar Cells subscribed through settled investment orders. "
             "Updated by solar_investment addon on each settlement.",
    )
    cells_available = fields.Integer(
        string="Cells available",
        compute='_compute_cells_available',
        store=True,
        help="Remaining cells available for subscription: total_cells - cells_subscribed.",
    )
    target_yield_rate = fields.Float(
        string="Target yield rate (annual)",
        digits=(5, 4),
        tracking=True,
        help="Estimated annual net yield rate for investors (e.g. 0.0850 = 8.50%).",
    )

    @api.depends('total_cells', 'cells_subscribed')
    def _compute_cells_available(self):
        for asset in self:
            asset.cells_available = max(0, asset.total_cells - asset.cells_subscribed)

    # ==================================================================
    # PPA — Power Purchase Agreement
    # ==================================================================

    ppa_type = fields.Selection(
        selection=PPA_TYPE_SELECTION,
        string="PPA type",
        default='ppa_long_term',
    )
    ppa_price_per_kwh = fields.Float(
        string="PPA price (€/kWh)",
        digits=(6, 4),
    )
    ppa_duration_years = fields.Integer(
        string="PPA duration (years)",
    )
    ppa_buyer_id = fields.Many2one(
        'res.partner',
        string="PPA buyer / Offtaker",
        domain="[('is_company', '=', True)]",
    )

    # ==================================================================
    # OPERATIONS
    # ==================================================================

    operator_id = fields.Many2one(
        'res.partner',
        string="Solar operator",
        tracking=True,
        help="Company responsible for O&M of the installation.",
    )
    owner_spv_id = fields.Many2one(
        'res.partner',
        string="Owner SPV",
        domain="[('is_company', '=', True)]",
        tracking=True,
        help="Special Purpose Vehicle that legally owns the installation.",
    )
    insurance_provider = fields.Char(string="Insurance provider")
    insurance_policy_ref = fields.Char(string="Insurance policy reference")

    # ==================================================================
    # DISTRIBUTION
    # ==================================================================

    distribution_frequency = fields.Selection(
        selection=DISTRIBUTION_FREQUENCY_SELECTION,
        string="Distribution frequency",
        default='quarterly',
        required=True,
        tracking=True,
    )

    # ==================================================================
    # MARKETPLACE SETTINGS
    # ==================================================================

    is_secondary_market_enabled = fields.Boolean(
        string="Secondary market enabled",
        default=True,
        tracking=True,
        help="When True, investors can list their Solar Cells on the marketplace.",
    )
    geo_restriction_country_ids = fields.Many2many(
        'res.country',
        'solar_asset_geo_restriction_rel',
        'asset_id',
        'country_id',
        string="Restricted to countries",
        help="If set, only investors from these countries can invest. "
             "Empty = no restriction.",
    )

    # ==================================================================
    # CONTENT
    # ==================================================================

    description    = fields.Text(string="Description", translate=True)
    risk_disclosures = fields.Html(string="Risk disclosures", translate=True)
    image_url      = fields.Char(string="Main image URL")
    gallery_urls   = fields.Json(string="Gallery URLs", default=list)

    # ==================================================================
    # SUPPORTING DOCUMENTS (sub-model)
    # ==================================================================

    document_ids = fields.One2many(
        'solar.asset.document',
        'asset_id',
        string="Documents",
    )
    document_count = fields.Integer(
        compute='_compute_document_count',
        string="Docs",
    )

    def _compute_document_count(self):
        for asset in self:
            asset.document_count = len(asset.document_ids)

    # ==================================================================
    # ON-CHAIN TOKEN
    # ==================================================================

    on_chain_token_address = fields.Char(
        string="Token contract address",
        copy=False,
        tracking=True,
        help="Address of the ERC-3643 SolarToken smart contract on the blockchain.",
    )
    on_chain_token_symbol = fields.Char(
        string="Token symbol",
        copy=False,
        help="e.g. 'SCT-PROV-01'",
    )
    on_chain_deployed_at = fields.Datetime(
        string="Token deployed at",
        copy=False,
    )

    # ==================================================================
    # CONSTRAINTS
    # ==================================================================

    @api.constrains('code')
    def _check_code_unique(self):
        for asset in self:
            if self.search_count([('code', '=', asset.code), ('id', '!=', asset.id)]) > 0:
                raise ValidationError(_("Asset code '%s' is already used.") % asset.code)

    @api.constrains('slug')
    def _check_slug_unique(self):
        for asset in self:
            if self.search_count([('slug', '=', asset.slug), ('id', '!=', asset.id)]) > 0:
                raise ValidationError(_("Slug '%s' is already used.") % asset.slug)

    @api.constrains('total_cells', 'cell_unit_price', 'total_capital_raised')
    def _check_capital_consistency(self):
        for asset in self:
            if not (asset.total_cells and asset.cell_unit_price and asset.total_capital_raised):
                continue
            expected = asset.total_cells * asset.cell_unit_price
            if abs(expected - asset.total_capital_raised) > 0.01:
                raise ValidationError(_(
                    "Capital inconsistency on asset '%s': "
                    "total_cells (%d) × cell_unit_price (%.2f) = %.2f "
                    "but total_capital_raised = %.2f."
                ) % (asset.name, asset.total_cells, asset.cell_unit_price,
                     expected, asset.total_capital_raised))

    @api.constrains('state', 'on_chain_token_address')
    def _check_on_chain_deployed_before_financing(self):
        for asset in self:
            if asset.state == 'financing' and not asset.on_chain_token_address:
                raise ValidationError(_(
                    "Asset '%s' cannot transition to 'financing' without "
                    "an on-chain token address. Deploy the SolarToken contract first."
                ) % asset.name)

    @api.constrains('installed_power_mwc')
    def _check_power_positive(self):
        for asset in self:
            if asset.installed_power_mwc <= 0:
                raise ValidationError(_(
                    "Installed power must be positive (got %.3f on asset '%s')."
                ) % (asset.installed_power_mwc, asset.name))

    @api.constrains('total_cells')
    def _check_cells_positive(self):
        for asset in self:
            if asset.total_cells <= 0:
                raise ValidationError(_(
                    "Total cells must be positive (got %d on asset '%s')."
                ) % (asset.total_cells, asset.name))

    # ==================================================================
    # CRUD
    # ==================================================================

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('uuid'):
                vals['uuid'] = str(uuid_lib.uuid4())
            # Auto-generate slug from code if not provided
            if not vals.get('slug') and vals.get('code'):
                vals['slug'] = vals['code'].lower().replace(' ', '-').replace('_', '-')
        records = super().create(vals_list)
        for asset in records:
            self.env['solar.audit.log'].create_audit_entry(
                action_code='asset.created',
                subject=asset,
                after={'code': asset.code, 'name': asset.name, 'state': asset.state},
            )
        return records

    # ==================================================================
    # STATE TRANSITIONS
    # ==================================================================

    def _assert_state(self, expected, action):
        self.ensure_one()
        if self.state not in expected:
            raise UserError(_(
                "Cannot execute '%s' on asset '%s': current state is '%s'. Expected: %s."
            ) % (action, self.name, self.state,
                 ', '.join("'%s'" % s for s in expected)))

    def _check_required_fields(self, *field_names):
        missing = [f for f in field_names if not getattr(self, f, None)]
        if missing:
            raise UserError(_(
                "Asset '%s' is missing required fields before this action: %s."
            ) % (self.name, ', '.join(missing)))

    def action_request_approval(self):
        """draft → pending_approval."""
        self._assert_state(['draft'], 'Request approval')
        self._check_required_fields(
            'country_id', 'asset_type', 'installed_power_mwc',
            'total_cells', 'cell_unit_price', 'target_yield_rate',
        )
        before = self.state
        self.write({'state': 'pending_approval'})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='asset.approval.requested',
            subject=self,
            before={'state': before},
            after={'state': 'pending_approval'},
        )
        return True

    def action_approve(self):
        """pending_approval → financing.

        In production, this triggers on-chain SolarToken contract deployment
        via the Tempo Adapter. Here we set a placeholder address if none is set,
        so the constraint does not block the transition during testing.
        """
        self._assert_state(['pending_approval'], 'Approve')
        before = self.state
        # In production: call Tempo Adapter, then update on_chain_token_address
        # For now, accept if already set; operators must set it before approving.
        if not self.on_chain_token_address:
            raise UserError(_(
                "Cannot approve asset '%s': the on-chain token contract address "
                "must be set before approving (deploy SolarToken first)."
            ) % self.name)

        self.write({
            'state': 'financing',
            'on_chain_deployed_at': self.on_chain_deployed_at or fields.Datetime.now(),
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='asset.approved',
            subject=self,
            before={'state': before},
            after={'state': 'financing', 'on_chain_token_address': self.on_chain_token_address},
        )
        _logger.info("Asset '%s' approved and moved to financing.", self.name)
        return True

    def action_commission(self):
        """financing_complete → in_production."""
        self._assert_state(['financing_complete'], 'Commission')
        if not self.commissioning_date:
            raise UserError(_(
                "Cannot commission asset '%s': commissioning_date must be set."
            ) % self.name)
        before = self.state
        self.write({'state': 'in_production'})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='asset.commissioned',
            subject=self,
            before={'state': before},
            after={'state': 'in_production', 'commissioning_date': str(self.commissioning_date)},
        )
        _logger.info("Asset '%s' commissioned on %s.", self.name, self.commissioning_date)
        return True

    def action_pause(self):
        """in_production → paused. Stops distributions without closing accounts."""
        self._assert_state(['in_production'], 'Pause')
        before = self.state
        self.write({'state': 'paused', 'is_secondary_market_enabled': False})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='asset.paused',
            subject=self,
            before={'state': before},
            after={'state': 'paused'},
        )
        return True

    def action_resume(self):
        """paused → in_production."""
        self._assert_state(['paused'], 'Resume')
        before = self.state
        self.write({'state': 'in_production', 'is_secondary_market_enabled': True})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='asset.resumed',
            subject=self,
            before={'state': before},
            after={'state': 'in_production'},
        )
        return True

    def action_cancel(self):
        """pending_approval / financing → cancelled.

        Triggers the refund workflow for all settled investment orders.
        """
        self._assert_state(['pending_approval', 'financing'], 'Cancel')
        before = self.state
        self.write({'state': 'cancelled', 'is_secondary_market_enabled': False})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='asset.cancelled',
            subject=self,
            before={'state': before},
            after={'state': 'cancelled'},
        )
        # Downstream: solar_investment listens to this event and triggers refunds
        _logger.warning("Asset '%s' cancelled from state '%s'.", self.name, before)
        return True

    def action_decommission(self):
        """mature / in_production → decommissioned."""
        self._assert_state(['mature', 'in_production'], 'Decommission')
        before = self.state
        self.write({'state': 'decommissioned', 'is_secondary_market_enabled': False})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='asset.decommissioned',
            subject=self,
            before={'state': before},
            after={'state': 'decommissioned'},
        )
        return True

    def _auto_transition_financing_complete(self):
        """Called by solar_investment when cells_subscribed == total_cells."""
        self.ensure_one()
        if self.state == 'financing' and self.cells_subscribed >= self.total_cells:
            before = self.state
            self.write({'state': 'financing_complete'})
            self.env['solar.audit.log'].create_audit_entry(
                action_code='asset.financing.complete',
                subject=self,
                before={'state': before},
                after={'state': 'financing_complete'},
            )
            _logger.info("Asset '%s' fully subscribed — moved to financing_complete.", self.name)

    # ==================================================================
    # SCHEDULED ACTIONS
    # ==================================================================

    @api.model
    def _cron_auto_mature_assets(self):
        """Daily: transition in_production assets past their project end date to 'mature'."""
        today = date.today()
        candidates = self.search([
            ('state', '=', 'in_production'),
            ('project_end_date', '!=', False),
            ('project_end_date', '<=', str(today)),
        ])
        for asset in candidates:
            try:
                before = asset.state
                asset.write({'state': 'mature'})
                asset.env['solar.audit.log'].create_audit_entry(
                    action_code='asset.matured',
                    subject=asset,
                    before={'state': before},
                    after={'state': 'mature'},
                )
                _logger.info("Asset '%s' auto-transitioned to 'mature'.", asset.name)
            except Exception as exc:
                _logger.error("Failed to mature asset '%s': %s", asset.name, exc)
        return True

    # ==================================================================
    # JSON-RPC API
    # ==================================================================

    @api.model
    def get_public_catalog(self, filters=None):
        """Return assets visible to investors (financing, in_production, mature).

        :param dict filters: Optional filters: country, asset_type, min_yield, max_yield.
        :returns: list of asset summary dicts.
        """
        domain = [('state', 'in', list(PUBLIC_STATES))]
        filters = filters or {}

        if filters.get('country_id'):
            domain.append(('country_id', '=', filters['country_id']))
        if filters.get('asset_type'):
            domain.append(('asset_type', '=', filters['asset_type']))
        if filters.get('min_yield') is not None:
            domain.append(('target_yield_rate', '>=', filters['min_yield']))
        if filters.get('max_yield') is not None:
            domain.append(('target_yield_rate', '<=', filters['max_yield']))

        assets = self.search(domain)
        return [asset._to_catalog_dict() for asset in assets]

    def _to_catalog_dict(self):
        """Compact summary dict for the marketplace listing."""
        self.ensure_one()
        pct = (
            round(self.cells_subscribed / self.total_cells * 100)
            if self.total_cells else 0
        )
        return {
            'uuid':                 self.uuid,
            'code':                 self.code,
            'name':                 self.name,
            'slug':                 self.slug,
            'state':                self.state,
            'asset_type':           self.asset_type,
            'country_code':         self.country_id.code,
            'country_name':         self.country_id.name,
            'region':               self.region,
            'installed_power_mwc':  self.installed_power_mwc,
            'target_yield_rate':    self.target_yield_rate,
            'cell_unit_price':      self.cell_unit_price,
            'total_cells':          self.total_cells,
            'cells_subscribed':     self.cells_subscribed,
            'cells_available':      self.cells_available,
            'financing_pct':        pct,
            'distribution_frequency': self.distribution_frequency,
            'is_secondary_market_enabled': self.is_secondary_market_enabled,
            'image_url':            self.image_url,
        }

    def get_public_detail(self):
        """Full detail dict for the asset detail page (S09)."""
        self.ensure_one()
        base = self._to_catalog_dict()
        base.update({
            'description':           self.description,
            'risk_disclosures':      self.risk_disclosures,
            'gallery_urls':          self.gallery_urls or [],
            'annual_production_mwh': self.annual_production_mwh,
            'commissioning_date':    str(self.commissioning_date) if self.commissioning_date else None,
            'project_duration_years': self.project_duration_years,
            'ppa_type':              self.ppa_type,
            'ppa_price_per_kwh':     self.ppa_price_per_kwh,
            'ppa_duration_years':    self.ppa_duration_years,
            'on_chain_token_symbol': self.on_chain_token_symbol,
            'on_chain_token_address': self.on_chain_token_address,
            'operator':              self.operator_id.name if self.operator_id else None,
            'owner_spv':             self.owner_spv_id.name if self.owner_spv_id else None,
            'geo_restriction_country_codes': self.geo_restriction_country_ids.mapped('code'),
            'latitude':              self.latitude,
            'longitude':             self.longitude,
        })
        return base

    def simulate_investment(self, cells):
        """Return an investment simulation for a given number of cells.

        :param int cells: Number of cells to subscribe.
        :returns: dict with amount, fees, annual revenue estimate.
        """
        self.ensure_one()
        if cells <= 0:
            raise UserError(_("Number of cells must be positive."))
        if cells > self.cells_available:
            raise UserError(_(
                "Only %d cells are available on asset '%s' (requested: %d)."
            ) % (self.cells_available, self.name, cells))

        amount = cells * self.cell_unit_price
        platform_fee = 0.0  # included at MVP
        annual_revenue = amount * self.target_yield_rate
        quarterly_revenue = annual_revenue / 4

        return {
            'cells':               cells,
            'amount':              amount,
            'platform_fee':        platform_fee,
            'total_charged':       amount + platform_fee,
            'annual_revenue':      round(annual_revenue, 2),
            'quarterly_revenue':   round(quarterly_revenue, 2),
            'target_yield_rate':   self.target_yield_rate,
            'distribution_frequency': self.distribution_frequency,
        }
