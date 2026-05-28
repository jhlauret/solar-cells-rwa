# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.investment.order — Investor subscription order.

One record per subscription attempt. Tracks the investor, the asset,
the number of cells requested, the associated payment transaction, and
the full lifecycle state.

State machine
-------------
draft              → submitted         (action_submit — all guards pass)
submitted          → payment_pending   (action_create_payment)
payment_pending    → payment_processing (payment webhook)
payment_processing → payment_succeeded  (payment webhook)
payment_succeeded  → settled           (action_settle — credits holding)
any non-terminal   → cancelled         (action_cancel)
settled            → refunded          (action_refund — debits holding)

Guards checked before action_submit()
--------------------------------------
1. KYC validated (partner.x_kyc_status == 'validated')
2. Wallet active + whitelisted on-chain
3. Asset state == 'financing'
4. cells_requested ≤ asset.cells_available
5. cells_requested ≥ 1

Expiration (decisions Q-IO-01 / Q-IO-02)
-----------------------------------------
- Card / stablecoin: payment_pending expires after 30 minutes
- SEPA: payment_pending expires after 7 days
Cron checks every hour; on expiry: auto-cancel + restore cells_available.
"""

import logging
import uuid as uuid_lib
from datetime import timedelta

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

STATE_SELECTION = [
    ('draft',               'Draft'),
    ('submitted',           'Submitted'),
    ('payment_pending',     'Payment pending'),
    ('payment_processing',  'Payment processing'),
    ('payment_succeeded',   'Payment succeeded'),
    ('settled',             'Settled'),
    ('cancelled',           'Cancelled'),
    ('refunded',            'Refunded'),
]

TERMINAL_STATES = {'settled', 'cancelled', 'refunded'}

# Expiration delays per payment method (decision Q-IO-01 / Q-IO-02)
EXPIRY_MINUTES = {
    'card':       30,
    'stablecoin': 30,
    'sepa':       60 * 24 * 7,   # 7 days
}


class SolarInvestmentOrder(models.Model):
    """Investor subscription order."""

    _name        = 'solar.investment.order'
    _description = 'Investment Order'
    _inherit     = ['mail.thread']
    _order       = 'created_at desc'
    _rec_name    = 'name'

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------

    uuid = fields.Char(
        string="UUID",
        required=True, copy=False, readonly=True,
        index=True, default=lambda self: str(uuid_lib.uuid4()),
    )
    name = fields.Char(
        string="Reference",
        required=True, copy=False, readonly=True,
        index=True, default='/',
    )

    # ------------------------------------------------------------------
    # Parties
    # ------------------------------------------------------------------

    partner_id = fields.Many2one(
        'res.partner', string="Investor",
        required=True, ondelete='restrict', index=True, tracking=True,
    )
    asset_id = fields.Many2one(
        'solar.asset', string="Asset",
        required=True, ondelete='restrict', index=True, tracking=True,
    )
    wallet_id = fields.Many2one(
        'solar.wallet', string="Custody wallet",
        domain="[('partner_id','=',partner_id),('state','=','active')]",
    )

    # ------------------------------------------------------------------
    # Order details
    # ------------------------------------------------------------------

    cells_requested = fields.Integer(
        string="Cells requested",
        required=True, tracking=True,
    )
    price_per_cell = fields.Monetary(
        string="Price per cell",
        currency_field='currency_id',
        help="Locked in at submission (asset.cell_unit_price at that moment).",
    )
    gross_amount = fields.Monetary(
        string="Gross amount",
        currency_field='currency_id',
        compute='_compute_amounts', store=True,
    )
    fees_amount = fields.Monetary(
        string="Fees",
        currency_field='currency_id',
        compute='_compute_amounts', store=True,
        help="Platform / payment provider fees.",
    )
    net_amount = fields.Monetary(
        string="Net amount",
        currency_field='currency_id',
        compute='_compute_amounts', store=True,
    )
    currency_id = fields.Many2one(
        related='asset_id.currency_id', store=True, readonly=True,
    )
    payment_method = fields.Selection(
        selection=[
            ('sepa',       'SEPA transfer'),
            ('card',       'Card (Visa/MC)'),
            ('stablecoin', 'Stablecoin (EURC/USDC)'),
        ],
        string="Payment method", tracking=True,
    )

    @api.depends('cells_requested', 'price_per_cell', 'payment_method')
    def _compute_amounts(self):
        for order in self:
            gross = order.cells_requested * order.price_per_cell
            fee_rate = 0.005 if order.payment_method == 'card' else 0.0
            fees = round(gross * fee_rate, 2)
            order.gross_amount = gross
            order.fees_amount  = fees
            order.net_amount   = gross + fees

    # ------------------------------------------------------------------
    # Payment link
    # ------------------------------------------------------------------

    payment_transaction_id = fields.Many2one(
        'solar.payment.transaction',
        string="Payment transaction",
        copy=False, readonly=True, tracking=True,
    )

    # ------------------------------------------------------------------
    # State
    # ------------------------------------------------------------------

    state = fields.Selection(
        selection=STATE_SELECTION,
        string="State", default='draft',
        required=True, index=True, tracking=True,
    )
    created_at    = fields.Datetime(default=fields.Datetime.now, copy=False)
    submitted_at  = fields.Datetime(copy=False)
    settled_at    = fields.Datetime(copy=False)
    cancelled_at  = fields.Datetime(copy=False)
    cancel_reason = fields.Text(copy=False)
    expires_at    = fields.Datetime(
        string="Payment expires at",
        copy=False,
        help="Auto-cancel if payment not completed by this time.",
    )

    # ==================================================================
    # Constraints
    # ==================================================================

    @api.constrains('cells_requested')
    def _check_cells_positive(self):
        for order in self:
            if order.cells_requested < 1:
                raise ValidationError(_(
                    "cells_requested must be at least 1 (got %d on order %s)."
                ) % (order.cells_requested, order.name or '?'))

    # ==================================================================
    # CRUD
    # ==================================================================

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('uuid'):
                vals['uuid'] = str(uuid_lib.uuid4())
            if vals.get('name', '/') == '/':
                vals['name'] = (
                    self.env['ir.sequence'].next_by_code('solar.investment.order')
                    or 'INV-NEW'
                )
        return super().create(vals_list)

    # ==================================================================
    # Guards
    # ==================================================================

    def _check_submission_guards(self):
        """Validate all pre-submission conditions."""
        self.ensure_one()
        partner = self.partner_id
        asset   = self.asset_id

        # Guard 1 — KYC
        if partner.x_kyc_status != 'validated':
            raise UserError(_(
                "Cannot submit order %s: investor '%s' KYC status is '%s'. "
                "KYC must be validated."
            ) % (self.name, partner.name, partner.x_kyc_status or 'not_started'))

        # Guard 2 — Wallet
        wallet = partner.x_primary_wallet_id
        if not wallet or wallet.state != 'active':
            raise UserError(_(
                "Cannot submit order %s: investor '%s' has no active wallet."
            ) % (self.name, partner.name))
        if not wallet.whitelisted_on_chain:
            raise UserError(_(
                "Cannot submit order %s: investor '%s' wallet is not whitelisted on-chain yet."
            ) % (self.name, partner.name))

        # Guard 3 — Asset state
        if asset.state != 'financing':
            raise UserError(_(
                "Cannot submit order %s: asset '%s' is not open for financing "
                "(current state: '%s')."
            ) % (self.name, asset.name, asset.state))

        # Guard 4 — Availability
        if self.cells_requested > asset.cells_available:
            raise UserError(_(
                "Cannot submit order %s: only %d cells available on asset '%s' "
                "(requested: %d)."
            ) % (self.name, asset.cells_available, asset.name, self.cells_requested))

    # ==================================================================
    # State transitions
    # ==================================================================

    def _assert_state(self, expected, action):
        self.ensure_one()
        if self.state not in expected:
            raise UserError(_(
                "Cannot execute '%s' on order %s: state is '%s'. Expected: %s."
            ) % (action, self.name, self.state,
                 ', '.join("'%s'" % s for s in expected)))

    def action_submit(self):
        """draft → submitted. Runs all pre-submission guards."""
        self._assert_state(['draft'], 'Submit order')
        # Lock the price at current asset price
        if not self.price_per_cell:
            self.price_per_cell = self.asset_id.cell_unit_price
        self._check_submission_guards()

        now = fields.Datetime.now()
        self.write({'state': 'submitted', 'submitted_at': now})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investment.order.submitted',
            subject=self,
            after={
                'asset_code':       self.asset_id.code,
                'cells_requested':  self.cells_requested,
                'gross_amount':     self.gross_amount,
                'payment_method':   self.payment_method,
            },
        )
        return True

    def action_create_payment(self):
        """submitted → payment_pending. Creates the payment transaction."""
        self._assert_state(['submitted'], 'Create payment')
        if not self.payment_method:
            raise UserError(_(
                "Cannot create payment for order %s: payment method is not set."
            ) % self.name)

        # Compute expiry
        minutes = EXPIRY_MINUTES.get(self.payment_method, 30)
        expires = fields.Datetime.now() + timedelta(minutes=minutes)

        # Create the payment transaction
        tx_result = self.env['solar.payment.transaction'].create_transaction(
            partner_uuid=self.partner_id.x_uuid,
            direction='inbound',
            transaction_type='subscription',
            fiat_amount=self.net_amount,
            payment_method=self.payment_method,
        )
        tx = self.env['solar.payment.transaction'].search(
            [('uuid', '=', tx_result['transaction_uuid'])], limit=1,
        )
        # Link payment to this order
        tx.write({'linked_order_id': self.id})

        self.write({
            'state':                  'payment_pending',
            'expires_at':             expires,
            'payment_transaction_id': tx.id,
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investment.payment.created',
            subject=self,
            after={
                'payment_tx_name': tx.name,
                'expires_at':      str(expires),
            },
        )
        return {'payment_transaction_uuid': tx.uuid}

    def action_settle(self):
        """payment_succeeded → settled. Credits the investor's holding."""
        self._assert_state(['payment_succeeded'], 'Settle order')

        # Get or create holding
        holding = self.env['solar.holding'].get_or_create(
            self.partner_id, self.asset_id, self.wallet_id,
        )
        # Credit cells + weighted average
        holding.credit_cells(
            cells=self.cells_requested,
            price_per_cell=self.price_per_cell,
        )

        now = fields.Datetime.now()
        self.write({'state': 'settled', 'settled_at': now})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investment.order.settled',
            subject=self,
            after={
                'holding_uuid':    holding.uuid,
                'cells_credited':  self.cells_requested,
                'settled_at':      str(now),
            },
        )
        _logger.info(
            "Order %s settled: %d cells credited to holding %s.",
            self.name, self.cells_requested, holding.uuid,
        )
        return True

    def action_cancel(self, reason=None):
        """any non-terminal → cancelled."""
        if self.state in TERMINAL_STATES:
            raise UserError(_(
                "Order %s is in terminal state '%s' and cannot be cancelled."
            ) % (self.name, self.state))
        self.write({
            'state':         'cancelled',
            'cancelled_at':  fields.Datetime.now(),
            'cancel_reason': reason,
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investment.order.cancelled',
            subject=self,
            after={'state': 'cancelled', 'cancel_reason': reason},
        )
        return True

    def action_refund(self):
        """settled → refunded. Debits the holding and triggers payment refund."""
        self._assert_state(['settled'], 'Refund order')

        # Debit holding
        holding = self.env['solar.holding'].search([
            ('partner_id', '=', self.partner_id.id),
            ('asset_id',   '=', self.asset_id.id),
        ], limit=1)
        if holding:
            holding.debit_cells(self.cells_requested)

        # Trigger payment refund
        if self.payment_transaction_id.state == 'succeeded':
            self.payment_transaction_id.action_refund()

        self.write({'state': 'refunded'})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investment.order.refunded',
            subject=self,
            after={'state': 'refunded'},
        )
        return True

    # ==================================================================
    # Scheduled actions
    # ==================================================================

    @api.model
    def _cron_expire_pending_orders(self):
        """Hourly: auto-cancel payment_pending orders past their expires_at."""
        now = fields.Datetime.now()
        expired = self.search([
            ('state', '=', 'payment_pending'),
            ('expires_at', '<=', now),
        ])
        for order in expired:
            try:
                order.action_cancel(reason=_(
                    "Auto-cancelled: payment not completed before expiry (%s)."
                ) % order.expires_at)
                # Also cancel the payment transaction
                if order.payment_transaction_id.state == 'initiated':
                    order.payment_transaction_id.action_cancel()
                _logger.info("Order %s auto-cancelled (expired).", order.name)
            except Exception as exc:
                _logger.error("Failed to expire order %s: %s", order.name, exc)
        return True

    # ==================================================================
    # JSON-RPC API
    # ==================================================================

    @api.model
    def create_order(self, partner_uuid, asset_uuid, cells_requested, payment_method):
        """Create and submit a new investment order in one call.

        :param str partner_uuid:    Investor UUID.
        :param str asset_uuid:      Asset UUID.
        :param int cells_requested: Number of cells.
        :param str payment_method:  'sepa', 'card', or 'stablecoin'.
        :returns: dict with order UUID, gross_amount, payment TX UUID.
        """
        partner = self.env['res.partner'].search(
            [('x_uuid', '=', partner_uuid)], limit=1,
        )
        if not partner:
            raise UserError(_("Partner not found for UUID '%s'.") % partner_uuid)

        asset = self.env['solar.asset'].search(
            [('uuid', '=', asset_uuid)], limit=1,
        )
        if not asset:
            raise UserError(_("Asset not found for UUID '%s'.") % asset_uuid)

        order = self.create({
            'partner_id':       partner.id,
            'asset_id':         asset.id,
            'cells_requested':  cells_requested,
            'price_per_cell':   asset.cell_unit_price,
            'payment_method':   payment_method,
        })
        order.action_submit()
        payment_result = order.action_create_payment()

        return {
            'order_uuid':              order.uuid,
            'order_name':              order.name,
            'cells_requested':         order.cells_requested,
            'gross_amount':            order.gross_amount,
            'net_amount':              order.net_amount,
            'payment_transaction_uuid': payment_result['payment_transaction_uuid'],
            'expires_at':              str(order.expires_at),
        }
