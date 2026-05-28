# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name':        'Solar — Investment',
    'version':     '18.0.1.0.0',
    'category':    'Solar/Investment',
    'summary':     'Subscription orders: KYC + whitelist guards, payment, holding settlement.',
    'description': """
Solar — Investment
==================
Manages the full subscription lifecycle: investor submits an order,
payment is processed, Solar Cells are credited to their holding.

``solar.investment.order``
    State machine:
      draft → submitted → payment_pending → payment_processing
           → payment_succeeded → settled → cancelled / refunded

    On settlement:
      1. solar.holding.credit_cells()   → updates cells + weighted avg
      2. asset._auto_transition_financing_complete() if full
      3. solar.audit.log entry

Pre-submission guards:
    - KYC must be validated (x_kyc_status == 'validated')
    - Wallet must be active + whitelisted on-chain
    - Asset must be in 'financing' state
    - cells_requested ≤ asset.cells_available
    - Expiration: 30 min for card, 7 days for SEPA (decision Q-IO-01/02)

Extends:
    solar.payment.transaction → linked_order_id
    solar.asset               → investment_order_ids
    """,
    'author':   'SolarCells RWA',
    'license':  'LGPL-3',
    'depends':  ['solar_payment', 'solar_holding'],
    'data': [
        'security/ir.model.access.csv',
        'data/solar_investment_cron.xml',
        'views/solar_investment_views.xml',
        'views/solar_investment_menus.xml',
    ],
    'installable':  True,
    'auto_install': False,
    'application':  False,
}
