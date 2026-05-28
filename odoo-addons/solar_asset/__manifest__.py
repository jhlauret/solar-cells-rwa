# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name':        'Solar — Asset',
    'version':     '18.0.1.0.0',
    'category':    'Solar/Asset',
    'summary':     'Solar asset registry: lifecycle, tokenisation and marketplace control.',
    'description': """
Solar — Asset
=============
Manages the full lifecycle of solar assets on the SolarCells RWA platform.

``solar.asset``
    Central model for every solar installation tokenised on the platform.
    Nine states from draft to decommissioned.
    Fields cover geography, technical specs, PPA contract, financials,
    on-chain token details, and marketplace settings.

``solar.asset.document``
    Supporting documents attached to an asset (prospectus, technical report,
    insurance certificate, etc.) stored on MinIO.

Relations added later by their respective addons (via _inherit):
    solar_holding    → holding_ids, cells_subscribed
    solar_investment → investment_order_ids
    solar_market     → market_order_ids
    solar_yield      → distribution_ids

State machine:
    draft → pending_approval → financing → financing_complete → in_production
                                                               → paused
                                                               → mature (cron)
                                                               → decommissioned
    Cancelled from: pending_approval, financing.

Scheduled actions:
    Daily: auto-transition in_production assets past their project end date.
    """,
    'author':      'SolarCells RWA',
    'license':     'LGPL-3',
    'depends': [
        'solar_core',
    ],
    'data': [
        'security/ir.model.access.csv',
        'data/solar_asset_cron.xml',
        'views/solar_asset_views.xml',
        'views/solar_asset_menus.xml',
    ],
    'installable':  True,
    'auto_install': False,
    'application':  False,
}
