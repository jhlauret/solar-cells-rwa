# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""SolarCells extension of res.partner for investor accounts.

Adds investor-specific fields to res.partner while reusing Odoo's built-in
CRM, mail thread, contact management, and accounting features for free.

Design notes
------------
- Fields that depend on addons not yet installed (solar_kyc, solar_wallet,
  solar_holding) are NOT declared here. Each addon adds its own fields via
  ``_inherit`` when it is installed.
- Only the fields that are meaningful before KYC or wallet creation
  are declared in this module.
- Every sensitive write operation emits a solar.audit.log entry.
"""

import logging
import uuid as uuid_lib
from datetime import timedelta

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Selection constants
# ---------------------------------------------------------------------------

INVESTOR_TYPE_SELECTION = [
    ('retail',        'Retail'),
    ('qualified',     'Qualified investor'),
    ('institutional', 'Institutional investor'),
]

ACCOUNT_STATE_SELECTION = [
    ('pending',   'Pending e-mail confirmation'),
    ('active',    'Active'),
    ('suspended', 'Suspended'),
    ('closed',    'Closed'),
]


class ResPartner(models.Model):
    """Extension of res.partner with SolarCells investor fields.

    Inherits from ``res.partner`` so the investor record participates
    in Odoo's built-in address book, mail threads, activities, and
    accounting (receivable accounts, SEPA mandates, etc.).

    Fields added by other addons once they are installed
    ----------------------------------------------------
    solar_kyc:
        x_kyc_case_id, x_kyc_status, x_kyc_level
    solar_wallet:
        x_wallet_ids, x_primary_wallet_id
    solar_holding:
        x_holding_ids, x_total_invested, x_portfolio_value
    solar_investment:
        x_investment_order_ids
    solar_payment:
        x_payment_transaction_ids
    solar_compliance:
        x_aml_alert_ids, x_risk_score, x_pep_status
    """

    _inherit = 'res.partner'

    # ------------------------------------------------------------------
    # External identifier
    # ------------------------------------------------------------------

    x_uuid = fields.Char(
        string="UUID",
        required=False,
        copy=False,
        readonly=True,
        index=True,
        default=lambda self: str(uuid_lib.uuid4()),
        help="Stable external identifier exposed via the JSON-RPC API. "
             "Never returned in combination with the internal Odoo ID.",
    )

    # ------------------------------------------------------------------
    # Investor classification
    # ------------------------------------------------------------------

    x_is_investor = fields.Boolean(
        string="Is investor",
        default=False,
        index=True,
        tracking=True,
        help="True if this partner is a SolarCells investor account. "
             "Use this flag to filter the investor list.",
    )
    x_investor_type = fields.Selection(
        selection=INVESTOR_TYPE_SELECTION,
        string="Investor type",
        tracking=True,
        help="Retail: general public. Qualified: meets financial criteria. "
             "Institutional: funds, banks, etc.",
    )

    # ------------------------------------------------------------------
    # Account lifecycle
    # ------------------------------------------------------------------

    x_account_state = fields.Selection(
        selection=ACCOUNT_STATE_SELECTION,
        string="Account state",
        default='pending',
        index=True,
        tracking=True,
        help="Lifecycle state of the investor account. "
             "Only 'active' accounts can invest or trade.",
    )
    x_account_activated_at = fields.Datetime(
        string="Account activated at",
        copy=False,
        readonly=True,
    )
    x_account_suspended_at = fields.Datetime(
        string="Account suspended at",
        copy=False,
        readonly=True,
    )
    x_account_closed_at = fields.Datetime(
        string="Account closed at",
        copy=False,
        readonly=True,
    )
    x_suspension_reason = fields.Text(
        string="Suspension reason",
        copy=False,
    )

    # ------------------------------------------------------------------
    # Personal identity (for KYC — stored here so it survives KYC addon)
    # ------------------------------------------------------------------

    x_date_of_birth = fields.Date(
        string="Date of birth",
        tracking=True,
        help="Used for KYC age verification and tax reporting.",
    )
    x_nationality_id = fields.Many2one(
        'res.country',
        string="Nationality",
        tracking=True,
    )
    x_phone_validated = fields.Boolean(
        string="Phone validated (OTP)",
        default=False,
        tracking=True,
        help="True once the investor has confirmed their phone via OTP.",
    )

    # ------------------------------------------------------------------
    # Banking — for yield payouts and SEPA direct debit
    # ------------------------------------------------------------------

    # Hash du mot de passe investisseur (argon2id, jamais en clair)
    # ── Email verification OTP ────────────────────────────────────────────────
    x_email_verified    = fields.Boolean(
        string="Email verified",
        default=False,
        help="True once the investor has confirmed their email address.",
    )
    x_email_otp_hash    = fields.Char(
        string="Email OTP hash",
        copy=False,
        groups="solar_core.group_api",
        help="SHA-256 hash of the current 6-digit OTP (never stored in plain text).",
    )
    x_email_otp_expires = fields.Datetime(
        string="Email OTP expires at",
        copy=False,
        groups="solar_core.group_api",
    )
    x_email_otp_attempts = fields.Integer(
        string="OTP failed attempts",
        default=0,
        copy=False,
        help="Brute-force counter — account locked after 5 consecutive failures.",
    )

    x_password_hash = fields.Char(
        string="Password hash",
        copy=False,
        groups="solar_core.group_api",
        help="argon2id hash du mot de passe. Jamais exposé au frontend.",
    )

    x_iban = fields.Char(
        string="IBAN",
        copy=False,
        tracking=True,
        help="Validated IBAN for yield payouts and withdrawals.",
    )
    x_iban_validated_at = fields.Datetime(
        string="IBAN validated at",
        copy=False,
        readonly=True,
    )
    x_iban_validated_by = fields.Many2one(
        'res.users',
        string="IBAN validated by",
        copy=False,
        readonly=True,
    )

    # ------------------------------------------------------------------
    # CGP / delegation
    # ------------------------------------------------------------------

    x_cgp_id = fields.Many2one(
        'res.partner',
        string="Wealth advisor (CGP)",
        domain="[('is_company', '=', False), ('x_is_investor', '=', False)]",
        help="Wealth advisor (Conseiller en Gestion de Patrimoine) acting "
             "on behalf of this investor.",
        tracking=True,
    )
    x_managed_partner_ids = fields.One2many(
        'res.partner',
        'x_cgp_id',
        string="Managed investors",
        help="Investors managed by this CGP.",
    )

    # ------------------------------------------------------------------
    # Consent & marketing
    # ------------------------------------------------------------------

    x_terms_accepted_at = fields.Datetime(
        string="Terms accepted at",
        copy=False,
        readonly=True,
        help="Datetime when the investor accepted the CGU and Privacy Policy.",
    )
    x_terms_version = fields.Char(
        string="Terms version",
        copy=False,
        readonly=True,
        help="Version of the Terms accepted (e.g. '2025-01').",
    )
    x_marketing_optin = fields.Boolean(
        string="Marketing opt-in",
        default=False,
        tracking=True,
        help="True if the investor consented to receive marketing communications.",
    )

    # ==================================================================
    # Constraints
    # ==================================================================

    @api.constrains('x_uuid')
    def _check_uuid_unique(self):
        """UUID must be unique across all partners."""
        for rec in self:
            if not rec.x_uuid:
                continue
            if self.search_count([('x_uuid', '=', rec.x_uuid), ('id', '!=', rec.id)]) > 0:
                raise ValidationError(_(
                    "UUID '%s' already exists on another partner record."
                ) % rec.x_uuid)

    @api.constrains('x_iban')
    def _check_iban_format(self):
        """Basic IBAN format check (2 uppercase letters + alphanumeric, 10–34 chars)."""
        import re
        iban_re = re.compile(r'^[A-Z]{2}[A-Z0-9]{8,32}$')
        for rec in self:
            if rec.x_iban:
                clean = rec.x_iban.replace(' ', '').upper()
                if not iban_re.match(clean):
                    raise ValidationError(_(
                        "IBAN '%s' does not appear to be valid. "
                        "Expected format: 2 uppercase letters followed by digits (e.g. FR76...)."
                    ) % rec.x_iban)

    @api.constrains('x_date_of_birth')
    def _check_minimum_age(self):
        """Investor must be at least 18 years old."""
        from datetime import date
        for rec in self:
            if rec.x_date_of_birth and rec.x_is_investor:
                today = date.today()
                dob = rec.x_date_of_birth
                age = today.year - dob.year - (
                    (today.month, today.day) < (dob.month, dob.day)
                )
                if age < 18:
                    raise ValidationError(_(
                        "Investors must be at least 18 years old. "
                        "Date of birth: %s (age: %d)."
                    ) % (dob, age))

    # ==================================================================
    # Onchange helpers
    # ==================================================================

    @api.onchange('x_iban')
    def _onchange_iban_normalize(self):
        """Normalize IBAN: remove spaces, uppercase."""
        if self.x_iban:
            self.x_iban = self.x_iban.replace(' ', '').upper()

    # ==================================================================
    # CRUD — ensure UUID and audit on create
    # ==================================================================

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('x_uuid'):
                vals['x_uuid'] = str(uuid_lib.uuid4())
        records = super().create(vals_list)
        for rec in records:
            if rec.x_is_investor:
                self.env['solar.audit.log'].create_audit_entry(
                    action_code='investor.account.created',
                    subject=rec,
                    after={
                        'name':             rec.name,
                        'email':            rec.email,
                        'x_investor_type':  rec.x_investor_type,
                        'x_account_state':  rec.x_account_state,
                    },
                )
        return records

    # ==================================================================
    # Business actions — account lifecycle
    # ==================================================================

    def action_activate_account(self):
        """pending → active.

        Called after the investor confirms their e-mail address via OTP.
        Emits an audit log entry.

        :raises UserError: if the account is not in 'pending' state.
        """
        self.ensure_one()
        if self.x_account_state != 'pending':
            raise UserError(_(
                "Account '%s' is in state '%s' and cannot be activated. "
                "Only 'pending' accounts can be activated."
            ) % (self.name, self.x_account_state))

        before_state = self.x_account_state
        self.write({
            'x_account_state':        'active',
            'x_account_activated_at': fields.Datetime.now(),
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investor.account.activated',
            subject=self,
            before={'x_account_state': before_state},
            after={'x_account_state': 'active'},
        )
        _logger.info("Partner %s (UUID: %s) activated as investor.", self.name, self.x_uuid)
        return True

    def action_suspend(self, reason=None):
        """active → suspended.

        Called by a compliance officer when suspicious activity is detected.
        Freezes the account: no investment, no trade, no withdrawal.

        :param str reason: Human-readable reason for the suspension.
        :raises UserError: if the account is not active.
        """
        self.ensure_one()
        if self.x_account_state != 'active':
            raise UserError(_(
                "Account '%s' is in state '%s'. Only 'active' accounts can be suspended."
            ) % (self.name, self.x_account_state))

        before_state = self.x_account_state
        self.write({
            'x_account_state':        'suspended',
            'x_account_suspended_at': fields.Datetime.now(),
            'x_suspension_reason':    reason or _("No reason provided."),
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investor.account.suspended',
            subject=self,
            before={'x_account_state': before_state},
            after={
                'x_account_state':     'suspended',
                'x_suspension_reason': reason,
            },
        )
        _logger.warning(
            "Partner %s (UUID: %s) suspended. Reason: %s",
            self.name, self.x_uuid, reason,
        )
        return True

    def action_reactivate(self):
        """suspended → active.

        :raises UserError: if the account is not suspended.
        """
        self.ensure_one()
        if self.x_account_state != 'suspended':
            raise UserError(_(
                "Account '%s' is in state '%s'. Only 'suspended' accounts can be reactivated."
            ) % (self.name, self.x_account_state))

        before_state = self.x_account_state
        self.write({
            'x_account_state':     'active',
            'x_suspension_reason': False,
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investor.account.reactivated',
            subject=self,
            before={'x_account_state': before_state},
            after={'x_account_state': 'active'},
        )
        return True

    def action_close_account(self):
        """any → closed.

        Initiates account closure. Sets x_account_state to 'closed'.
        The GDPR anonymisation is handled by a scheduled action
        (Cron: GDPR retention cleanup) that runs after the applicable
        retention period (see docs/odoo-mdd.md §15.4).

        :raises UserError: if account is already closed.
        """
        self.ensure_one()
        if self.x_account_state == 'closed':
            raise UserError(_(
                "Account '%s' is already closed."
            ) % self.name)

        before_state = self.x_account_state
        self.write({
            'x_account_state':    'closed',
            'x_account_closed_at': fields.Datetime.now(),
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investor.account.closed',
            subject=self,
            before={'x_account_state': before_state},
            after={'x_account_state': 'closed'},
        )
        _logger.info(
            "Partner %s (UUID: %s) account closed.", self.name, self.x_uuid,
        )
        return True

    def action_validate_iban(self, validated_by_user_id=None):
        """Mark the IBAN as validated (by a compliance officer or by Bridge).

        :param int validated_by_user_id: ID of the user who validated the IBAN.
                                         Defaults to the current user.
        """
        self.ensure_one()
        if not self.x_iban:
            raise UserError(_(
                "Cannot validate IBAN: no IBAN is set on account '%s'."
            ) % self.name)

        validator_id = validated_by_user_id or self.env.uid
        self.write({
            'x_iban_validated_at': fields.Datetime.now(),
            'x_iban_validated_by': validator_id,
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investor.iban.validated',
            subject=self,
            after={
                'x_iban':             self.x_iban,
                'x_iban_validated_at': str(self.x_iban_validated_at),
            },
        )
        return True

    def action_record_terms_acceptance(self, version=None):
        """Record that the investor has accepted the CGU.

        :param str version: Version string (e.g. '2025-01'). If None, uses today.
        """
        self.ensure_one()
        from datetime import date
        accepted_version = version or date.today().strftime('%Y-%m')
        self.write({
            'x_terms_accepted_at': fields.Datetime.now(),
            'x_terms_version':     accepted_version,
        })
        self.env['solar.audit.log'].create_audit_entry(
            action_code='investor.terms.accepted',
            subject=self,
            after={
                'x_terms_version':    accepted_version,
                'x_terms_accepted_at': str(self.x_terms_accepted_at),
            },
        )
        return True

    # ==================================================================
    # JSON-RPC API methods (called by backend Node.js via JSON-RPC)
    # ==================================================================

    @api.model
    def register_investor(self, name, email, password_hash, country_id,
                          investor_type='retail', terms_version=None):
        """Create a new investor account (called from the registration endpoint).

        :param str name:           Full name.
        :param str email:          Email address (must be unique).
        :param str password_hash:  Argon2 hash of the password (stored on res.users).
        :param int country_id:     Odoo country ID.
        :param str investor_type:  'retail', 'qualified', or 'institutional'.
        :param str terms_version:  Version of terms accepted.
        :returns: dict with ``uuid`` and ``partner_id``.
        :raises ValidationError:   if email is already registered.
        """
        # Check for duplicate email
        if self.search([('email', '=', email)], limit=1):
            raise ValidationError(_(
                "An account already exists for email '%s'."
            ) % email)

        partner = self.create({
            'name':             name,
            'email':            email,
            'country_id':       country_id,
            'x_is_investor':    True,
            'x_investor_type':  investor_type,
            'x_account_state':  'pending',
            'x_password_hash':  password_hash,   # argon2id hash, jamais en clair
        })

        from datetime import date
        partner.write({
            'x_terms_accepted_at': fields.Datetime.now(),
            'x_terms_version':     terms_version or date.today().strftime('%Y-%m'),
        })

        _logger.info(
            "New investor registered: %s <%s> (UUID: %s)",
            name, email, partner.x_uuid,
        )
        return {'uuid': partner.x_uuid, 'partner_id': partner.id}

    @api.model
    def send_verification_email(self, partner_uuid):
        """Generate a 6-digit OTP and send a verification email.

        Can be called at registration and for resend requests.
        Rate-limited: max 1 send per minute per account.

        :param str partner_uuid: Investor UUID.
        :returns: dict with ``expires_at`` (ISO string).
        """
        import hashlib
        import random
        import string

        partner = self.search([('x_uuid', '=', partner_uuid)], limit=1)
        if not partner:
            raise UserError(_("Partner not found for UUID '%s'.") % partner_uuid)

        if partner.x_email_verified:
            raise UserError(_("Email '%s' is already verified.") % partner.email)

        # Rate limit : pas plus d'un envoi par minute
        if partner.x_email_otp_expires:
            remaining = (
                partner.x_email_otp_expires - fields.Datetime.now()
            ).total_seconds()
            # Si OTP encore valide depuis moins de 14 minutes (envoyé il y a < 1 min)
            if remaining > 14 * 60:
                raise UserError(_(
                    "A verification code was sent less than a minute ago. "
                    "Please wait before requesting a new one."
                ))

        # Générer OTP 6 chiffres
        otp       = ''.join(random.choices(string.digits, k=6))
        otp_hash  = hashlib.sha256(otp.encode()).hexdigest()
        expires   = fields.Datetime.now() + timedelta(minutes=15)

        partner.write({
            'x_email_otp_hash':     otp_hash,
            'x_email_otp_expires':  expires,
            'x_email_otp_attempts': 0,
        })

        # Envoyer l'email via le système mail Odoo
        self.env['mail.mail'].create({
            'subject':      _("Vérifiez votre adresse email — SolarCells"),
            'email_to':     partner.email,
            'body_html':    f"""
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h2 style="color: #1a1a2e; margin-bottom: 8px;">Confirmez votre email</h2>
                  <p style="color: #4a4a6a; margin-bottom: 24px;">
                    Utilisez le code ci-dessous pour activer votre compte SolarCells.
                    Il expire dans <strong>15 minutes</strong>.
                  </p>
                  <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">{otp}</span>
                  </div>
                  <p style="color: #9a9ab0; font-size: 12px;">
                    Si vous n'avez pas créé de compte SolarCells, ignorez cet email.
                  </p>
                </div>
            """,
            'auto_delete': True,
        }).send()

        _logger.info("[Email OTP] Sent to %s (expires %s)", partner.email, expires)

        self.env['solar.audit.log'].create_audit_entry(
            action_code='auth.email_otp.sent',
            subject=partner,
            after={'email': partner.email, 'expires_at': str(expires)},
        )

        return {'expires_at': expires.isoformat()}

    @api.model
    def verify_email_otp(self, partner_uuid, otp):
        """Verify the OTP and activate the investor account.

        :param str partner_uuid: Investor UUID.
        :param str otp:          6-digit code entered by the user.
        :returns: dict with ``activated: True``.
        :raises UserError: on invalid/expired OTP or too many attempts.
        """
        import hashlib

        partner = self.search([('x_uuid', '=', partner_uuid)], limit=1)
        if not partner:
            raise UserError(_("Partner not found."))

        if partner.x_email_verified:
            return {'activated': True, 'already_verified': True}

        # Brute-force guard
        if partner.x_email_otp_attempts >= 5:
            raise UserError(_(
                "Too many incorrect attempts. Please request a new verification code."
            ))

        # Expiration
        if not partner.x_email_otp_expires or \
                fields.Datetime.now() > partner.x_email_otp_expires:
            raise UserError(_("The verification code has expired. Please request a new one."))

        # Vérification hash
        otp_hash = hashlib.sha256(otp.strip().encode()).hexdigest()
        if otp_hash != partner.x_email_otp_hash:
            partner.write({
                'x_email_otp_attempts': partner.x_email_otp_attempts + 1,
            })
            remaining = 5 - (partner.x_email_otp_attempts)
            raise UserError(_(
                "Incorrect code. %d attempt(s) remaining."
            ) % max(0, remaining))

        # OTP correct — activer le compte
        partner.write({
            'x_email_verified':     True,
            'x_email_otp_hash':     False,
            'x_email_otp_expires':  False,
            'x_email_otp_attempts': 0,
        })
        partner.action_activate_account()

        self.env['solar.audit.log'].create_audit_entry(
            action_code='auth.email.verified',
            subject=partner,
            after={'email': partner.email},
        )

        _logger.info("[Email OTP] Verified and account activated: %s", partner.x_uuid)
        return {'activated': True}

    @api.model
    def get_investor_by_uuid(self, uuid):
        """Return the investor record for the given UUID.

        :raises UserError: if no partner found.
        """
        partner = self.search([('x_uuid', '=', uuid)], limit=1)
        if not partner:
            raise UserError(_("No investor found for UUID '%s'.") % uuid)
        return partner

    def get_public_profile(self):
        """Return a safe dict of investor fields for the frontend.

        Does NOT include PII fields that should not travel over the API
        (date_of_birth, IBAN full number, etc.).
        """
        self.ensure_one()
        return {
            'uuid':            self.x_uuid,
            'name':            self.name,
            'email':           self.email,
            'investor_type':   self.x_investor_type,
            'account_state':   self.x_account_state,
            'phone_validated': self.x_phone_validated,
            'iban_validated':  bool(self.x_iban_validated_at),
            'marketing_optin': self.x_marketing_optin,
            'terms_accepted':  bool(self.x_terms_accepted_at),
        }
