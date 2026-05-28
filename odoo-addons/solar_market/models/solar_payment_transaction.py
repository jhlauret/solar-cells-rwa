# -*- coding: utf-8 -*-
from odoo import fields, models


class SolarPaymentTransactionMarket(models.Model):
    _inherit = 'solar.payment.transaction'
    linked_trade_id = fields.Many2one('solar.market.trade', string="Market trade",
                                      copy=False, readonly=True, index=True,
                                      ondelete='restrict')
