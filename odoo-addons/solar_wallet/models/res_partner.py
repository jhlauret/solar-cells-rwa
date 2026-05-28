# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Extension de res.partner par solar_wallet.

Ajoute les champs wallet à res.partner :
  - x_wallet_ids           : liste de tous les wallets
  - x_primary_wallet_id    : wallet principal actif
"""

from odoo import fields, models


class ResPartnerWallet(models.Model):
    """Extends res.partner with wallet-related fields (solar_wallet addon)."""

    _inherit = 'res.partner'

    x_wallet_ids = fields.One2many(
        'solar.wallet',
        'partner_id',
        string="Wallets",
        help="All wallets associated with this investor (pending, active, frozen, closed).",
    )
    x_primary_wallet_id = fields.Many2one(
        'solar.wallet',
        string="Primary wallet",
        domain="[('partner_id', '=', id), ('state', '=', 'active')]",
        help="The investor's current primary wallet (used for receiving tokens and payouts). "
             "Updated automatically on wallet activation and closure.",
        copy=False,
    )
    x_wallet_address = fields.Char(
        related='x_primary_wallet_id.address',
        string="Wallet address",
        store=True,
        readonly=True,
        help="On-chain address of the primary wallet.",
    )
    x_wallet_state = fields.Selection(
        related='x_primary_wallet_id.state',
        string="Wallet state",
        store=True,
        readonly=True,
    )
    x_wallet_whitelisted = fields.Boolean(
        related='x_primary_wallet_id.whitelisted_on_chain',
        string="Wallet whitelisted",
        store=True,
        readonly=True,
    )
