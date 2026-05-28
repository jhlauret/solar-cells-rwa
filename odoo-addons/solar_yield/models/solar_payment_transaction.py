# -*- coding: utf-8 -*-
from odoo import fields, models

class SolarPaymentTransactionYield(models.Model):
    _inherit = 'solar.payment.transaction'
    linked_yield_line_id = fields.Many2one('solar.yield.line', string="Yield line",
                                           copy=False, readonly=True, index=True,
                                           ondelete='restrict')
