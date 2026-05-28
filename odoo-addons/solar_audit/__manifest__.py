# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name': 'Solar — Audit',
    'version': '18.0.1.0.0',
    'category': 'Solar/Compliance',
    'summary': 'Append-only audit log for the SolarCells RWA platform.',
    'description': """
Solar — Audit Log
=================

Foundation addon for the SolarCells RWA platform.

Provides an **immutable**, **append-only** audit log used by every other
``solar_*`` addon to record sensitive business actions:

* KYC decisions (validations, rejections)
* Investment orders (created, paid, settled, cancelled)
* Marketplace trades (executed, failed)
* Yield distributions (calculated, executed)
* Wallet lifecycle events (created, frozen, closed)
* Compliance interventions (AML alerts, account suspensions)

Entries can ONLY be created through the dedicated class method
``solar.audit.log.create_audit_entry``. Direct ``create()``, ``write()``,
``unlink()`` calls are blocked by design.

Retention: 10 years minimum (regulatory requirement). A controlled
retention purge is available via context flag ``audit_retention_purge``.

This addon depends only on ``base`` and is intended to be installed
first in any SolarCells deployment.
    """,
    'author': 'SolarCells RWA',
    'website': 'https://solarcells.example.com',
    'license': 'LGPL-3',
    'depends': [
        'base',
    ],
    'data': [
        'security/solar_audit_groups.xml',
        'security/ir.model.access.csv',
        'views/solar_audit_log_views.xml',
        'views/solar_audit_menus.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
