# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""solar.market.order — Sell/buy offer on the secondary marketplace."""

import logging
import uuid as uuid_lib
from datetime import timedelta

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

ORDER_STATE = [
    ('draft',     'Draft'),
    ('published', 'Published'),
    ('partial',   'Partially filled'),
    ('filled',    'Fully filled'),
    ('cancelled', 'Cancelled'),
    ('expired',   'Expired'),
]

DIRECTION = [
    ('sell', 'Sell offer'),
    ('buy',  'Buy offer'),
]


class SolarMarketOrder(models.Model):
    """Secondary market offer — sell or buy Solar Cells."""

    _name        = 'solar.market.order'
    _description = 'Market Order'
    _inherit     = ['mail.thread']
    _order       = 'created_at desc'
    _rec_name    = 'name'

    uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                       default=lambda self: str(uuid_lib.uuid4()))
    name = fields.Char(required=True, copy=False, readonly=True,
                       index=True, default='/')

    partner_id  = fields.Many2one('res.partner', string="Investor",
                                  required=True, ondelete='restrict',
                                  index=True, tracking=True)
    asset_id    = fields.Many2one('solar.asset',  string="Asset",
                                  required=True, ondelete='restrict',
                                  index=True, tracking=True)
    direction   = fields.Selection(DIRECTION, required=True, default='sell',
                                   tracking=True)
    cells_offered   = fields.Integer(required=True, tracking=True)
    cells_remaining = fields.Integer(tracking=True)
    price_per_cell  = fields.Monetary(required=True, currency_field='currency_id',
                                      tracking=True)
    currency_id     = fields.Many2one(related='asset_id.currency_id',
                                      store=True, readonly=True)
    total_amount    = fields.Monetary(compute='_compute_total', store=True,
                                      currency_field='currency_id')

    @api.depends('cells_offered', 'price_per_cell')
    def _compute_total(self):
        for o in self:
            o.total_amount = o.cells_offered * o.price_per_cell

    state      = fields.Selection(ORDER_STATE, default='draft', required=True,
                                  index=True, tracking=True)
    created_at = fields.Datetime(default=fields.Datetime.now, copy=False)
    expires_at = fields.Datetime(copy=False, tracking=True)
    trade_ids  = fields.One2many('solar.market.trade', 'order_id', string="Trades")

    @api.constrains('cells_offered')
    def _check_cells_positive(self):
        for o in self:
            if o.cells_offered < 1:
                raise ValidationError(_("cells_offered must be ≥ 1."))

    @api.constrains('price_per_cell')
    def _check_price_positive(self):
        for o in self:
            if o.price_per_cell <= 0:
                raise ValidationError(_("price_per_cell must be > 0."))

    @api.model_create_multi
    def create(self, vals_list):
        for v in vals_list:
            if not v.get('uuid'):
                v['uuid'] = str(uuid_lib.uuid4())
            if v.get('name', '/') == '/':
                v['name'] = (self.env['ir.sequence'].next_by_code('solar.market.order')
                             or 'MKT-NEW')
            if not v.get('cells_remaining') and v.get('cells_offered'):
                v['cells_remaining'] = v['cells_offered']
        return super().create(vals_list)

    def _check_publish_guards(self):
        self.ensure_one()
        # KYC
        if self.partner_id.x_kyc_status != 'validated':
            raise UserError(_("KYC must be validated to post a market order."))
        # Wallet
        w = self.partner_id.x_primary_wallet_id
        if not w or w.state != 'active' or not w.whitelisted_on_chain:
            raise UserError(_("Active whitelisted wallet required."))
        # Secondary market enabled
        if not self.asset_id.is_secondary_market_enabled:
            raise UserError(_("Secondary market is not enabled for asset '%s'.")
                            % self.asset_id.name)
        # Sell: verify holding
        if self.direction == 'sell':
            holding = self.env['solar.holding'].search([
                ('partner_id', '=', self.partner_id.id),
                ('asset_id',   '=', self.asset_id.id),
                ('state',      '=', 'active'),
            ], limit=1)
            if not holding or holding.cells_owned < self.cells_offered:
                raise UserError(_(
                    "Insufficient cells: you own %d but want to sell %d."
                ) % (holding.cells_owned if holding else 0, self.cells_offered))

    def action_publish(self):
        self._check_state(['draft'], 'Publish')
        self._check_publish_guards()
        expires = fields.Datetime.now() + timedelta(days=7)
        self.write({'state': 'published', 'expires_at': expires})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='market.order.published', subject=self,
            after={'direction': self.direction, 'cells': self.cells_offered,
                   'price': self.price_per_cell})
        return True

    def action_cancel(self):
        self._check_state(['draft', 'published', 'partial'], 'Cancel')
        self.write({'state': 'cancelled'})
        return True

    def _check_state(self, expected, action):
        self.ensure_one()
        if self.state not in expected:
            raise UserError(_("Cannot '%s': state is '%s'.") % (action, self.state))

    @api.model
    def _cron_expire_market_orders(self):
        """Daily: expire published orders past expires_at."""
        now = fields.Datetime.now()
        expired = self.search([
            ('state', 'in', ['published', 'partial']),
            ('expires_at', '<=', now),
        ])
        for o in expired:
            o.write({'state': 'expired'})
        return True
