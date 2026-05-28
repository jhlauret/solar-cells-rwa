# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name':        'Solar — Wallet',
    'version':     '18.0.1.0.0',
    'category':    'Solar/Wallet',
    'summary':     'Custodial wallet management for SolarCells investors.',
    'description': """
Solar — Wallet
==============
Manages custodial wallets for SolarCells investors.

``solar.wallet``
    One record per wallet. Investors may have multiple wallets
    but only ONE can be active at MVP (decision Q-WAL-01).

    Providers supported: Fireblocks, Copper, BitGo, Other.
    Networks supported: Tempo, Polygon, Base, Avalanche.

State machine:
    pending → active   (action_activate — after provider confirms creation)
    pending → failed   (action_mark_failed)
    active  → frozen   (action_freeze — compliance/AML)
    frozen  → active   (action_unfreeze — compliance clears)
    active  → closed   (action_close — account closure)
    frozen  → closed

Also extends ``res.partner`` with:
    x_wallet_ids, x_primary_wallet_id.

Scheduled actions:
    Daily: verifies that all active wallets are whitelisted on-chain.
    """,
    'author':      'SolarCells RWA',
    'license':     'LGPL-3',
    'depends': [
        'solar_core',
        'solar_kyc',   # wallet creation is only triggered after KYC validation
    ],
    'data': [
        'security/ir.model.access.csv',
        'data/solar_wallet_cron.xml',
        'views/solar_wallet_views.xml',
        'views/res_partner_views.xml',
        'views/solar_wallet_menus.xml',
    ],
    'installable':  True,
    'auto_install': False,
    'application':  False,
}
