# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name':        'Solar — Core',
    'version':     '18.0.1.0.0',
    'category':    'Solar/Core',
    'summary':     'Core investor model, security groups and sequences for SolarCells RWA.',
    'description': """
Solar — Core
============
Foundation addon for the SolarCells RWA platform.

Provides:
- Extension of ``res.partner`` with investor-specific fields (account state,
  identity, banking, KYC status placeholder, marketing consent, etc.)
- **All shared security groups** used across every ``solar_*`` addon:
  ``group_investor``, ``group_asset_manager``, ``group_finance``,
  ``group_compliance``, ``group_api``
- **Sequences** for all reference numbers (investment orders, payments, etc.)
- Root menu "Solar" visible to all solar groups

Dependency chain: every other solar_* addon depends on solar_core.

This addon depends on solar_audit (log every sensitive action).
    """,
    'author':      'SolarCells RWA',
    'website':     'https://solarcells.example.com',
    'license':     'LGPL-3',
    'depends': [
        'base',
        'mail',        # mail.thread + mail.activity.mixin on res.partner
        'solar_audit', # write audit entries on every sensitive action
    ],
    'data': [
        # Security first — groups must exist before access rules
        'security/solar_core_groups.xml',
        'security/ir.model.access.csv',
        # Static data
        'data/solar_core_sequences.xml',
        # Views
        'views/res_partner_views.xml',
        'views/solar_core_menus.xml',
    ],
    'installable':  True,
    'auto_install': False,
    'application':  False,
}
