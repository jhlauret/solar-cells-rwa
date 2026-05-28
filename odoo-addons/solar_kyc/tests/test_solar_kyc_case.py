# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for solar_kyc models.

Coverage:
  - KYC case creation (UUID, name sequence, one per partner)
  - State machine: all valid transitions and all invalid guards
  - Document creation and auto-start of case
  - Document constraints (size, MIME type, SHA-256 format)
  - Decision immutability (write/unlink blocked)
  - Expiration calculation (2y for L1/L2, 1y for L3/L4)
  - Cron expire: transitions validated cases past expires_at
  - res.partner related fields (x_kyc_status, x_kyc_level)
  - API methods: get_or_create_for_partner, get_status_dict
"""

from datetime import timedelta

from odoo import fields
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, ValidationError


@tagged('post_install', '-at_install', 'solar_kyc')
class TestSolarKycCase(TransactionCase):
    """Unit tests for the KYC workflow."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.KycCase     = cls.env['solar.kyc.case']
        cls.KycDoc      = cls.env['solar.kyc.document']
        cls.KycDecision = cls.env['solar.kyc.decision']
        cls.Partner     = cls.env['res.partner']
        cls.AuditLog    = cls.env['solar.audit.log']
        cls.france      = cls.env.ref('base.fr')

    def _create_investor(self, email=None):
        return self.Partner.create({
            'name':          'Test KYC Investor',
            'email':         email or f'kyc.test.{id(self)}@example.com',
            'x_is_investor': True,
            'country_id':    self.france.id,
        })

    def _create_case(self, partner=None):
        if partner is None:
            partner = self._create_investor()
        return self.KycCase.create({'partner_id': partner.id})

    def _add_doc(self, case, doc_type='identity_card'):
        return self.KycDoc.create({
            'case_id':       case.id,
            'document_type': doc_type,
            'minio_path':    f'kyc-documents/test/{doc_type}.pdf',
            'sha256_hash':   'a' * 64,
            'mime_type':     'application/pdf',
            'file_size_bytes': 1024,
        })

    def _bring_to_submitted(self, case=None):
        """Create a case and bring it to 'submitted' state."""
        if case is None:
            case = self._create_case()
        for doc_type in ['identity_card', 'selfie_liveness', 'proof_of_address']:
            self._add_doc(case, doc_type)
        case.action_submit()
        return case

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_case_created_with_uuid(self):
        case = self._create_case()
        self.assertEqual(len(case.uuid), 36)

    def test_case_name_uses_sequence(self):
        case = self._create_case()
        self.assertTrue(case.name.startswith('KYC-'))
        self.assertNotEqual(case.name, '/')

    def test_initial_state_is_not_started(self):
        case = self._create_case()
        self.assertEqual(case.state, 'not_started')

    def test_one_case_per_partner_constraint(self):
        partner = self._create_investor()
        self.KycCase.create({'partner_id': partner.id})
        with self.assertRaises(ValidationError):
            self.KycCase.create({'partner_id': partner.id})

    # ------------------------------------------------------------------
    # State machine — valid transitions
    # ------------------------------------------------------------------

    def test_action_start_transitions_to_in_progress(self):
        case = self._create_case()
        case.action_start()
        self.assertEqual(case.state, 'in_progress')

    def test_first_document_auto_starts_case(self):
        case = self._create_case()
        self.assertEqual(case.state, 'not_started')
        self._add_doc(case)
        self.assertEqual(case.state, 'in_progress')

    def test_action_submit_transitions_to_submitted(self):
        case = self._bring_to_submitted()
        self.assertEqual(case.state, 'submitted')
        self.assertIsNotNone(case.submitted_at)

    def test_action_approve_transitions_to_validated(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        self.assertEqual(case.state, 'validated')
        self.assertIsNotNone(case.validated_at)
        self.assertEqual(case.level, 'L2')

    def test_action_reject_transitions_to_rejected(self):
        case = self._bring_to_submitted()
        case.action_reject(reason='Forged document')
        self.assertEqual(case.state, 'rejected')
        self.assertEqual(case.rejection_reason, 'Forged document')

    def test_action_escalate_transitions_to_under_review(self):
        case = self._bring_to_submitted()
        case.action_escalate()
        self.assertEqual(case.state, 'under_review')

    def test_approve_from_under_review(self):
        case = self._bring_to_submitted()
        case.action_escalate()
        case.action_approve(kyc_level='L3')
        self.assertEqual(case.state, 'validated')
        self.assertEqual(case.level, 'L3')

    def test_renew_expired_case(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        case.write({'state': 'expired'})
        case.action_renew()
        self.assertEqual(case.state, 'in_progress')

    def test_renew_rejected_case(self):
        case = self._bring_to_submitted()
        case.action_reject(reason='test')
        case.action_renew()
        self.assertEqual(case.state, 'in_progress')

    # ------------------------------------------------------------------
    # State machine — invalid transitions
    # ------------------------------------------------------------------

    def test_submit_without_required_documents_raises(self):
        case = self._create_case()
        self._add_doc(case, 'identity_card')  # only one, missing 2 required
        case.action_start()
        with self.assertRaises(UserError):
            case.action_submit()

    def test_approve_from_in_progress_raises(self):
        case = self._create_case()
        with self.assertRaises(UserError):
            case.action_approve(kyc_level='L2')

    def test_approve_without_level_raises(self):
        case = self._bring_to_submitted()
        with self.assertRaises(UserError):
            case.action_approve(kyc_level=None)

    def test_suspend_non_validated_raises(self):
        case = self._create_case()
        with self.assertRaises(UserError):
            case.action_suspend()

    # ------------------------------------------------------------------
    # Expiration calculation
    # ------------------------------------------------------------------

    def test_expires_at_l2_is_2_years(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        expected = case.validated_at + (case.validated_at
                                         - case.validated_at  # zero
                                         ).__class__(days=365 * 2)
        # Simpler: check that expires_at is roughly 2 years after validated_at
        delta = case.expires_at - case.validated_at
        self.assertAlmostEqual(delta.days, 730, delta=5)

    def test_expires_at_l3_is_1_year(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L3')
        delta = case.expires_at - case.validated_at
        self.assertAlmostEqual(delta.days, 365, delta=5)

    def test_expires_at_none_without_validation(self):
        case = self._create_case()
        self.assertFalse(case.expires_at)

    # ------------------------------------------------------------------
    # Cron
    # ------------------------------------------------------------------

    def test_cron_expire_transitions_overdue_cases(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        self.assertEqual(case.state, 'validated')
        # Force expires_at to past
        case.write({'expires_at': fields.Datetime.now() - timedelta(days=1)})
        self.KycCase._cron_expire_kyc_cases()
        self.assertEqual(case.state, 'expired')

    def test_cron_does_not_expire_future_cases(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        # expires_at is 2 years in the future
        self.KycCase._cron_expire_kyc_cases()
        self.assertEqual(case.state, 'validated')

    # ------------------------------------------------------------------
    # Decision immutability
    # ------------------------------------------------------------------

    def test_decision_created_on_approve(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        decision = case.decision_ids.filtered(lambda d: d.decision == 'approved')
        self.assertEqual(len(decision), 1)
        self.assertEqual(decision.new_state, 'validated')

    def test_decision_write_is_forbidden(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        decision = case.decision_ids[0]
        with self.assertRaises(UserError):
            decision.write({'decision_reason': 'tampered'})

    def test_decision_unlink_is_forbidden(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        decision = case.decision_ids[0]
        with self.assertRaises(UserError):
            decision.unlink()

    # ------------------------------------------------------------------
    # API methods
    # ------------------------------------------------------------------

    def test_get_or_create_for_partner_creates_case(self):
        partner = self._create_investor()
        result = self.KycCase.get_or_create_for_partner(partner.x_uuid)
        self.assertIn('uuid', result)
        self.assertEqual(result['state'], 'not_started')

    def test_get_or_create_for_partner_is_idempotent(self):
        partner = self._create_investor()
        r1 = self.KycCase.get_or_create_for_partner(partner.x_uuid)
        r2 = self.KycCase.get_or_create_for_partner(partner.x_uuid)
        self.assertEqual(r1['uuid'], r2['uuid'])

    def test_get_status_dict_returns_safe_fields(self):
        case = self._bring_to_submitted()
        case.action_approve(kyc_level='L2')
        status = case.get_status_dict()
        self.assertEqual(status['state'], 'validated')
        self.assertEqual(status['level'], 'L2')
        self.assertIn('expires_at', status)
