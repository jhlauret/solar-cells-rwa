# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""solar.compliance.alert — AML/CFT compliance alert.

Raised automatically by sanctions-list screening or manually by a
compliance officer. A HIGH severity alert auto-suspends the investor account.

States: open → under_review → resolved / dismissed / escalated.
"""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

ALERT_TYPE = [
    ('sanctions_hit',      'Sanctions list hit'),
    ('pep_detected',       'PEP detected'),
    ('unusual_transaction','Unusual transaction pattern'),
    ('country_risk',       'High-risk country'),
    ('adverse_media',      'Adverse media'),
    ('kyc_mismatch',       'KYC data mismatch'),
    ('manual',             'Manual review'),
]

SEVERITY = [
    ('low',      'Low'),
    ('medium',   'Medium'),
    ('high',     'High'),
    ('critical', 'Critical'),
]

ALERT_STATE = [
    ('open',          'Open'),
    ('under_review',  'Under review'),
    ('resolved',      'Resolved'),
    ('dismissed',     'Dismissed'),
    ('escalated',     'Escalated'),
]


class SolarComplianceAlert(models.Model):
    """AML/CFT compliance alert for an investor."""

    _name        = 'solar.compliance.alert'
    _description = 'Compliance Alert'
    _inherit     = ['mail.thread', 'mail.activity.mixin']
    _order       = 'raised_at desc'
    _rec_name    = 'name'

    uuid      = fields.Char(required=True, copy=False, readonly=True,
                             index=True, default=lambda self: str(uuid_lib.uuid4()))
    name      = fields.Char(required=True, copy=False, readonly=True,
                             index=True, default='/')

    partner_id  = fields.Many2one('res.partner', string="Investor",
                                  required=True, ondelete='restrict',
                                  index=True, tracking=True)
    alert_type  = fields.Selection(ALERT_TYPE, required=True, tracking=True)
    severity    = fields.Selection(SEVERITY,   required=True, default='medium',
                                   tracking=True)
    description = fields.Text(required=True)

    state       = fields.Selection(ALERT_STATE, default='open', required=True,
                                   index=True, tracking=True)
    raised_at   = fields.Datetime(default=fields.Datetime.now, copy=False,
                                   required=True)
    raised_by   = fields.Many2one('res.users', default=lambda self: self.env.uid,
                                   copy=False)
    resolved_at = fields.Datetime(copy=False)
    resolved_by = fields.Many2one('res.users', copy=False)
    resolution_note = fields.Text(copy=False)

    # Screening source
    screening_source   = fields.Char(help="Provider / list name (e.g. 'Dow Jones Risk & Compliance').")
    screening_match_id = fields.Char(help="Match reference from the screening provider.")
    raw_match_data     = fields.Json(copy=False)

    # ------------------------------------------------------------------

    @api.model_create_multi
    def create(self, vals_list):
        for v in vals_list:
            if not v.get('uuid'):
                v['uuid'] = str(uuid_lib.uuid4())
            if v.get('name', '/') == '/':
                v['name'] = f"AML-{str(uuid_lib.uuid4())[:8].upper()}"
        records = super().create(vals_list)
        for alert in records:
            self.env['solar.audit.log'].create_audit_entry(
                action_code='compliance.alert.raised', subject=alert,
                after={
                    'partner_uuid': alert.partner_id.x_uuid,
                    'alert_type':   alert.alert_type,
                    'severity':     alert.severity,
                })
            # High/critical → auto-suspend investor
            if alert.severity in ('high', 'critical'):
                if alert.partner_id.x_account_state == 'active':
                    alert.partner_id.action_suspend(
                        reason=_(
                            "Auto-suspended: compliance alert %s (%s / %s)"
                        ) % (alert.name, alert.alert_type, alert.severity)
                    )
        return records

    # ------------------------------------------------------------------

    def action_start_review(self):
        self._assert_state(['open'], 'Start review')
        self.write({'state': 'under_review'})
        return True

    def action_resolve(self, resolution_note=None):
        self._assert_state(['open', 'under_review', 'escalated'], 'Resolve')
        now = fields.Datetime.now()
        self.write({
            'state':           'resolved',
            'resolved_at':     now,
            'resolved_by':     self.env.uid,
            'resolution_note': resolution_note,
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='compliance.alert.resolved', subject=self,
            after={'state': 'resolved', 'note': resolution_note})
        return True

    def action_dismiss(self, note=None):
        self._assert_state(['open', 'under_review'], 'Dismiss')
        self.write({
            'state':           'dismissed',
            'resolved_at':     fields.Datetime.now(),
            'resolved_by':     self.env.uid,
            'resolution_note': note or _("False positive dismissed."),
        })
        return True

    def action_escalate(self):
        self._assert_state(['open', 'under_review'], 'Escalate')
        self.write({'state': 'escalated'})
        return True

    def _assert_state(self, expected, action):
        self.ensure_one()
        if self.state not in expected:
            raise UserError(_("Cannot '%s': state is '%s'.") % (action, self.state))

    # ------------------------------------------------------------------
    # Scheduled action
    # ------------------------------------------------------------------

    @api.model
    def _cron_aml_screening_reminder(self):
        """Daily: create low-severity alerts for investors not screened in 90 days."""
        from datetime import timedelta
        cutoff = fields.Datetime.now() - timedelta(days=90)
        investors = self.env['res.partner'].search([
            ('x_is_investor',  '=', True),
            ('x_account_state','=', 'active'),
            ('x_last_aml_screen_at', '<=', cutoff),
        ])
        for partner in investors:
            existing_open = self.search([
                ('partner_id', '=', partner.id),
                ('alert_type', '=', 'manual'),
                ('state',      'in', ['open', 'under_review']),
            ], limit=1)
            if not existing_open:
                self.create({
                    'partner_id':  partner.id,
                    'alert_type':  'manual',
                    'severity':    'low',
                    'description': _(
                        "Periodic AML rescreening required. "
                        "Last screening: %s."
                    ) % (partner.x_last_aml_screen_at or _("never")),
                })
        _logger.info(
            "AML screening reminder: %d investors scheduled for rescreening.",
            len(investors),
        )
        return True

    # ------------------------------------------------------------------
    # JSON-RPC API
    # ------------------------------------------------------------------

    @api.model
    def raise_alert(self, partner_uuid, alert_type, severity, description,
                    screening_source=None, screening_match_id=None, raw_data=None):
        """Create an alert from the Node.js backend or an automated screening job.

        :returns: dict with alert uuid and auto_suspended flag.
        """
        partner = self.env['res.partner'].search(
            [('x_uuid', '=', partner_uuid)], limit=1)
        if not partner:
            raise UserError(_("Partner not found for UUID '%s'.") % partner_uuid)

        was_active = partner.x_account_state == 'active'
        alert = self.create({
            'partner_id':          partner.id,
            'alert_type':          alert_type,
            'severity':            severity,
            'description':         description,
            'screening_source':    screening_source,
            'screening_match_id':  screening_match_id,
            'raw_match_data':      raw_data or {},
        })
        auto_suspended = was_active and partner.x_account_state == 'suspended'
        return {
            'alert_uuid':     alert.uuid,
            'alert_name':     alert.name,
            'auto_suspended': auto_suspended,
        }
