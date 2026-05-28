# -*- coding: utf-8 -*-
from odoo import fields, models


class SolarAssetMarket(models.Model):
    _inherit = 'solar.asset'
    market_order_ids = fields.One2many('solar.market.order', 'asset_id',
                                       string="Market orders")
    market_order_count = fields.Integer(compute='_compute_market_order_count')

    def _compute_market_order_count(self):
        for a in self:
            a.market_order_count = len(
                a.market_order_ids.filtered(lambda o: o.state == 'published'))
