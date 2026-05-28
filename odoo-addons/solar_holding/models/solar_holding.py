# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.holding — Investor position in a solar asset.

One record per (partner_id, asset_id) pair.  A holding is created on the
investor's first subscription to an asset, then updated on each subsequent
subscription or market trade.

Weighted average price
----------------------
When cells are added:
    new_avg = (old_cells * old_price + new_cells * new_price) / (old_cells + new_cells)

Called by
---------
- solar_investment  → credit_cells() after an investment order is settled
- solar_market      → debit_cells()  after a market trade is settled
- solar_yield       → adds yield_line_ids via _inherit
"""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)


class SolarHolding(models.Model):
    """Investor position in one solar asset."""

    _name        = 'solar.holding'
    _description = 'Solar Holding'
    _order       = 'last_updated_at desc'
    _rec_name    = 'display_name'

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------

    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
    )

    # ------------------------------------------------------------------
    # Core relations
    # ------------------------------------------------------------------

    partner_id = fields.Many2one(
        'res.partner',
        string="Investor",
        required=True,
        ondelete='restrict',
        index=True,
        tracking=True,
    )
    asset_id = fields.Many2one(
        'solar.asset',
        string="Asset",
        required=True,
        ondelete='restrict',
        index=True,
        tracking=True,
    )
    wallet_id = fields.Many2one(
        'solar.wallet',
        string="Custody wallet",
        domain="[('partner_id','=',partner_id),('state','=','active')]",
        help="Wallet where the Solar Cells are held on-chain.",
    )

    # ------------------------------------------------------------------
    # Position
    # ------------------------------------------------------------------

    cells_owned = fields.Integer(
        string="Solar Cells owned",
        default=0,
        tracking=True,
    )
    average_acquisition_price = fields.Monetary(
        string="Average acquisition price",
        currency_field='currency_id',
        help="Weighted average price paid per Solar Cell across all subscriptions.",
    )
    total_invested = fields.Monetary(
        string="Total invested",
        currency_field='currency_id',
        help="Cumulative amount invested in this asset (not adjusted for market trades).",
    )
    currency_id = fields.Many2one(
        related='asset_id.currency_id',
        store=True,
        readonly=True,
    )

    # ------------------------------------------------------------------
    # Yield (populated by solar_yield addon)
    # ------------------------------------------------------------------

    total_yield_received = fields.Monetary(
        string="Total yield received",
        currency_field='currency_id',
        default=0.0,
        help="Cumulative yield credited to this holding. "
             "Updated by solar_yield on each distribution.",
    )

    # ------------------------------------------------------------------
    # Computed
    # ------------------------------------------------------------------

    current_value = fields.Monetary(
        string="Current value (nominal)",
        currency_field='currency_id',
        compute='_compute_current_value',
        store=True,
        help="cells_owned × asset cell_unit_price (nominal, not market value).",
    )
    unrealised_gain = fields.Monetary(
        string="Unrealised gain/loss",
        currency_field='currency_id',
        compute='_compute_current_value',
        store=True,
        help="current_value − total_invested.",
    )

    @api.depends('cells_owned', 'asset_id.cell_unit_price')
    def _compute_current_value(self):
        for h in self:
            h.current_value  = h.cells_owned * h.asset_id.cell_unit_price
            h.unrealised_gain = h.current_value - h.total_invested

    display_name = fields.Char(
        compute='_compute_display_name',
        store=True,
    )

    @api.depends('partner_id.name', 'asset_id.code')
    def _compute_display_name(self):
        for h in self:
            h.display_name = f"{h.partner_id.name} / {h.asset_id.code}"

    # ------------------------------------------------------------------
    # Timeline
    # ------------------------------------------------------------------

    first_acquired_at = fields.Datetime(
        string="First acquired at",
        copy=False,
        readonly=True,
    )
    last_updated_at = fields.Datetime(
        string="Last updated at",
        copy=False,
        readonly=True,
    )

    # ------------------------------------------------------------------
    # Settings
    # ------------------------------------------------------------------

    state = fields.Selection(
        selection=[('active', 'Active'), ('closed', 'Closed')],
        string="State",
        default='active',
        required=True,
        index=True,
        tracking=True,
    )
    reinvest_enabled = fields.Boolean(
        string="Auto-reinvest yield",
        default=False,
        help="When True, yield distributions for this holding are automatically "
             "reinvested into the same asset instead of paid out.",
    )

    # ==================================================================
    # Constraints
    # ==================================================================

    @api.constrains('partner_id', 'asset_id')
    def _check_unique_per_partner_asset(self):
        for h in self:
            existing = self.search([
                ('partner_id', '=', h.partner_id.id),
                ('asset_id',   '=', h.asset_id.id),
                ('id',         '!=', h.id),
            ], limit=1)
            if existing:
                raise ValidationError(_(
                    "Investor '%s' already has a holding in asset '%s' (%s). "
                    "Only one holding per (investor, asset) pair is allowed."
                ) % (h.partner_id.name, h.asset_id.name, existing.uuid))

    @api.constrains('cells_owned')
    def _check_cells_non_negative(self):
        for h in self:
            if h.cells_owned < 0:
                raise ValidationError(_(
                    "cells_owned cannot be negative on holding %s "
                    "(investor: %s, asset: %s, value: %d)."
                ) % (h.uuid, h.partner_id.name, h.asset_id.name, h.cells_owned))

    # ==================================================================
    # CRUD
    # ==================================================================

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('uuid'):
                vals['uuid'] = str(uuid_lib.uuid4())
        records = super().create(vals_list)
        for h in records:
            self.env['solar.audit.log'].create_audit_entry(
                action_code='holding.created',
                subject=h,
                after={
                    'partner_uuid': h.partner_id.x_uuid,
                    'asset_code':   h.asset_id.code,
                    'cells_owned':  h.cells_owned,
                },
            )
        return records

    # ==================================================================
    # Business methods
    # ==================================================================

    def credit_cells(self, cells, price_per_cell):
        """Add cells to this holding (called by solar_investment on settlement).

        Recalculates the weighted average acquisition price and updates
        the asset's cells_subscribed counter.

        :param int   cells:          Number of cells to add.
        :param float price_per_cell: Price paid per cell in this transaction.
        :raises UserError: if cells ≤ 0 or price ≤ 0.
        """
        self.ensure_one()
        if cells <= 0:
            raise UserError(_("cells must be a positive integer (got %d).") % cells)
        if price_per_cell <= 0:
            raise UserError(_("price_per_cell must be positive (got %.4f).") % price_per_cell)

        old_cells = self.cells_owned
        old_price = self.average_acquisition_price or 0.0
        new_cells = old_cells + cells
        new_avg   = (old_cells * old_price + cells * price_per_cell) / new_cells
        amount    = cells * price_per_cell
        now       = fields.Datetime.now()

        self.write({
            'cells_owned':              new_cells,
            'average_acquisition_price': new_avg,
            'total_invested':            self.total_invested + amount,
            'last_updated_at':           now,
            'first_acquired_at':         self.first_acquired_at or now,
            'state':                     'active',
        })

        # Keep asset.cells_subscribed in sync
        self.asset_id.write({
            'cells_subscribed': self.asset_id.cells_subscribed + cells,
        })

        # Check if fully subscribed → auto-transition to financing_complete
        self.asset_id._auto_transition_financing_complete()

        self.env['solar.audit.log'].create_audit_entry(
            action_code='holding.cells.credited',
            subject=self,
            before={'cells_owned': old_cells, 'average_price': old_price},
            after={
                'cells_owned':   new_cells,
                'average_price': new_avg,
                'cells_added':   cells,
                'price_per_cell': price_per_cell,
            },
        )
        _logger.info(
            "Holding %s: credited %d cells at %.4f. Total: %d cells, avg: %.4f.",
            self.uuid, cells, price_per_cell, new_cells, new_avg,
        )
        return True

    def debit_cells(self, cells):
        """Remove cells from this holding (called by solar_market on trade settlement).

        Closes the holding if cells_owned reaches 0.

        :param int cells: Number of cells to remove.
        :raises UserError: if cells > cells_owned.
        """
        self.ensure_one()
        if cells <= 0:
            raise UserError(_("cells to debit must be positive (got %d).") % cells)
        if cells > self.cells_owned:
            raise UserError(_(
                "Cannot debit %d cells from holding %s: only %d cells owned."
            ) % (cells, self.uuid, self.cells_owned))

        old_cells = self.cells_owned
        new_cells = old_cells - cells
        now       = fields.Datetime.now()

        vals = {
            'cells_owned':    new_cells,
            'last_updated_at': now,
        }
        if new_cells == 0:
            vals['state'] = 'closed'

        self.write(vals)

        # Keep asset.cells_subscribed in sync
        self.asset_id.write({
            'cells_subscribed': max(0, self.asset_id.cells_subscribed - cells),
        })

        self.env['solar.audit.log'].create_audit_entry(
            action_code='holding.cells.debited',
            subject=self,
            before={'cells_owned': old_cells},
            after={
                'cells_owned':  new_cells,
                'cells_debited': cells,
                'state':         vals.get('state', self.state),
            },
        )
        _logger.info(
            "Holding %s: debited %d cells. Remaining: %d.",
            self.uuid, cells, new_cells,
        )
        return True

    # ==================================================================
    # Helpers / class methods
    # ==================================================================

    @api.model
    def get_or_create(self, partner, asset, wallet=None):
        """Return or create the holding for (partner, asset).

        Idempotent — safe to call multiple times.

        :param res.partner partner: The investor record.
        :param solar.asset asset:   The asset record.
        :param solar.wallet wallet: Optional wallet record.
        :returns: solar.holding recordset (singleton).
        """
        holding = self.search([
            ('partner_id', '=', partner.id),
            ('asset_id',   '=', asset.id),
        ], limit=1)
        if not holding:
            vals = {'partner_id': partner.id, 'asset_id': asset.id}
            if wallet:
                vals['wallet_id'] = wallet.id
            holding = self.create(vals)
        return holding

    def get_summary_dict(self):
        """JSON-safe summary for the portfolio page."""
        self.ensure_one()
        return {
            'uuid':                    self.uuid,
            'asset_uuid':              self.asset_id.uuid,
            'asset_code':              self.asset_id.code,
            'asset_name':              self.asset_id.name,
            'asset_state':             self.asset_id.state,
            'cells_owned':             self.cells_owned,
            'average_acquisition_price': self.average_acquisition_price,
            'total_invested':          self.total_invested,
            'total_yield_received':    self.total_yield_received,
            'current_value':           self.current_value,
            'unrealised_gain':         self.unrealised_gain,
            'state':                   self.state,
            'reinvest_enabled':        self.reinvest_enabled,
            'first_acquired_at':       str(self.first_acquired_at) if self.first_acquired_at else None,
        }
