# -*- coding: utf-8 -*-
{
    'name':    'Solar — Yield',
    'version': '18.0.1.0.0',
    'category':'Solar/Finance',
    'summary': 'Yield distributions: per-asset quarterly events + per-investor lines.',
    'description': """
Solar — Yield
=============
``solar.yield.distribution`` — one quarterly/annual event per asset.
``solar.yield.line``         — one line per active holding at distribution time.

On validation, distribution_per_cell is locked and one yield.line per active
holding is created. On payment, the line triggers an outbound payment transaction
and credits total_yield_received on the holding.

Extends: solar.asset (distribution_ids), solar.holding (yield_line_ids, total_yield_received).
    """,
    'author':  'SolarCells RWA',
    'license': 'LGPL-3',
    'depends': ['solar_market'],
    'data': [
        'security/ir.model.access.csv',
        'views/solar_yield_views.xml',
        'views/solar_yield_menus.xml',
    ],
    'installable': True, 'auto_install': False, 'application': False,
}
