# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""solar.yield.distribution — Quarterly/annual yield distribution event for one asset.

States: draft → validated → distributing → completed / cancelled.

On action_validate():
  - Locks distribution_per_cell = gross_revenue / asset.total_cells
  - Creates one solar.yield.line per active solar.holding

On action_pay_all():
  - For each pending line: creates outbound payment transaction, marks line paid
  - Transitions to 'completed' when all lines are paid.
"""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

DIST_STATE = [
    ('draft',        'Draft'),
    ('validated',    'Validated'),
    ('distributing', 'Distributing'),
    ('completed',    'Completed'),
    ('cancelled',    'Cancelled'),
]

PERIOD_QUARTERS = [
    ('Q1', 'Q1'), ('Q2', 'Q2'), ('Q3', 'Q3'), ('Q4', 'Q4'),
    ('H1', 'H1'), ('H2', 'H2'), ('annual', 'Annual'),
]


class SolarYieldDistribution(models.Model):
    """Yield distribution event for one asset."""

    _name        = 'solar.yield.distribution'
    _description = 'Yield Distribution'
    _inherit     = ['mail.thread']
    _order       = 'distribution_date desc'
    _rec_name    = 'name'

    uuid = fields.Char(required=True, copy=False, readonly=True,
                       index=True, default=lambda self: str(uuid_lib.uuid4()))
    name = fields.Char(required=True, copy=False, readonly=True,
                       index=True, default='/')

    asset_id = fields.Many2one('solar.asset', required=True,
                               ondelete='restrict', index=True, tracking=True)
    period   = fields.Selection(PERIOD_QUARTERS, required=True,
                                default='Q1', tracking=True)
    year     = fields.Integer(required=True, default=lambda self: fields.Date.today().year)
    distribution_date = fields.Date(required=True, tracking=True)

    production_mwh = fields.Float(digits=(12, 2),
                                   help="Actual production during this period.")
    gross_revenue  = fields.Monetary(required=True, currency_field='currency_id',
                                     tracking=True,
                                     help="Total revenue from energy sales for this period.")
    currency_id    = fields.Many2one(related='asset_id.currency_id',
                                     store=True, readonly=True)
    distribution_per_cell = fields.Monetary(
        string="Per-cell amount", currency_field='currency_id',
        copy=False, readonly=True,
        help="Locked on validation: gross_revenue / total_cells.")

    state = fields.Selection(DIST_STATE, default='draft', required=True,
                              index=True, tracking=True)

    line_ids   = fields.One2many('solar.yield.line', 'distribution_id',
                                 string="Investor lines")
    line_count = fields.Integer(compute='_compute_line_count')

    def _compute_line_count(self):
        for d in self:
            d.line_count = len(d.line_ids)

    @api.model_create_multi
    def create(self, vals_list):
        for v in vals_list:
            if not v.get('uuid'):
                v['uuid'] = str(uuid_lib.uuid4())
            if v.get('name', '/') == '/':
                v['name'] = (self.env['ir.sequence'].next_by_code('solar.yield.distribution')
                             or 'YLD-NEW')
        return super().create(vals_list)

    def _assert_state(self, expected, action):
        self.ensure_one()
        if self.state not in expected:
            raise UserError(_("Cannot '%s': state is '%s'.") % (action, self.state))

    def action_validate(self):
        """draft → validated: lock per-cell amount + create yield lines."""
        self._assert_state(['draft'], 'Validate')
        asset = self.asset_id
        if asset.total_cells <= 0:
            raise UserError(_("Asset '%s' has 0 total cells.") % asset.name)
        per_cell = round(self.gross_revenue / asset.total_cells, 6)
        self.write({'state': 'validated', 'distribution_per_cell': per_cell})

        # Create one line per active holding
        active_holdings = self.env['solar.holding'].search([
            ('asset_id', '=', asset.id),
            ('state',    '=', 'active'),
            ('cells_owned', '>', 0),
        ])
        for holding in active_holdings:
            amount = holding.cells_owned * per_cell
            self.env['solar.yield.line'].create({
                'distribution_id':    self.id,
                'holding_id':         holding.id,
                'partner_id':         holding.partner_id.id,
                'cells_at_distribution': holding.cells_owned,
                'amount_gross':       round(amount, 2),
                'amount_net':         round(amount, 2),   # no tax at MVP
            })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='yield.distribution.validated', subject=self,
            after={'per_cell': per_cell, 'lines_created': len(active_holdings)})
        return True

    def action_pay_all(self):
        """validated / distributing → completed: pay all pending lines."""
        self._assert_state(['validated', 'distributing'], 'Pay all')
        self.write({'state': 'distributing'})
        pending = self.line_ids.filtered(lambda l: l.state == 'pending')
        for line in pending:
            line.action_pay()
        if all(l.state == 'paid' for l in self.line_ids):
            self.write({'state': 'completed'})
            self.env['solar.audit.log'].create_audit_entry(
                action_code='yield.distribution.completed', subject=self,
                after={'lines_paid': len(self.line_ids)})
        return True

    def action_cancel(self):
        self._assert_state(['draft', 'validated'], 'Cancel')
        self.write({'state': 'cancelled'})
        return True
