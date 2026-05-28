# -*- coding: utf-8 -*-
from odoo import fields, models

class SolarAssetYield(models.Model):
    _inherit = 'solar.asset'
    distribution_ids = fields.One2many('solar.yield.distribution', 'asset_id',
                                       string="Distributions")
    distribution_count = fields.Integer(compute='_compute_dist_count')
    def _compute_dist_count(self):
        for a in self:
            a.distribution_count = len(a.distribution_ids)
