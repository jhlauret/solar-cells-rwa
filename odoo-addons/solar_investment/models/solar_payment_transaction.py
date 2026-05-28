# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Extends solar.payment.transaction with investment order link (solar_investment)."""

from odoo import fields, models


class SolarPaymentTransactionInvestment(models.Model):
    """Adds linked_order_id to solar.payment.transaction."""

    _inherit = 'solar.payment.transaction'

    linked_order_id = fields.Many2one(
        'solar.investment.order',
        string="Investment order",
        copy=False,
        readonly=True,
        index=True,
        ondelete='restrict',
    )

    def _on_succeeded_hook(self):
        """On payment success: advance the linked investment order."""
        super()._on_succeeded_hook()
        if self.linked_order_id:
            order = self.linked_order_id
            if order.state == 'payment_pending':
                order.write({'state': 'payment_processing'})
            if order.state == 'payment_processing':
                order.write({'state': 'payment_succeeded'})
                order.action_settle()
