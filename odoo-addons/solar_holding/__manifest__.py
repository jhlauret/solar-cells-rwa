# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name':        'Solar — Holding',
    'version':     '18.0.1.0.0',
    'category':    'Solar/Holding',
    'summary':     'Investor holdings: cells owned, weighted average price, portfolio totals.',
    'description': """
Solar — Holding
===============
One ``solar.holding`` record per (investor, asset) pair.

Tracks how many Solar Cells an investor owns in a given asset, the weighted
average acquisition price, cumulative invested amount, and lifecycle state.

Created and updated by ``solar_investment`` on each subscription settlement.
Updated by ``solar_market`` when cells are transferred on the secondary market.

Also extends:
  - ``solar.asset``   → holding_ids (One2many), cells_subscribed auto-update
  - ``res.partner``   → x_holding_ids, x_total_invested, x_portfolio_value
    """,
    'author':   'SolarCells RWA',
    'license':  'LGPL-3',
    'depends':  ['solar_asset'],
    'data': [
        'security/ir.model.access.csv',
        'views/solar_holding_views.xml',
        'views/solar_asset_views.xml',
        'views/res_partner_views.xml',
        'views/solar_holding_menus.xml',
    ],
    'installable':  True,
    'auto_install': False,
    'application':  False,
}
