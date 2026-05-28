# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.payment.transaction — Unified payment record for all financial flows.

One record per payment event, covering both directions:
  - inbound:  subscription, marketplace buy, top-up, fees
  - outbound: yield distribution payout, marketplace sale payout, withdrawal, refund

Downstream links (added by other addons via _inherit):
  solar_investment → linked_order_id
  solar_market     → linked_trade_id
  solar_yield      → linked_yield_line_ids

Webhook flow (Stripe example)
------------------------------
1. Investor submits payment  →  Node.js calls create_transaction()  →  'initiated'
2. Stripe processes          →  Stripe webhook fires
3. Node.js calls handle_stripe_webhook()  →  'processing' then 'succeeded'
4. 'succeeded' triggers downstream: order settlement, holding credit, etc.
"""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Selection constants
# ---------------------------------------------------------------------------

DIRECTION_SELECTION = [
    ('inbound',  'Inbound (money in)'),
    ('outbound', 'Outbound (money out)'),
]

TRANSACTION_TYPE_SELECTION = [
    ('subscription',       'Investment subscription'),
    ('marketplace_buy',    'Marketplace buy'),
    ('top_up',             'Account top-up'),
    ('onboarding_fee',     'Onboarding fee'),
    ('management_fee',     'Management fee charge'),
    ('yield_distribution', 'Yield distribution payout'),
    ('marketplace_sale',   'Marketplace sale payout'),
    ('withdrawal',         'Investor withdrawal'),
    ('refund',             'Refund'),
]

PAYMENT_METHOD_SELECTION = [
    ('sepa',       'SEPA bank transfer'),
    ('card',       'Card (Visa / Mastercard)'),
    ('stablecoin', 'Stablecoin (EURC / USDC)'),
]

STABLECOIN_TYPE_SELECTION = [
    ('EURC',  'EURC (Circle)'),
    ('USDC',  'USDC (Circle)'),
    ('EURCV', 'EURCV (Crypto.com)'),
]

STATE_SELECTION = [
    ('initiated',  'Initiated'),
    ('processing', 'Processing'),
    ('succeeded',  'Succeeded'),
    ('failed',     'Failed'),
    ('refunded',   'Refunded'),
    ('cancelled',  'Cancelled'),
]

# States that can no longer change
TERMINAL_STATES = {'refunded', 'cancelled'}


class SolarPaymentTransaction(models.Model):
    """Unified payment transaction — inbound or outbound."""

    _name        = 'solar.payment.transaction'
    _description = 'Solar Payment Transaction'
    _inherit     = ['mail.thread']
    _order       = 'initiated_at desc'
    _rec_name    = 'name'

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------

    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
    )
    name = fields.Char(
        string="Reference",
        required=True,
        copy=False,
        readonly=True,
        default='/',
        index=True,
    )

    # ------------------------------------------------------------------
    # Parties
    # ------------------------------------------------------------------

    partner_id = fields.Many2one(
        'res.partner',
        string="Investor",
        required=True,
        ondelete='restrict',
        index=True,
        tracking=True,
    )

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------

    direction = fields.Selection(
        selection=DIRECTION_SELECTION,
        string="Direction",
        required=True,
        index=True,
        tracking=True,
    )
    transaction_type = fields.Selection(
        selection=TRANSACTION_TYPE_SELECTION,
        string="Transaction type",
        required=True,
        index=True,
        tracking=True,
    )
    payment_method = fields.Selection(
        selection=PAYMENT_METHOD_SELECTION,
        string="Payment method",
        tracking=True,
    )

    # ------------------------------------------------------------------
    # Amounts
    # ------------------------------------------------------------------

    fiat_amount = fields.Monetary(
        string="Fiat amount",
        required=True,
        currency_field='currency_id',
        tracking=True,
        help="Amount in fiat currency (EUR, CHF, …).",
    )
    currency_id = fields.Many2one(
        'res.currency',
        string="Currency",
        required=True,
        default=lambda self: self.env.ref('base.EUR', raise_if_not_found=False),
    )
    fees_amount = fields.Monetary(
        string="Platform / provider fees",
        currency_field='currency_id',
        default=0.0,
        help="Fees charged on top of the fiat_amount (e.g. card processing: 0.5%).",
    )
    net_amount = fields.Monetary(
        string="Net amount",
        currency_field='currency_id',
        compute='_compute_net_amount',
        store=True,
        help="Inbound: fiat_amount − fees. Outbound: fiat_amount − fees.",
    )

    @api.depends('fiat_amount', 'fees_amount')
    def _compute_net_amount(self):
        for tx in self:
            tx.net_amount = tx.fiat_amount - tx.fees_amount

    # ------------------------------------------------------------------
    # Stablecoin conversion (via Bridge)
    # ------------------------------------------------------------------

    stablecoin_amount = fields.Float(
        string="Stablecoin amount",
        digits=(20, 6),
        help="Amount in stablecoin after conversion (e.g. 150.000000 EURC).",
    )
    stablecoin_type = fields.Selection(
        selection=STABLECOIN_TYPE_SELECTION,
        string="Stablecoin",
    )
    stablecoin_rate = fields.Float(
        string="Conversion rate",
        digits=(10, 6),
        help="Exchange rate applied during conversion (fiat → stablecoin).",
    )

    # ------------------------------------------------------------------
    # External provider references
    # ------------------------------------------------------------------

    stripe_intent_id = fields.Char(
        string="Stripe PaymentIntent ID",
        copy=False,
        index=True,
        help="pi_xxx — Stripe inbound payment intent.",
    )
    stripe_charge_id = fields.Char(
        string="Stripe Charge ID",
        copy=False,
        help="ch_xxx — Stripe charge reference once captured.",
    )
    stripe_payout_id = fields.Char(
        string="Stripe Payout ID",
        copy=False,
        index=True,
        help="po_xxx — Stripe outbound payout reference.",
    )
    bridge_conversion_id = fields.Char(
        string="Bridge conversion ID",
        copy=False,
        help="Bridge (Stripe) stablecoin conversion reference.",
    )
    bridge_payment_id = fields.Char(
        string="Bridge payment ID",
        copy=False,
        help="Bridge on-chain payment reference.",
    )

    # ------------------------------------------------------------------
    # Banking (outbound)
    # ------------------------------------------------------------------

    iban_used = fields.Char(
        string="IBAN (frozen at payout)",
        copy=False,
        help="Investor's IBAN at the time the payout was initiated. "
             "Frozen here so subsequent IBAN changes do not alter historical records.",
    )

    # ------------------------------------------------------------------
    # State machine
    # ------------------------------------------------------------------

    state = fields.Selection(
        selection=STATE_SELECTION,
        string="State",
        default='initiated',
        required=True,
        index=True,
        tracking=True,
    )
    initiated_at  = fields.Datetime(
        string="Initiated at",
        default=fields.Datetime.now,
        required=True,
        copy=False,
    )
    processing_at = fields.Datetime(string="Processing at", copy=False)
    succeeded_at  = fields.Datetime(string="Succeeded at",  copy=False)
    failed_at     = fields.Datetime(string="Failed at",     copy=False)
    failure_reason = fields.Text(string="Failure reason", copy=False)

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    metadata = fields.Json(
        string="Provider metadata",
        default=dict,
        copy=False,
        help="Raw JSON payload from the last provider event (Stripe / Bridge webhook).",
    )

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
                    self.env['ir.sequence'].next_by_code('solar.payment.transaction')
                    or 'PAY-NEW'
                )
        records = super().create(vals_list)
        for tx in records:
            self.env['solar.audit.log'].create_audit_entry(
                action_code=f'payment.{tx.transaction_type}.initiated',
                subject=tx,
                after={
                    'direction':         tx.direction,
                    'transaction_type':  tx.transaction_type,
                    'fiat_amount':       tx.fiat_amount,
                    'payment_method':    tx.payment_method,
                },
            )
        return records

    # ==================================================================
    # State transitions
    # ==================================================================

    def _assert_not_terminal(self, action):
        self.ensure_one()
        if self.state in TERMINAL_STATES:
            raise UserError(_(
                "Cannot execute '%s': transaction %s is in terminal state '%s'."
            ) % (action, self.name, self.state))

    def _assert_state(self, expected, action):
        self.ensure_one()
        if self.state not in expected:
            raise UserError(_(
                "Cannot execute '%s' on transaction %s: "
                "current state is '%s', expected: %s."
            ) % (action, self.name, self.state,
                 ', '.join("'%s'" % s for s in expected)))

    def action_mark_processing(self, metadata=None):
        """initiated → processing. Called when the provider acknowledges the payment."""
        self._assert_state(['initiated'], 'Mark processing')
        now = fields.Datetime.now()
        vals = {'state': 'processing', 'processing_at': now}
        if metadata:
            vals['metadata'] = {**(self.metadata or {}), **metadata}
        self.write(vals)
        self.env['solar.audit.log'].create_audit_entry(
            action_code='payment.processing',
            subject=self,
            after={'state': 'processing'},
        )
        return True

    def action_mark_succeeded(self, metadata=None):
        """processing → succeeded.

        Called after the provider confirms payment.
        Triggers downstream business logic via _on_succeeded_hook().
        """
        self._assert_state(['processing'], 'Mark succeeded')
        now = fields.Datetime.now()
        vals = {'state': 'succeeded', 'succeeded_at': now}
        if metadata:
            vals['metadata'] = {**(self.metadata or {}), **metadata}
        self.write(vals)
        self.env['solar.audit.log'].create_audit_entry(
            action_code=f'payment.{self.transaction_type}.succeeded',
            subject=self,
            after={'state': 'succeeded', 'net_amount': self.net_amount},
        )
        # Hook for downstream addons (solar_investment, solar_yield, etc.)
        self._on_succeeded_hook()
        return True

    def _on_succeeded_hook(self):
        """Called after a transaction reaches 'succeeded'.

        Downstream addons override this to trigger their own logic:
          solar_investment: settles the investment order
          solar_yield:      marks yield lines as paid
          solar_market:     completes the marketplace trade
        """
        pass  # Overridden by downstream addons via _inherit

    def action_mark_failed(self, reason=None, metadata=None):
        """processing → failed."""
        self._assert_state(['processing', 'initiated'], 'Mark failed')
        now = fields.Datetime.now()
        vals = {
            'state':          'failed',
            'failed_at':      now,
            'failure_reason': reason,
        }
        if metadata:
            vals['metadata'] = {**(self.metadata or {}), **metadata}
        self.write(vals)
        self.env['solar.audit.log'].create_audit_entry(
            action_code='payment.failed',
            subject=self,
            after={'state': 'failed', 'failure_reason': reason},
        )
        _logger.warning("Payment %s failed. Reason: %s", self.name, reason)
        return True

    def action_cancel(self):
        """initiated → cancelled. Only possible if payment has not started processing."""
        self._assert_state(['initiated'], 'Cancel')
        self.write({'state': 'cancelled'})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='payment.cancelled',
            subject=self,
            after={'state': 'cancelled'},
        )
        return True

    def action_refund(self):
        """succeeded → refunded.

        Creates a new outbound transaction (refund) and transitions this one.
        """
        self._assert_state(['succeeded'], 'Refund')
        if self.direction != 'inbound':
            raise UserError(_(
                "Only inbound transactions can be refunded (transaction %s is '%s')."
            ) % (self.name, self.direction))

        # Create the refund transaction
        refund = self.create({
            'partner_id':       self.partner_id.id,
            'direction':        'outbound',
            'transaction_type': 'refund',
            'payment_method':   self.payment_method,
            'fiat_amount':      self.fiat_amount,
            'currency_id':      self.currency_id.id,
            'metadata':         {'refund_of': self.name, 'refund_of_uuid': self.uuid},
        })

        self.write({'state': 'refunded'})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='payment.refunded',
            subject=self,
            after={'state': 'refunded', 'refund_tx_name': refund.name},
        )
        return refund

    # ==================================================================
    # JSON-RPC API (called by Node.js backend webhook handlers)
    # ==================================================================

    @api.model
    def create_transaction(self, partner_uuid, direction, transaction_type,
                            fiat_amount, payment_method=None, currency_code='EUR',
                            stripe_intent_id=None, metadata=None):
        """Create a new payment transaction (called before the provider processes it).

        :param str partner_uuid:       Investor's external UUID.
        :param str direction:          'inbound' or 'outbound'.
        :param str transaction_type:   One of TRANSACTION_TYPE_SELECTION values.
        :param float fiat_amount:      Amount in fiat.
        :param str payment_method:     'sepa', 'card', or 'stablecoin'.
        :param str currency_code:      ISO currency code (default 'EUR').
        :param str stripe_intent_id:   Stripe PaymentIntent ID (if card/SEPA).
        :param dict metadata:          Additional provider data.
        :returns: dict with transaction uuid and name.
        """
        partner = self.env['res.partner'].search(
            [('x_uuid', '=', partner_uuid)], limit=1,
        )
        if not partner:
            raise UserError(_("Partner not found for UUID '%s'.") % partner_uuid)

        currency = self.env['res.currency'].search(
            [('name', '=', currency_code)], limit=1,
        )
        if not currency:
            raise UserError(_("Currency '%s' not found.") % currency_code)

        # Compute card fee (0.5% on card payments)
        fees = 0.0
        if payment_method == 'card':
            fees = round(fiat_amount * 0.005, 2)

        tx = self.create({
            'partner_id':         partner.id,
            'direction':          direction,
            'transaction_type':   transaction_type,
            'payment_method':     payment_method,
            'fiat_amount':        fiat_amount,
            'fees_amount':        fees,
            'currency_id':        currency.id,
            'stripe_intent_id':   stripe_intent_id,
            'metadata':           metadata or {},
        })
        return {'transaction_uuid': tx.uuid, 'name': tx.name}

    @api.model
    def handle_stripe_webhook(self, event_type, stripe_intent_id,
                               stripe_charge_id=None, metadata=None):
        """Process a Stripe webhook event.

        :param str event_type:       Stripe event (e.g. 'payment_intent.succeeded').
        :param str stripe_intent_id: Stripe PaymentIntent ID (pi_xxx).
        :param str stripe_charge_id: Stripe Charge ID (ch_xxx) if applicable.
        :param dict metadata:        Raw Stripe event payload.
        :returns: dict with transaction uuid and new state.
        """
        tx = self.search([('stripe_intent_id', '=', stripe_intent_id)], limit=1)
        if not tx:
            _logger.warning(
                "Stripe webhook: no transaction found for intent %s (event: %s).",
                stripe_intent_id, event_type,
            )
            return {'status': 'not_found', 'stripe_intent_id': stripe_intent_id}

        if stripe_charge_id:
            tx.write({'stripe_charge_id': stripe_charge_id})

        if event_type == 'payment_intent.processing':
            tx.action_mark_processing(metadata=metadata)
        elif event_type == 'payment_intent.succeeded':
            if tx.state == 'initiated':
                tx.action_mark_processing(metadata=metadata)
            tx.action_mark_succeeded(metadata=metadata)
        elif event_type in ('payment_intent.payment_failed', 'payment_intent.canceled'):
            failure = (metadata or {}).get('last_payment_error', {}).get('message')
            tx.action_mark_failed(reason=failure, metadata=metadata)
        else:
            _logger.info(
                "Stripe webhook: unhandled event type '%s' for intent %s.",
                event_type, stripe_intent_id,
            )

        return {'transaction_uuid': tx.uuid, 'state': tx.state}

    @api.model
    def handle_bridge_webhook(self, event_type, bridge_conversion_id=None,
                               bridge_payment_id=None, metadata=None):
        """Process a Bridge (Stripe) stablecoin webhook event.

        :param str event_type:          Bridge event type.
        :param str bridge_conversion_id: Bridge conversion reference.
        :param str bridge_payment_id:   Bridge on-chain payment reference.
        :param dict metadata:           Raw Bridge event payload.
        :returns: dict with transaction state.
        """
        domain = []
        if bridge_conversion_id:
            domain.append(('bridge_conversion_id', '=', bridge_conversion_id))
        elif bridge_payment_id:
            domain.append(('bridge_payment_id', '=', bridge_payment_id))
        else:
            return {'status': 'no_identifier'}

        tx = self.search(domain, limit=1)
        if not tx:
            _logger.warning(
                "Bridge webhook: no transaction found (event: %s, conversion: %s).",
                event_type, bridge_conversion_id,
            )
            return {'status': 'not_found'}

        if bridge_payment_id:
            tx.write({'bridge_payment_id': bridge_payment_id})

        if event_type in ('conversion.completed', 'payment.completed'):
            if tx.state == 'initiated':
                tx.action_mark_processing(metadata=metadata)
            tx.action_mark_succeeded(metadata=metadata)
        elif event_type in ('conversion.failed', 'payment.failed'):
            tx.action_mark_failed(
                reason=(metadata or {}).get('error', 'Bridge failure'),
                metadata=metadata,
            )

        return {'transaction_uuid': tx.uuid, 'state': tx.state}

    def get_transaction_dict(self):
        """JSON-safe summary for the investor's transaction history."""
        self.ensure_one()
        return {
            'uuid':              self.uuid,
            'name':              self.name,
            'direction':         self.direction,
            'transaction_type':  self.transaction_type,
            'payment_method':    self.payment_method,
            'fiat_amount':       self.fiat_amount,
            'fees_amount':       self.fees_amount,
            'net_amount':        self.net_amount,
            'currency':          self.currency_id.name,
            'state':             self.state,
            'initiated_at':      str(self.initiated_at),
            'succeeded_at':      str(self.succeeded_at) if self.succeeded_at else None,
            'stablecoin_amount': self.stablecoin_amount,
            'stablecoin_type':   self.stablecoin_type,
        }
