# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""solar.market.trade — Matched trade between two investors."""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

TRADE_STATE = [
    ('pending',   'Pending settlement'),
    ('settled',   'Settled'),
    ('cancelled', 'Cancelled'),
]


class SolarMarketTrade(models.Model):
    """A matched and settled secondary market trade."""

    _name        = 'solar.market.trade'
    _description = 'Market Trade'
    _inherit     = ['mail.thread']
    _order       = 'created_at desc'
    _rec_name    = 'name'

    uuid       = fields.Char(required=True, copy=False, readonly=True, index=True,
                              default=lambda self: str(uuid_lib.uuid4()))
    name       = fields.Char(required=True, copy=False, readonly=True,
                              index=True, default='/')
    order_id   = fields.Many2one('solar.market.order', string="Order",
                                 required=True, ondelete='restrict', index=True)
    seller_id  = fields.Many2one('res.partner', string="Seller",
                                 required=True, ondelete='restrict', index=True)
    buyer_id   = fields.Many2one('res.partner', string="Buyer",
                                 required=True, ondelete='restrict', index=True)
    asset_id   = fields.Many2one('solar.asset',  string="Asset",
                                 required=True, ondelete='restrict', index=True)
    cells_traded   = fields.Integer(required=True)
    price_per_cell = fields.Monetary(required=True, currency_field='currency_id')
    trade_amount   = fields.Monetary(compute='_compute_amount', store=True,
                                     currency_field='currency_id')
    currency_id    = fields.Many2one(related='asset_id.currency_id',
                                     store=True, readonly=True)
    state      = fields.Selection(TRADE_STATE, default='pending', required=True,
                                  index=True, tracking=True)
    created_at = fields.Datetime(default=fields.Datetime.now, copy=False)
    settled_at = fields.Datetime(copy=False)

    seller_payment_id = fields.Many2one('solar.payment.transaction',
                                        string="Seller payout", copy=False)
    buyer_payment_id  = fields.Many2one('solar.payment.transaction',
                                        string="Buyer payment", copy=False)

    @api.depends('cells_traded', 'price_per_cell')
    def _compute_amount(self):
        for t in self:
            t.trade_amount = t.cells_traded * t.price_per_cell

    @api.model_create_multi
    def create(self, vals_list):
        for v in vals_list:
            if not v.get('uuid'):
                v['uuid'] = str(uuid_lib.uuid4())
            if v.get('name', '/') == '/':
                v['name'] = (self.env['ir.sequence'].next_by_code('solar.market.trade')
                             or 'TRD-NEW')
        return super().create(vals_list)

    def action_settle(self):
        """pending → settled: debit seller, credit buyer, create payments."""
        self.ensure_one()
        if self.state != 'pending':
            raise UserError(_("Trade %s is already %s.") % (self.name, self.state))

        Holding = self.env['solar.holding']

        # Debit seller
        seller_holding = Holding.search([
            ('partner_id', '=', self.seller_id.id),
            ('asset_id',   '=', self.asset_id.id),
        ], limit=1)
        if seller_holding:
            seller_holding.debit_cells(self.cells_traded)

        # Credit buyer
        buyer_holding = Holding.get_or_create(self.buyer_id, self.asset_id)
        buyer_holding.credit_cells(self.cells_traded, self.price_per_cell)

        # Payment: buyer pays seller
        Tx = self.env['solar.payment.transaction']
        buyer_tx_result = Tx.create_transaction(
            partner_uuid=self.buyer_id.x_uuid,
            direction='inbound',
            transaction_type='marketplace_buy',
            fiat_amount=self.trade_amount,
        )
        seller_tx = Tx.create({
            'partner_id':       self.seller_id.id,
            'direction':        'outbound',
            'transaction_type': 'marketplace_sale',
            'fiat_amount':      self.trade_amount,
            'currency_id':      self.currency_id.id,
        })
        buyer_tx = Tx.search(
            [('uuid', '=', buyer_tx_result['transaction_uuid'])], limit=1)

        now = fields.Datetime.now()
        self.write({
            'state':             'settled',
            'settled_at':        now,
            'seller_payment_id': seller_tx.id,
            'buyer_payment_id':  buyer_tx.id,
        })

        # Update market order cells_remaining
        order = self.order_id
        new_remaining = order.cells_remaining - self.cells_traded
        new_state = 'filled' if new_remaining <= 0 else 'partial'
        order.write({'cells_remaining': max(0, new_remaining), 'state': new_state})

        self.env['solar.audit.log'].create_audit_entry(
            action_code='market.trade.settled', subject=self,
            after={
                'cells_traded':    self.cells_traded,
                'trade_amount':    self.trade_amount,
                'seller':          self.seller_id.x_uuid,
                'buyer':           self.buyer_id.x_uuid,
                'settled_at':      str(now),
            })
        return True
