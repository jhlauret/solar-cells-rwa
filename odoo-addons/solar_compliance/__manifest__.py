# -*- coding: utf-8 -*-
{
    'name':    'Solar — Compliance',
    'version': '18.0.1.0.0',
    'category':'Solar/Compliance',
    'summary': 'AML screening alerts, risk scoring, PEP monitoring.',
    'description': """
Solar — Compliance
==================
``solar.compliance.alert`` — AML/CFT alerts raised by automated screening or
compliance officers. Triggers account suspension via solar_core.

Extends ``res.partner`` with x_aml_alert_ids, x_risk_level, x_last_aml_screen_at.

Cron: daily sanctions & PEP re-screening reminder.
    """,
    'author':  'SolarCells RWA',
    'license': 'LGPL-3',
    'depends': ['solar_yield'],
    'data': [
        'security/ir.model.access.csv',
        'data/solar_compliance_cron.xml',
        'views/solar_compliance_views.xml',
        'views/solar_compliance_menus.xml',
    ],
    'installable': True, 'auto_install': False, 'application': False,
}
