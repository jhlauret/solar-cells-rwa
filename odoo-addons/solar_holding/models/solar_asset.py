# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Extends solar.asset with holding-related fields (solar_holding addon)."""

from odoo import api, fields, models


class SolarAssetHolding(models.Model):
    """Adds holding_ids One2many to solar.asset."""

    _inherit = 'solar.asset'

    holding_ids = fields.One2many(
        'solar.holding',
        'asset_id',
        string="Holdings",
        help="All investor positions in this asset.",
    )
    holding_count = fields.Integer(
        string="Investors",
        compute='_compute_holding_count',
    )

    def _compute_holding_count(self):
        for asset in self:
            asset.holding_count = len(
                asset.holding_ids.filtered(lambda h: h.state == 'active')
            )
