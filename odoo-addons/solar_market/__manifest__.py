# -*- coding: utf-8 -*-
{
    'name':    'Solar — Market',
    'version': '18.0.1.0.0',
    'category':'Solar/Market',
    'summary': 'Secondary marketplace: peer-to-peer Solar Cell transfers.',
    'description': """
Solar — Market
==============
``solar.market.order`` — sell or buy offer posted by a whitelisted investor.
``solar.market.trade`` — matched and settled trade.

On settlement:
  seller holding debited · buyer holding credited · 2 payment transactions created.

Extends: solar.asset (market_order_ids), solar.payment.transaction (linked_trade_id).
    """,
    'author':  'SolarCells RWA',
    'license': 'LGPL-3',
    'depends': ['solar_investment'],
    'data': [
        'security/ir.model.access.csv',
        'data/solar_market_cron.xml',
        'views/solar_market_views.xml',
        'views/solar_market_menus.xml',
    ],
    'installable': True, 'auto_install': False, 'application': False,
}
