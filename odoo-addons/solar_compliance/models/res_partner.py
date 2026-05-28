# -*- coding: utf-8 -*-
from odoo import api, fields, models

RISK_LEVEL = [
    ('low',      'Low risk'),
    ('medium',   'Medium risk'),
    ('high',     'High risk'),
    ('critical', 'Critical risk'),
]


class ResPartnerCompliance(models.Model):
    _inherit = 'res.partner'

    x_aml_alert_ids = fields.One2many(
        'solar.compliance.alert', 'partner_id', string="AML alerts")
    x_open_alert_count = fields.Integer(
        compute='_compute_x_open_alerts', string="Open alerts")
    x_risk_level = fields.Selection(
        RISK_LEVEL, string="Risk level", default='low', tracking=True)
    x_last_aml_screen_at = fields.Datetime(
        string="Last AML screening", copy=False,
        help="Date of last sanctions / PEP screening.")

    def _compute_x_open_alerts(self):
        for p in self:
            p.x_open_alert_count = len(
                p.x_aml_alert_ids.filtered(
                    lambda a: a.state in ('open', 'under_review', 'escalated')))
