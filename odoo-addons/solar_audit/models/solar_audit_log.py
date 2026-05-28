# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Solar Audit Log — append-only immutable audit trail.

This module implements the ``solar.audit.log`` model used by every other
``solar_*`` addon to record sensitive actions for compliance and audit
purposes.

Design constraints
------------------
* **Append-only.** Direct ``create()``, ``write()``, ``unlink()`` are blocked.
* **Single entry point.** Use :meth:`SolarAuditLog.create_audit_entry`.
* **Immutable.** Once created, entries cannot be modified.
* **Retention.** 10 years minimum. Controlled purge via context flag.
"""

import logging
import uuid as uuid_lib

from odoo import _, api, fields, models
from odoo.exceptions import AccessError, UserError, ValidationError

_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Selection constants
# ---------------------------------------------------------------------------

ACTOR_TYPE_USER = 'user'
ACTOR_TYPE_PARTNER = 'partner'
ACTOR_TYPE_SYSTEM = 'system'
ACTOR_TYPE_API_CLIENT = 'api_client'

ACTOR_TYPE_SELECTION = [
    (ACTOR_TYPE_USER,       'Internal user'),
    (ACTOR_TYPE_PARTNER,    'Investor / Partner'),
    (ACTOR_TYPE_SYSTEM,     'System (cron, automated)'),
    (ACTOR_TYPE_API_CLIENT, 'API client (backend Node)'),
]

# Context flag used to enable retention-period unlink. ANY other unlink fails.
RETENTION_PURGE_CONTEXT_KEY = 'audit_retention_purge'


class SolarAuditLog(models.Model):
    """Append-only audit log entry.

    Every entry represents a single action performed on a subject record
    (a ``res.partner``, a ``solar.asset``, a ``solar.holding``, etc.).

    Entries are created exclusively through :meth:`create_audit_entry`.
    They cannot be modified or deleted (except by the controlled retention
    purge after the 10-year retention period).
    """

    _name = 'solar.audit.log'
    _description = 'Solar Audit Log (append-only)'
    _order = 'timestamp desc, id desc'
    _rec_name = 'action_code'

    # ------------------------------------------------------------------
    # Identification
    # ------------------------------------------------------------------

    uuid = fields.Char(
        string="UUID",
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
        help="External public identifier exposed via API.",
    )
    timestamp = fields.Datetime(
        string="Timestamp",
        default=fields.Datetime.now,
        required=True,
        readonly=True,
        index=True,
        help="UTC timestamp when the action occurred.",
    )

    # ------------------------------------------------------------------
    # Actor (who performed the action)
    # ------------------------------------------------------------------

    actor_type = fields.Selection(
        selection=ACTOR_TYPE_SELECTION,
        string="Actor type",
        required=True,
        readonly=True,
        index=True,
    )
    actor_id = fields.Integer(
        string="Actor ID",
        readonly=True,
        help="Database ID of the actor (interpretation depends on actor_type).",
    )
    actor_name = fields.Char(
        string="Actor name",
        readonly=True,
        help="Denormalised actor display name, so the log survives "
             "the deletion of the actor record.",
    )

    # ------------------------------------------------------------------
    # Action
    # ------------------------------------------------------------------

    action_code = fields.Char(
        string="Action code",
        required=True,
        readonly=True,
        index=True,
        help="Stable identifier for the action, e.g. 'kyc.validated', "
             "'investment.settled', 'wallet.created'. Use dot-notation: "
             "<domain>.<event>.",
    )

    # ------------------------------------------------------------------
    # Subject (what was acted upon)
    # ------------------------------------------------------------------

    subject_model = fields.Char(
        string="Subject model",
        required=True,
        readonly=True,
        index=True,
        help="Odoo model name (_name) of the affected record, "
             "e.g. 'res.partner', 'solar.holding'.",
    )
    subject_id = fields.Integer(
        string="Subject ID",
        required=True,
        readonly=True,
        index=True,
        help="Database ID of the affected record.",
    )
    subject_uuid = fields.Char(
        string="Subject UUID",
        readonly=True,
        index=True,
        help="External UUID of the affected record (if applicable).",
    )

    # ------------------------------------------------------------------
    # State diff (before / after)
    # ------------------------------------------------------------------

    before_state = fields.Json(
        string="Before state",
        readonly=True,
        help="Snapshot of relevant fields before the action.",
    )
    after_state = fields.Json(
        string="After state",
        readonly=True,
        help="Snapshot of relevant fields after the action.",
    )

    # ------------------------------------------------------------------
    # Request metadata (security / correlation)
    # ------------------------------------------------------------------

    request_ip = fields.Char(
        string="Request IP",
        readonly=True,
        help="IPv4 or IPv6 address of the originating request.",
    )
    request_user_agent = fields.Char(
        string="User-Agent",
        readonly=True,
    )
    request_trace_id = fields.Char(
        string="Trace ID",
        readonly=True,
        index=True,
        help="OpenTelemetry trace ID for cross-service correlation.",
    )

    # ------------------------------------------------------------------
    # External system references
    # ------------------------------------------------------------------

    redis_event_id = fields.Char(
        string="Redis event ID",
        readonly=True,
        index=True,
        help="ID of the associated domain event in Redis Streams.",
    )
    on_chain_tx_hash = fields.Char(
        string="On-chain TX hash",
        readonly=True,
        size=66,
        help="Hash of the blockchain transaction triggered by this action, "
             "if any.",
    )

    # ==================================================================
    # CRUD overrides — enforce append-only semantics
    # ==================================================================

    @api.model_create_multi
    def create(self, vals_list):
        """Direct create is forbidden. Use :meth:`create_audit_entry`.

        We allow create only when called from within create_audit_entry,
        which sets a marker in the context.
        """
        if not self.env.context.get('_solar_audit_internal_create'):
            raise UserError(_(
                "Solar audit log entries cannot be created directly. "
                "Use solar.audit.log.create_audit_entry(...) instead."
            ))
        return super().create(vals_list)

    def write(self, vals):
        """Writes are forbidden on audit log entries. They are immutable."""
        raise UserError(_(
            "Solar audit log entries are immutable. "
            "Writing to existing entries is not permitted."
        ))

    def unlink(self):
        """Deletion is forbidden except via the controlled retention purge.

        The retention purge is triggered by a dedicated scheduled action
        which sets the context key ``audit_retention_purge=True``. Any
        other deletion attempt raises :class:`UserError`.
        """
        if not self.env.context.get(RETENTION_PURGE_CONTEXT_KEY):
            raise UserError(_(
                "Solar audit log entries cannot be deleted. "
                "Retention purge must use a controlled scheduled action."
            ))
        _logger.warning(
            "Retention purge: deleting %d solar.audit.log entries "
            "(triggered by user_id=%s)",
            len(self), self.env.uid,
        )
        return super().unlink()

    # ==================================================================
    # Public API — the only way to create audit entries
    # ==================================================================

    @api.model
    def create_audit_entry(
        self,
        action_code,
        subject,
        before=None,
        after=None,
        actor=None,
        request_metadata=None,
        external_refs=None,
    ):
        """Create a new immutable audit log entry.

        This is the **only** supported way to write to the audit log.

        :param str action_code:
            Stable identifier for the action, dot-notation
            (e.g. ``'kyc.validated'``, ``'investment.settled'``).
        :param subject:
            The Odoo recordset (singleton) that was acted upon. Its model
            name and ID are recorded. If the record has a ``uuid`` field,
            it is also captured.
        :param dict before:
            Optional dict snapshot of fields before the action.
            Stored as JSON.
        :param dict after:
            Optional dict snapshot of fields after the action.
            Stored as JSON.
        :param actor:
            Optional dict ``{'type': str, 'id': int, 'name': str}``
            overriding the calling user. If ``None``, derived from
            ``self.env.user``.
        :param dict request_metadata:
            Optional dict with keys ``ip``, ``user_agent``, ``trace_id``.
        :param dict external_refs:
            Optional dict with keys ``redis_event_id``, ``on_chain_tx_hash``.

        :returns: The newly created ``solar.audit.log`` record.
        :rtype: recordset
        :raises ValidationError: if action_code is empty or the subject is
            not a singleton recordset.
        """
        # Validate action_code
        if not action_code or not isinstance(action_code, str):
            raise ValidationError(_(
                "create_audit_entry: 'action_code' must be a non-empty string."
            ))

        # Validate subject — order matters: type check before length check,
        # so that the error message is meaningful for an empty recordset.
        if not hasattr(subject, '_name') or not hasattr(subject, 'ids'):
            raise ValidationError(_(
                "create_audit_entry: 'subject' must be an Odoo recordset, "
                "got %s instead."
            ) % type(subject).__name__)
        if len(subject) == 0:
            raise ValidationError(_(
                "create_audit_entry: 'subject' is an empty recordset of %s. "
                "A singleton record is required."
            ) % subject._name)
        if len(subject) > 1:
            raise ValidationError(_(
                "create_audit_entry: 'subject' must be a singleton, "
                "got %d records of model %s."
            ) % (len(subject), subject._name))

        # Resolve actor
        if actor is None:
            user = self.env.user
            actor = {
                'type': ACTOR_TYPE_USER,
                'id': user.id,
                'name': user.display_name or user.login,
            }

        # Resolve subject UUID if available
        subject_uuid = False
        if 'uuid' in subject._fields:
            subject_uuid = subject.uuid or False
        elif 'x_uuid' in subject._fields:
            subject_uuid = subject.x_uuid or False

        # Build vals
        request_metadata = request_metadata or {}
        external_refs = external_refs or {}

        vals = {
            'action_code':        action_code,
            'subject_model':      subject._name,
            'subject_id':         subject.id,
            'subject_uuid':       subject_uuid,
            'actor_type':         actor.get('type', ACTOR_TYPE_SYSTEM),
            'actor_id':           actor.get('id'),
            'actor_name':         actor.get('name'),
            'before_state':       before,
            'after_state':        after,
            'request_ip':         request_metadata.get('ip'),
            'request_user_agent': request_metadata.get('user_agent'),
            'request_trace_id':   request_metadata.get('trace_id'),
            'redis_event_id':     external_refs.get('redis_event_id'),
            'on_chain_tx_hash':   external_refs.get('on_chain_tx_hash'),
        }

        # Bypass the create() guard via context marker
        entry = self.with_context(_solar_audit_internal_create=True).create(vals)
        _logger.debug(
            "Audit entry created: action=%s subject=%s/%d uuid=%s",
            action_code, subject._name, subject.id, entry.uuid,
        )
        return entry

    # ==================================================================
    # Read helpers — public reading API
    # ==================================================================

    @api.model
    def search_entries_for_subject(self, subject_model, subject_id, limit=100):
        """Return audit entries for a given subject record.

        :param str subject_model: Odoo model name (e.g. 'res.partner').
        :param int subject_id: Database ID of the subject record.
        :param int limit: Maximum number of entries (default 100).
        :returns: recordset of ``solar.audit.log``.
        """
        return self.search(
            [('subject_model', '=', subject_model),
             ('subject_id', '=', subject_id)],
            limit=limit,
        )

    @api.model
    def search_entries_for_action(self, action_code, limit=100):
        """Return audit entries matching a given action code."""
        return self.search([('action_code', '=', action_code)], limit=limit)
