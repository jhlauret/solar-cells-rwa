# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name':        'Solar — Payment',
    'version':     '18.0.1.0.0',
    'category':    'Solar/Finance',
    'summary':     'Unified payment transactions (inbound + outbound) via Stripe and Bridge.',
    'description': """
Solar — Payment
===============
Central model for all financial flows on the SolarCells platform:
subscriptions, marketplace settlements, yield payouts, refunds, withdrawals.

``solar.payment.transaction``
    A single model covers both inbound (money in) and outbound (money out)
    via a ``direction`` field. This simplifies reconciliation and reporting.

    Payment methods: SEPA bank transfer, Visa/Mastercard card (Stripe),
    Stablecoins EURC/USDC (Bridge).

State machine:
    initiated → processing → succeeded → refunded
                           → failed
    initiated → cancelled

Links to business entities (added by downstream addons via _inherit):
    solar_investment → linked_order_id      (Many2one)
    solar_market     → linked_trade_id      (Many2one)
    solar_yield      → linked_yield_line_ids (One2many)

Webhook handlers are exposed as JSON-RPC methods called by the Node.js backend
after receiving events from Stripe and Bridge.
    """,
    'author':   'SolarCells RWA',
    'license':  'LGPL-3',
    'depends':  ['solar_core'],
    'data': [
        'security/ir.model.access.csv',
        'views/solar_payment_views.xml',
        'views/solar_payment_menus.xml',
    ],
    'installable':  True,
    'auto_install': False,
    'application':  False,
}
