# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for the solar_core res.partner extension.

Coverage:
  - UUID auto-generation on create
  - UUID uniqueness constraint
  - Investor flag and type
  - Account state machine (activate, suspend, reactivate, close)
  - IBAN normalisation and format constraint
  - Minimum age constraint
  - Terms acceptance recording
  - IBAN validation workflow
  - Audit log entries emitted for every sensitive action
  - register_investor() API method
  - get_public_profile() API method
"""

from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, ValidationError


@tagged('post_install', '-at_install', 'solar_core')
class TestResPartnerSolarCore(TransactionCase):
    """Unit tests for the SolarCells extension of res.partner."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Partner = cls.env['res.partner']
        cls.AuditLog = cls.env['solar.audit.log']
        cls.france = cls.env.ref('base.fr')

    def _create_investor(self, **kwargs):
        """Helper: create a basic investor partner."""
        defaults = {
            'name':            'Test Investor',
            'email':           f'test.{id(kwargs)}@example.com',
            'x_is_investor':   True,
            'x_investor_type': 'retail',
            'x_account_state': 'pending',
            'country_id':       self.france.id,
        }
        defaults.update(kwargs)
        return self.Partner.create(defaults)

    # ------------------------------------------------------------------
    # UUID
    # ------------------------------------------------------------------

    def test_uuid_auto_generated_on_create(self):
        """A UUID must be set automatically when creating a partner."""
        partner = self._create_investor()
        self.assertTrue(partner.x_uuid, "x_uuid should be set automatically")
        self.assertEqual(len(partner.x_uuid), 36, "UUID should be 36 characters (standard UUID4)")

    def test_uuid_uniqueness_constraint(self):
        """Two partners cannot share the same UUID."""
        p1 = self._create_investor(email='p1@example.com')
        with self.assertRaises(ValidationError):
            self._create_investor(email='p2@example.com', x_uuid=p1.x_uuid)

    def test_uuid_not_overwritten_if_provided(self):
        """A manually provided UUID is preserved."""
        custom_uuid = '12345678-1234-1234-1234-123456789012'
        partner = self._create_investor(x_uuid=custom_uuid, email='uuid@example.com')
        self.assertEqual(partner.x_uuid, custom_uuid)

    # ------------------------------------------------------------------
    # Investor fields
    # ------------------------------------------------------------------

    def test_investor_type_retail(self):
        partner = self._create_investor(x_investor_type='retail')
        self.assertEqual(partner.x_investor_type, 'retail')

    def test_investor_type_qualified(self):
        partner = self._create_investor(x_investor_type='qualified')
        self.assertEqual(partner.x_investor_type, 'qualified')

    def test_investor_type_institutional(self):
        partner = self._create_investor(x_investor_type='institutional')
        self.assertEqual(partner.x_investor_type, 'institutional')

    def test_is_investor_default_false_on_non_investor(self):
        """Non-investor partners should have x_is_investor = False by default."""
        partner = self.Partner.create({'name': 'Regular Contact'})
        self.assertFalse(partner.x_is_investor)

    # ------------------------------------------------------------------
    # Account state machine
    # ------------------------------------------------------------------

    def test_activate_account_from_pending(self):
        """Activating a pending account should set state to active."""
        partner = self._create_investor()
        self.assertEqual(partner.x_account_state, 'pending')
        partner.action_activate_account()
        self.assertEqual(partner.x_account_state, 'active')
        self.assertIsNotNone(partner.x_account_activated_at)

    def test_activate_account_non_pending_raises(self):
        """Activating a non-pending account must raise UserError."""
        partner = self._create_investor(x_account_state='active')
        with self.assertRaises(UserError):
            partner.action_activate_account()

    def test_suspend_active_account(self):
        """Suspending an active account should set state to suspended."""
        partner = self._create_investor(x_account_state='active')
        partner.action_suspend(reason='Suspicious activity')
        self.assertEqual(partner.x_account_state, 'suspended')
        self.assertEqual(partner.x_suspension_reason, 'Suspicious activity')
        self.assertIsNotNone(partner.x_account_suspended_at)

    def test_suspend_non_active_raises(self):
        """Suspending a non-active account must raise UserError."""
        partner = self._create_investor(x_account_state='pending')
        with self.assertRaises(UserError):
            partner.action_suspend()

    def test_reactivate_suspended_account(self):
        """Reactivating a suspended account should set state to active."""
        partner = self._create_investor(x_account_state='suspended')
        partner.action_reactivate()
        self.assertEqual(partner.x_account_state, 'active')
        self.assertFalse(partner.x_suspension_reason)

    def test_reactivate_non_suspended_raises(self):
        """Reactivating a non-suspended account must raise UserError."""
        partner = self._create_investor(x_account_state='active')
        with self.assertRaises(UserError):
            partner.action_reactivate()

    def test_close_account(self):
        """Closing an active account should set state to closed."""
        partner = self._create_investor(x_account_state='active')
        partner.action_close_account()
        self.assertEqual(partner.x_account_state, 'closed')
        self.assertIsNotNone(partner.x_account_closed_at)

    def test_close_already_closed_raises(self):
        """Closing an already-closed account must raise UserError."""
        partner = self._create_investor(x_account_state='closed')
        with self.assertRaises(UserError):
            partner.action_close_account()

    # ------------------------------------------------------------------
    # IBAN
    # ------------------------------------------------------------------

    def test_iban_normalised_on_onchange(self):
        """Spaces and lowercase in IBAN should be normalised."""
        partner = self._create_investor()
        partner.x_iban = 'fr76 3000 6000 01'
        partner._onchange_iban_normalize()
        self.assertEqual(partner.x_iban, 'FR7630006000 01'.replace(' ', ''))

    def test_iban_invalid_format_raises(self):
        """An IBAN with invalid format must raise ValidationError."""
        with self.assertRaises(ValidationError):
            self._create_investor(x_iban='INVALID_IBAN', email='iban@example.com')

    def test_iban_validate_action(self):
        """Validating an IBAN should set x_iban_validated_at."""
        partner = self._create_investor(
            x_iban='FR7630006000012345678901189',
            email='ibanval@example.com',
        )
        partner.action_validate_iban()
        self.assertIsNotNone(partner.x_iban_validated_at)

    def test_validate_iban_without_iban_raises(self):
        """Validating IBAN when no IBAN is set must raise UserError."""
        partner = self._create_investor()
        with self.assertRaises(UserError):
            partner.action_validate_iban()

    # ------------------------------------------------------------------
    # Minimum age
    # ------------------------------------------------------------------

    def test_minimum_age_constraint(self):
        """Investors must be at least 18. A date of birth < 18 years ago raises."""
        from datetime import date
        minor_dob = date.today().replace(year=date.today().year - 17)
        with self.assertRaises(ValidationError):
            self._create_investor(
                x_date_of_birth=minor_dob,
                email='minor@example.com',
            )

    # ------------------------------------------------------------------
    # Terms acceptance
    # ------------------------------------------------------------------

    def test_record_terms_acceptance(self):
        """Recording terms acceptance should set x_terms_accepted_at."""
        partner = self._create_investor()
        partner.action_record_terms_acceptance(version='2025-01')
        self.assertIsNotNone(partner.x_terms_accepted_at)
        self.assertEqual(partner.x_terms_version, '2025-01')

    # ------------------------------------------------------------------
    # Audit log
    # ------------------------------------------------------------------

    def test_audit_log_on_investor_create(self):
        """Creating an investor should emit a solar.audit.log entry."""
        before_count = self.AuditLog.search_count([
            ('action_code', '=', 'investor.account.created'),
        ])
        self._create_investor(email='audit@example.com')
        after_count = self.AuditLog.search_count([
            ('action_code', '=', 'investor.account.created'),
        ])
        self.assertGreater(after_count, before_count,
                           "An audit entry should be created when an investor is registered")

    def test_audit_log_on_activate(self):
        """Activating an account should emit a solar.audit.log entry."""
        partner = self._create_investor(email='activateaudit@example.com')
        before_count = self.AuditLog.search_count([
            ('action_code', '=', 'investor.account.activated'),
        ])
        partner.action_activate_account()
        after_count = self.AuditLog.search_count([
            ('action_code', '=', 'investor.account.activated'),
        ])
        self.assertGreater(after_count, before_count)

    # ------------------------------------------------------------------
    # register_investor() API
    # ------------------------------------------------------------------

    def test_register_investor_creates_partner(self):
        """register_investor() should create a partner and return uuid."""
        result = self.Partner.register_investor(
            name='Alice Dupont',
            email='alice.dupont@example.com',
            password_hash='$argon2id$...',
            country_id=self.france.id,
        )
        self.assertIn('uuid', result)
        self.assertIn('partner_id', result)
        partner = self.Partner.browse(result['partner_id'])
        self.assertTrue(partner.x_is_investor)
        self.assertEqual(partner.x_account_state, 'pending')

    def test_register_investor_duplicate_email_raises(self):
        """Registering with a duplicate email must raise ValidationError."""
        self.Partner.register_investor(
            name='Bob Martin',
            email='bob.martin@example.com',
            password_hash='hash',
            country_id=self.france.id,
        )
        with self.assertRaises(ValidationError):
            self.Partner.register_investor(
                name='Bob Martin 2',
                email='bob.martin@example.com',
                password_hash='hash',
                country_id=self.france.id,
            )

    # ------------------------------------------------------------------
    # get_public_profile()
    # ------------------------------------------------------------------

    def test_get_public_profile_returns_safe_fields(self):
        """get_public_profile() must not leak PII fields."""
        partner = self._create_investor(email='profile@example.com')
        profile = partner.get_public_profile()
        self.assertIn('uuid', profile)
        self.assertIn('account_state', profile)
        # Sensitive fields must NOT appear
        self.assertNotIn('x_date_of_birth', profile)
        self.assertNotIn('x_iban', profile)
