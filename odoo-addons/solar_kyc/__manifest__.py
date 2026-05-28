# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

{
    'name':        'Solar — KYC',
    'version':     '18.0.1.0.0',
    'category':    'Solar/Compliance',
    'summary':     'KYC workflow: cases, documents, immutable decisions.',
    'description': """
Solar — KYC
===========
Implements the three-model KYC workflow for SolarCells investors:

``solar.kyc.case``
    One per investor. Aggregator that holds the overall KYC state
    (not_started → in_progress → submitted → validated / rejected).
    Expiry is 2 years (L1/L2) or 1 year (L3/L4) from validation.

``solar.kyc.document``
    Documents uploaded during the KYC process (identity card, proof of
    address, selfie, source of funds, etc.). Stores the MinIO path and
    a SHA-256 hash for integrity verification.

``solar.kyc.decision``
    Immutable audit trail of every KYC decision (approved / rejected /
    escalated / renewal required). ``write()`` and ``unlink()`` are
    blocked by design.

Also extends ``res.partner`` with KYC fields:
    x_kyc_case_id, x_kyc_status (related), x_kyc_level (related).

Scheduled actions:
    - Daily cron: expires validated KYC cases past their expiry date.
    - Weekly cron: reminds investors whose KYC expires within 30 days.
    """,
    'author':      'SolarCells RWA',
    'website':     'https://solarcells.example.com',
    'license':     'LGPL-3',
    'depends': [
        'solar_core',   # res.partner extension + security groups + sequences
    ],
    'data': [
        'security/solar_kyc_groups.xml',
        'security/ir.model.access.csv',
        'data/solar_kyc_cron.xml',
        'views/solar_kyc_case_views.xml',
        'views/solar_kyc_document_views.xml',
        'views/solar_kyc_menus.xml',
    ],
    'installable':  True,
    'auto_install': False,
    'application':  False,
}
