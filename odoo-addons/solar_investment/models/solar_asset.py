# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Extends solar.asset with investment_order_ids (solar_investment addon)."""

from odoo import fields, models


class SolarAssetInvestment(models.Model):
    """Adds investment_order_ids to solar.asset."""

    _inherit = 'solar.asset'

    investment_order_ids = fields.One2many(
        'solar.investment.order',
        'asset_id',
        string="Investment orders",
    )
    investment_order_count = fields.Integer(
        compute='_compute_investment_order_count',
        string="Orders",
    )

    def _compute_investment_order_count(self):
        for asset in self:
            asset.investment_order_count = len(asset.investment_order_ids)
