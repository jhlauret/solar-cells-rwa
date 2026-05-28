# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""solar.yield.line — Per-investor yield line within a distribution event."""

import uuid as uuid_lib
from odoo import _, fields, models
from odoo.exceptions import UserError

LINE_STATE = [
    ('pending', 'Pending'),
    ('paid',    'Paid'),
    ('failed',  'Failed'),
]


class SolarYieldLine(models.Model):
    """Yield entitlement for one investor within a distribution."""

    _name        = 'solar.yield.line'
    _description = 'Yield Line'
    _order       = 'distribution_id, partner_id'
    _rec_name    = 'partner_id'

    uuid            = fields.Char(required=True, copy=False, readonly=True,
                                   index=True, default=lambda self: str(uuid_lib.uuid4()))
    distribution_id = fields.Many2one('solar.yield.distribution', required=True,
                                      ondelete='cascade', index=True)
    holding_id      = fields.Many2one('solar.holding', required=True,
                                      ondelete='restrict', index=True)
    partner_id      = fields.Many2one('res.partner', required=True,
                                      ondelete='restrict', index=True)
    asset_id        = fields.Many2one(related='distribution_id.asset_id',
                                      store=True, readonly=True)
    cells_at_distribution = fields.Integer(readonly=True)
    amount_gross    = fields.Monetary(currency_field='currency_id')
    amount_net      = fields.Monetary(currency_field='currency_id')
    currency_id     = fields.Many2one(related='distribution_id.currency_id',
                                      store=True, readonly=True)
    state           = fields.Selection(LINE_STATE, default='pending',
                                       required=True, index=True)
    paid_at         = fields.Datetime(copy=False)
    payment_transaction_id = fields.Many2one('solar.payment.transaction',
                                             copy=False, readonly=True)

    def action_pay(self):
        """pending → paid: create outbound payment transaction + update holding."""
        self.ensure_one()
        if self.state != 'pending':
            raise UserError(_("Line for %s is already %s.")
                            % (self.partner_id.name, self.state))

        # Create outbound payment transaction
        tx = self.env['solar.payment.transaction'].create({
            'partner_id':       self.partner_id.id,
            'direction':        'outbound',
            'transaction_type': 'yield_distribution',
            'fiat_amount':      self.amount_net,
            'currency_id':      self.currency_id.id,
            'iban_used':        self.partner_id.x_iban or '',
        })
        # Mark as succeeded immediately (real payout via Stripe scheduled separately)
        tx.action_mark_processing()
        tx.action_mark_succeeded()

        now = fields.Datetime.now()
        self.write({
            'state':                   'paid',
            'paid_at':                 now,
            'payment_transaction_id':  tx.id,
        })

        # Update holding total yield
        self.holding_id.write({
            'total_yield_received':
                self.holding_id.total_yield_received + self.amount_net,
        })

        self.env['solar.audit.log'].create_audit_entry(
            action_code='yield.line.paid', subject=self.distribution_id,
            after={
                'partner_uuid': self.partner_id.x_uuid,
                'amount_net':   self.amount_net,
                'tx_name':      tx.name,
            })
        return True
