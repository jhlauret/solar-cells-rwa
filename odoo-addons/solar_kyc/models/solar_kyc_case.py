# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""solar.kyc.case — KYC case aggregator.

One record per investor. Tracks the overall KYC state and links to the
individual documents and decisions.

State machine
-------------
not_started → in_progress → submitted → validated  (terminal*)
                                      → rejected   (terminal*)
                             → under_review → validated
                                            → rejected
validated   → expired       (cron, after expires_at)
validated   → suspended     (compliance action)
expired     → in_progress   (renewal)
rejected    → in_progress   (retry, after manual review)

(*) An account can be re-opened by compliance after rejection or expiry.

Expiration (decision Q-INV-02)
-------------------------------
- L1 / L2 KYC: expires 2 years after validated_at
- L3 / L4 KYC: expires 1 year after validated_at
"""

import logging
import uuid as uuid_lib
from dateutil.relativedelta import relativedelta

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

# Years of validity per KYC level (decision Q-INV-02)
_EXPIRY_YEARS = {'L1': 2, 'L2': 2, 'L3': 1, 'L4': 1}

KYC_STATE_SELECTION = [
    ('not_started',  'Not started'),
    ('in_progress',  'In progress'),
    ('submitted',    'Submitted'),
    ('under_review', 'Under review'),
    ('validated',    'Validated'),
    ('rejected',     'Rejected'),
    ('expired',      'Expired'),
    ('suspended',    'Suspended'),
]

KYC_LEVEL_SELECTION = [
    ('L1', 'L1 — Basic'),
    ('L2', 'L2 — Standard'),
    ('L3', 'L3 — Enhanced'),
    ('L4', 'L4 — Institutional'),
]

KYC_PROVIDER_SELECTION = [
    ('onfido',  'Onfido'),
    ('sumsub',  'Sumsub'),
    ('veriff',  'Veriff'),
    ('manual',  'Manual review'),
]

# Required document types per state transition to "submitted"
REQUIRED_DOC_TYPES = ['identity_card', 'selfie_liveness', 'proof_of_address']


class SolarKycCase(models.Model):
    """KYC case aggregator — one per investor."""

    _name        = 'solar.kyc.case'
    _description = 'KYC Case'
    _inherit     = ['mail.thread', 'mail.activity.mixin']
    _order       = 'create_date desc'
    _rec_name    = 'name'

    # ------------------------------------------------------------------
    # Identity
    # ------------------------------------------------------------------

    name = fields.Char(
        string="Reference",
        required=True,
        copy=False,
        readonly=True,
        default='/',
        index=True,
    )
    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
    )
    partner_id = fields.Many2one(
        'res.partner',
        string="Investor",
        required=True,
        ondelete='restrict',
        index=True,
        tracking=True,
    )

    # ------------------------------------------------------------------
    # State machine
    # ------------------------------------------------------------------

    state = fields.Selection(
        selection=KYC_STATE_SELECTION,
        string="State",
        default='not_started',
        required=True,
        tracking=True,
        index=True,
    )
    level = fields.Selection(
        selection=KYC_LEVEL_SELECTION,
        string="KYC level",
        tracking=True,
        help="KYC level awarded at the last validation.",
    )

    # ------------------------------------------------------------------
    # Provider integration
    # ------------------------------------------------------------------

    provider = fields.Selection(
        selection=KYC_PROVIDER_SELECTION,
        string="KYC provider",
        default='onfido',
        tracking=True,
    )
    provider_case_id = fields.Char(
        string="Provider case ID",
        copy=False,
        index=True,
        help="Reference identifier in the KYC provider's system.",
    )
    provider_webhook_data = fields.Json(
        string="Last webhook payload",
        copy=False,
        help="Raw JSON payload received from the provider's last webhook.",
    )

    # ------------------------------------------------------------------
    # Risk assessment
    # ------------------------------------------------------------------

    risk_score = fields.Float(
        string="Risk score",
        digits=(5, 2),
        tracking=True,
        help="0 = minimal risk, 100 = maximal risk.",
    )
    pep_status = fields.Boolean(
        string="PEP",
        default=False,
        tracking=True,
        help="Politically Exposed Person.",
    )
    pep_details = fields.Text(
        string="PEP details",
        help="Details about the PEP status (position, country, etc.).",
    )
    sanctions_check_at = fields.Datetime(
        string="Sanctions check date",
        help="Last date the investor was screened against sanctions lists.",
    )

    # ------------------------------------------------------------------
    # Timeline
    # ------------------------------------------------------------------

    submitted_at = fields.Datetime(string="Submitted at",  copy=False)
    validated_at = fields.Datetime(string="Validated at",  copy=False, tracking=True)
    rejected_at  = fields.Datetime(string="Rejected at",   copy=False)
    expires_at   = fields.Datetime(
        string="Expires at",
        copy=False,
        tracking=True,
        compute='_compute_expires_at',
        store=True,
        help="Computed from validated_at + years per KYC level (2y for L1/L2, 1y for L3/L4).",
    )
    rejection_reason = fields.Text(string="Rejection reason", copy=False)

    # ------------------------------------------------------------------
    # Related child records
    # ------------------------------------------------------------------

    document_ids = fields.One2many(
        'solar.kyc.document',
        'case_id',
        string="Documents",
    )
    document_count = fields.Integer(
        string="Documents",
        compute='_compute_document_count',
    )
    decision_ids = fields.One2many(
        'solar.kyc.decision',
        'case_id',
        string="Decisions",
    )
    decision_count = fields.Integer(
        string="Decisions",
        compute='_compute_decision_count',
    )

    # ------------------------------------------------------------------
    # Computed
    # ------------------------------------------------------------------

    @api.depends('validated_at', 'level')
    def _compute_expires_at(self):
        for case in self:
            if case.validated_at and case.level:
                years = _EXPIRY_YEARS.get(case.level, 2)
                case.expires_at = case.validated_at + relativedelta(years=years)
            else:
                case.expires_at = False

    def _compute_document_count(self):
        for case in self:
            case.document_count = len(case.document_ids)

    def _compute_decision_count(self):
        for case in self:
            case.decision_count = len(case.decision_ids)

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------

    @api.constrains('partner_id')
    def _check_one_case_per_partner(self):
        """Only one KYC case per partner is allowed."""
        for case in self:
            duplicate = self.search([
                ('partner_id', '=', case.partner_id.id),
                ('id', '!=', case.id),
            ], limit=1)
            if duplicate:
                raise ValidationError(_(
                    "Partner '%s' already has a KYC case (%s). "
                    "Only one KYC case per investor is allowed."
                ) % (case.partner_id.name, duplicate.name))

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', '/') == '/':
                vals['name'] = (
                    self.env['ir.sequence'].next_by_code('solar.kyc.case')
                    or 'KYC-NEW'
                )
            if not vals.get('uuid'):
                vals['uuid'] = str(uuid_lib.uuid4())
        return super().create(vals_list)

    # ------------------------------------------------------------------
    # State transitions
    # ------------------------------------------------------------------

    def _check_state(self, expected_states, action_name):
        """Assert the record is in one of the expected states."""
        self.ensure_one()
        if self.state not in expected_states:
            raise UserError(_(
                "Cannot execute '%s' on KYC case %s: current state is '%s'. "
                "Expected: %s."
            ) % (action_name, self.name, self.state,
                 ', '.join("'%s'" % s for s in expected_states)))

    def action_start(self):
        """not_started → in_progress. Called when the first document is uploaded."""
        self._check_state(['not_started'], 'Start KYC')
        self.write({'state': 'in_progress'})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='kyc.case.started',
            subject=self,
            after={'state': 'in_progress'},
        )
        return True

    def action_submit(self):
        """in_progress → submitted.

        Validates that all required document types have at least one validated
        or pending document before allowing submission.
        """
        self._check_state(['in_progress'], 'Submit KYC')
        uploaded_types = set(self.document_ids.mapped('document_type'))
        missing = [t for t in REQUIRED_DOC_TYPES if t not in uploaded_types]
        if missing:
            raise UserError(_(
                "Cannot submit KYC case %s. Missing required document types: %s."
            ) % (self.name, ', '.join(missing)))

        self.write({
            'state':        'submitted',
            'submitted_at': fields.Datetime.now(),
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='kyc.case.submitted',
            subject=self,
            after={'state': 'submitted'},
        )
        return True

    def action_escalate(self):
        """submitted → under_review. Provider or compliance requests manual review."""
        self._check_state(['submitted'], 'Escalate for manual review')
        self.write({'state': 'under_review'})
        self._create_decision('escalated', source='manual')
        self.env['solar.audit.log'].create_audit_entry(
            action_code='kyc.case.escalated',
            subject=self,
            after={'state': 'under_review'},
        )
        return True

    def action_approve(self, kyc_level=None, source='manual'):
        """submitted / under_review → validated.

        :param str kyc_level: 'L1', 'L2', 'L3', or 'L4'. Required.
        :param str source: 'manual', 'automatic', or 'provider'.
        """
        self._check_state(['submitted', 'under_review'], 'Approve KYC')
        if not kyc_level:
            raise UserError(_("KYC level is required to approve a KYC case."))

        before_state = self.state
        now = fields.Datetime.now()
        self.write({
            'state':       'validated',
            'level':       kyc_level,
            'validated_at': now,
            'rejected_at':  False,
            'rejection_reason': False,
        })

        # Create immutable decision record
        self._create_decision(
            decision='approved',
            kyc_level=kyc_level,
            source=source,
            previous_state=before_state,
        )

        # Audit log
        self.env['solar.audit.log'].create_audit_entry(
            action_code='kyc.validated',
            subject=self,
            before={'state': before_state},
            after={
                'state': 'validated',
                'level': kyc_level,
                'expires_at': str(self.expires_at),
            },
        )
        _logger.info(
            "KYC case %s approved for partner %s (level=%s, expires=%s).",
            self.name, self.partner_id.name, kyc_level, self.expires_at,
        )
        return True

    def action_reject(self, reason=None, source='manual'):
        """submitted / under_review → rejected.

        :param str reason: Human-readable rejection reason.
        :param str source: 'manual', 'automatic', or 'provider'.
        """
        self._check_state(['submitted', 'under_review'], 'Reject KYC')
        before_state = self.state
        self.write({
            'state':            'rejected',
            'rejected_at':      fields.Datetime.now(),
            'rejection_reason': reason,
        })
        self._create_decision(
            decision='rejected',
            source=source,
            reason=reason,
            previous_state=before_state,
        )
        self.env['solar.audit.log'].create_audit_entry(
            action_code='kyc.rejected',
            subject=self,
            before={'state': before_state},
            after={'state': 'rejected', 'rejection_reason': reason},
        )
        return True

    def action_renew(self):
        """expired / rejected → in_progress. Starts a renewal process."""
        self._check_state(['expired', 'rejected'], 'Renew KYC')
        before_state = self.state
        self.write({
            'state':       'in_progress',
            'validated_at': False,
            'rejected_at':  False,
        })
        self._create_decision('renewal_required', source='automatic', previous_state=before_state)
        self.env['solar.audit.log'].create_audit_entry(
            action_code='kyc.renewal.started',
            subject=self,
            before={'state': before_state},
            after={'state': 'in_progress'},
        )
        return True

    def action_suspend(self, reason=None):
        """validated → suspended. Compliance-only action."""
        self._check_state(['validated'], 'Suspend KYC')
        self.write({'state': 'suspended', 'rejection_reason': reason})
        self.env['solar.audit.log'].create_audit_entry(
            action_code='kyc.suspended',
            subject=self,
            after={'state': 'suspended', 'reason': reason},
        )
        return True

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _create_decision(self, decision, kyc_level=None, source='manual',
                         reason=None, previous_state=None):
        """Create an immutable solar.kyc.decision record."""
        self.env['solar.kyc.decision'].create({
            'case_id':       self.id,
            'decision':      decision,
            'kyc_level':     kyc_level or self.level,
            'decision_at':   fields.Datetime.now(),
            'decided_by':    self.env.uid,
            'decision_source': source,
            'decision_reason': reason,
            'previous_state': previous_state or self.state,
            'new_state':     self.state,
        })

    # ------------------------------------------------------------------
    # Scheduled actions (cron)
    # ------------------------------------------------------------------

    @api.model
    def _cron_expire_kyc_cases(self):
        """Daily cron: transition validated cases past their expires_at to 'expired'.

        Run by: Cron: Expire KYC cases (solar_kyc.ir_cron_expire_kyc).
        """
        now = fields.Datetime.now()
        expired_cases = self.search([
            ('state', '=', 'validated'),
            ('expires_at', '<=', now),
        ])
        for case in expired_cases:
            try:
                before = case.state
                case.write({'state': 'expired'})
                case._create_decision('renewal_required', source='automatic', previous_state=before)
                case.env['solar.audit.log'].create_audit_entry(
                    action_code='kyc.expired',
                    subject=case,
                    after={'state': 'expired'},
                )
                _logger.info("KYC case %s expired.", case.name)
            except Exception as exc:
                _logger.error("Failed to expire KYC case %s: %s", case.name, exc)
        return True

    @api.model
    def _cron_remind_expiring_kyc(self):
        """Weekly cron: log reminder for KYC cases expiring within 30 days."""
        from datetime import timedelta
        now = fields.Datetime.now()
        deadline = now + timedelta(days=30)
        expiring = self.search([
            ('state', '=', 'validated'),
            ('expires_at', '>=', now),
            ('expires_at', '<=', deadline),
        ])
        for case in expiring:
            self.env['solar.audit.log'].create_audit_entry(
                action_code='kyc.expiry.reminder',
                subject=case,
                after={
                    'expires_at': str(case.expires_at),
                    'days_remaining': (case.expires_at.date() - now.date()).days,
                },
            )
        _logger.info("KYC expiry reminder: %d cases expire within 30 days.", len(expiring))
        return True

    # ------------------------------------------------------------------
    # JSON-RPC API
    # ------------------------------------------------------------------

    @api.model
    def get_or_create_for_partner(self, partner_uuid):
        """Return the KYC case for this partner, creating one if missing.

        Idempotent — safe to call multiple times.

        :param str partner_uuid: The investor's external UUID.
        :returns: dict with case uuid and current state.
        """
        partner = self.env['res.partner'].search(
            [('x_uuid', '=', partner_uuid)], limit=1,
        )
        if not partner:
            raise UserError(_("Partner not found for UUID '%s'.") % partner_uuid)

        case = self.search([('partner_id', '=', partner.id)], limit=1)
        if not case:
            case = self.create({'partner_id': partner.id})
            _logger.info("Created KYC case %s for partner %s.", case.name, partner.name)

        return {'uuid': case.uuid, 'state': case.state, 'name': case.name}

    def get_status_dict(self):
        """Return a JSON-safe dict of the current case state."""
        self.ensure_one()
        return {
            'uuid':            self.uuid,
            'name':            self.name,
            'state':           self.state,
            'level':           self.level,
            'expires_at':      str(self.expires_at) if self.expires_at else None,
            'document_count':  self.document_count,
            'decision_count':  self.decision_count,
            'pep_status':      self.pep_status,
            'provider':        self.provider,
            'submitted_at':    str(self.submitted_at) if self.submitted_at else None,
            'validated_at':    str(self.validated_at) if self.validated_at else None,
        }
