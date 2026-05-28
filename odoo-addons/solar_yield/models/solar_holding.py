# -*- coding: utf-8 -*-
from odoo import fields, models

class SolarHoldingYield(models.Model):
    _inherit = 'solar.holding'
    yield_line_ids = fields.One2many('solar.yield.line', 'holding_id',
                                     string="Yield lines")
