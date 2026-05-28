# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.kyc.decision — immutable KYC decision record.

Every state transition of a solar.kyc.case that constitutes a formal
compliance decision (approve, reject, escalate, renewal) creates one record
here. Records are immutable: write() and unlink() are blocked.

The pattern mirrors solar.audit.log but is specific to KYC decisions and
links back to the case and its documents.
"""

import logging
import uuid as uuid_lib

from odoo import _, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

DECISION_SELECTION = [
    ('approved',         'Approved'),
    ('rejected',         'Rejected'),
    ('escalated',        'Escalated (manual review)'),
    ('renewal_required', 'Renewal required'),
]

DECISION_SOURCE_SELECTION = [
    ('automatic', 'Automatic rule'),
    ('manual',    'Manual decision (compliance officer)'),
    ('provider',  'Provider decision (Onfido, Sumsub…)'),
]


class SolarKycDecision(models.Model):
    """Immutable KYC decision record — append-only compliance trail."""

    _name        = 'solar.kyc.decision'
    _description = 'KYC Decision (immutable)'
    _order       = 'decision_at desc'
    _rec_name    = 'decision'

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------

    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
    )
    case_id = fields.Many2one(
        'solar.kyc.case',
        string="KYC case",
        required=True,
        ondelete='restrict',   # cannot delete a case that has decisions
        index=True,
        readonly=True,
    )

    # ------------------------------------------------------------------
    # Decision content
    # ------------------------------------------------------------------

    decision = fields.Selection(
        selection=DECISION_SELECTION,
        string="Decision",
        required=True,
        readonly=True,
        index=True,
    )
    kyc_level = fields.Selection(
        selection=[('L1','L1'),('L2','L2'),('L3','L3'),('L4','L4')],
        string="KYC level granted",
        readonly=True,
        help="KYC level granted by this decision (only relevant for 'approved').",
    )
    decision_at = fields.Datetime(
        string="Decision date",
        default=fields.Datetime.now,
        required=True,
        readonly=True,
        index=True,
    )
    decided_by = fields.Many2one(
        'res.users',
        string="Decided by",
        readonly=True,
        help="Null if the decision was made automatically.",
    )
    decision_source = fields.Selection(
        selection=DECISION_SOURCE_SELECTION,
        string="Decision source",
        required=True,
        readonly=True,
        default='manual',
    )
    decision_reason = fields.Text(
        string="Reason",
        readonly=True,
        help="Human-readable reason for the decision, required for rejections.",
    )

    # ------------------------------------------------------------------
    # State snapshot
    # ------------------------------------------------------------------

    previous_state = fields.Char(
        string="Previous state",
        readonly=True,
    )
    new_state = fields.Char(
        string="New state",
        required=True,
        readonly=True,
    )

    # ------------------------------------------------------------------
    # Documents considered
    # ------------------------------------------------------------------

    document_ids = fields.Many2many(
        'solar.kyc.document',
        'solar_kyc_decision_document_rel',
        'decision_id',
        'document_id',
        string="Documents considered",
        readonly=True,
        help="Documents that were reviewed when this decision was made.",
    )

    # ==================================================================
    # Immutability guards
    # ==================================================================

    def write(self, vals):
        """KYC decisions are immutable. Write is forbidden."""
        raise UserError(_(
            "KYC decisions are immutable and cannot be modified. "
            "Decision: %s on case %s."
        ) % (self.mapped('decision'), self.mapped('case_id.name')))

    def unlink(self):
        """KYC decisions are immutable. Deletion is forbidden."""
        raise UserError(_(
            "KYC decisions cannot be deleted. "
            "They form the compliance audit trail for cases: %s."
        ) % ', '.join(self.mapped('case_id.name')))

    # ==================================================================
    # Computed display
    # ==================================================================

    def name_get(self):
        result = []
        for rec in self:
            label = dict(DECISION_SELECTION).get(rec.decision, rec.decision)
            case_name = rec.case_id.name or '?'
            result.append((rec.id, f"{label} — {case_name}"))
        return result
