# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Extension de res.partner par solar_kyc.

Ajoute les champs KYC à res.partner :
  - x_kyc_case_id       : lien vers le cas KYC (Many2one)
  - x_kyc_status        : statut dénormalisé (related)
  - x_kyc_level         : niveau dénormalisé (related)

Ces champs ne peuvent pas être dans solar_core car solar.kyc.case
n'existait pas encore lors de l'installation de solar_core.
"""

from odoo import fields, models


class ResPartnerKyc(models.Model):
    """Extends res.partner with KYC-related fields (solar_kyc addon)."""

    _inherit = 'res.partner'

    x_kyc_case_id = fields.Many2one(
        'solar.kyc.case',
        string="KYC case",
        copy=False,
        tracking=True,
        help="The single KYC case associated with this investor. "
             "One case per investor at most.",
    )
    x_kyc_status = fields.Selection(
        related='x_kyc_case_id.state',
        string="KYC status",
        store=True,
        readonly=True,
        help="Denormalised from the KYC case state for fast filtering.",
    )
    x_kyc_level = fields.Selection(
        related='x_kyc_case_id.level',
        string="KYC level",
        store=True,
        readonly=True,
        help="Denormalised from the KYC case level for fast filtering.",
    )
    x_kyc_expires_at = fields.Datetime(
        related='x_kyc_case_id.expires_at',
        string="KYC expires at",
        store=True,
        readonly=True,
    )
