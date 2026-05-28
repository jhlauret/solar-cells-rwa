# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Extends res.partner with holding-related fields (solar_holding addon)."""

from odoo import api, fields, models


class ResPartnerHolding(models.Model):
    """Adds portfolio fields to res.partner."""

    _inherit = 'res.partner'

    x_holding_ids = fields.One2many(
        'solar.holding',
        'partner_id',
        string="Holdings",
    )
    x_holding_count = fields.Integer(
        string="Active positions",
        compute='_compute_x_holding_count',
    )
    x_total_invested = fields.Monetary(
        string="Total invested",
        compute='_compute_x_portfolio',
        currency_field='currency_id',
        store=False,
    )
    x_portfolio_value = fields.Monetary(
        string="Portfolio value (nominal)",
        compute='_compute_x_portfolio',
        currency_field='currency_id',
        store=False,
        help="Sum of cells_owned × cell_unit_price across all active holdings.",
    )
    x_total_yield_received = fields.Monetary(
        string="Total yield received",
        compute='_compute_x_portfolio',
        currency_field='currency_id',
        store=False,
    )

    def _compute_x_holding_count(self):
        for partner in self:
            partner.x_holding_count = len(
                partner.x_holding_ids.filtered(lambda h: h.state == 'active')
            )

    @api.depends('x_holding_ids.total_invested',
                 'x_holding_ids.current_value',
                 'x_holding_ids.total_yield_received',
                 'x_holding_ids.state')
    def _compute_x_portfolio(self):
        for partner in self:
            active = partner.x_holding_ids.filtered(lambda h: h.state == 'active')
            partner.x_total_invested       = sum(active.mapped('total_invested'))
            partner.x_portfolio_value      = sum(active.mapped('current_value'))
            partner.x_total_yield_received = sum(
                partner.x_holding_ids.mapped('total_yield_received')
            )
