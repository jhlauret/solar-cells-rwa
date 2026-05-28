# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for solar.audit.log.

Coverage targets:
* create_audit_entry() succeeds and stores all fields correctly
* direct create() is blocked
* write() is blocked
* unlink() is blocked without retention context
* unlink() works with retention context
* search helpers return the expected records
* subject UUID is captured when available (via 'uuid' or 'x_uuid' field)
"""

from odoo.exceptions import UserError, ValidationError
from odoo.tests.common import TransactionCase, tagged


@tagged('post_install', '-at_install', 'solar_audit')
class TestSolarAuditLog(TransactionCase):
    """Unit tests for the append-only audit log model."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.AuditLog = cls.env['solar.audit.log']
        # We use res.partner as a generic 'subject' for tests; it always exists.
        cls.test_partner = cls.env['res.partner'].create({
            'name': 'Test Subject',
            'email': 'test.subject@example.com',
        })

    # ------------------------------------------------------------------
    # create_audit_entry — happy path
    # ------------------------------------------------------------------

    def test_create_audit_entry_success(self):
        """create_audit_entry should create a complete log entry."""
        entry = self.AuditLog.create_audit_entry(
            action_code='partner.created',
            subject=self.test_partner,
            before=None,
            after={'name': 'Test Subject', 'email': 'test.subject@example.com'},
        )
        self.assertTrue(entry.exists())
        self.assertEqual(entry.action_code, 'partner.created')
        self.assertEqual(entry.subject_model, 'res.partner')
        self.assertEqual(entry.subject_id, self.test_partner.id)
        self.assertEqual(entry.actor_type, 'user')
        self.assertTrue(entry.actor_id)
        self.assertTrue(entry.actor_name)
        self.assertIsNotNone(entry.timestamp)
        self.assertEqual(len(entry.uuid), 36, "UUID should be 36 characters")

    def test_create_audit_entry_with_full_metadata(self):
        """All optional parameters should be persisted correctly."""
        entry = self.AuditLog.create_audit_entry(
            action_code='kyc.validated',
            subject=self.test_partner,
            before={'state': 'submitted'},
            after={'state': 'validated'},
            actor={
                'type': 'api_client',
                'id': 999,
                'name': 'backend-node',
            },
            request_metadata={
                'ip': '192.168.1.42',
                'user_agent': 'SolarCells-Backend/1.0',
                'trace_id': 'trace-abc-123',
            },
            external_refs={
                'redis_event_id': 'redis-event-xyz',
                'on_chain_tx_hash': '0x' + 'a' * 64,
            },
        )
        self.assertEqual(entry.actor_type, 'api_client')
        self.assertEqual(entry.actor_id, 999)
        self.assertEqual(entry.actor_name, 'backend-node')
        self.assertEqual(entry.request_ip, '192.168.1.42')
        self.assertEqual(entry.request_user_agent, 'SolarCells-Backend/1.0')
        self.assertEqual(entry.request_trace_id, 'trace-abc-123')
        self.assertEqual(entry.redis_event_id, 'redis-event-xyz')
        self.assertEqual(entry.on_chain_tx_hash, '0x' + 'a' * 64)
        self.assertEqual(entry.before_state, {'state': 'submitted'})
        self.assertEqual(entry.after_state, {'state': 'validated'})

    def test_create_audit_entry_default_actor_is_current_user(self):
        """If no actor is given, the env user is used."""
        entry = self.AuditLog.create_audit_entry(
            action_code='partner.viewed',
            subject=self.test_partner,
        )
        self.assertEqual(entry.actor_id, self.env.user.id)
        self.assertEqual(entry.actor_type, 'user')

    def test_create_audit_entry_uuid_is_unique(self):
        """Multiple entries must have distinct UUIDs."""
        entry1 = self.AuditLog.create_audit_entry(
            action_code='test.event',
            subject=self.test_partner,
        )
        entry2 = self.AuditLog.create_audit_entry(
            action_code='test.event',
            subject=self.test_partner,
        )
        self.assertNotEqual(entry1.uuid, entry2.uuid)

    # ------------------------------------------------------------------
    # Validation of inputs
    # ------------------------------------------------------------------

    def test_create_audit_entry_rejects_non_recordset_subject(self):
        """A non-recordset subject raises ValidationError."""
        with self.assertRaises(ValidationError):
            self.AuditLog.create_audit_entry(
                action_code='test.event',
                subject='not-a-recordset',
            )

    def test_create_audit_entry_rejects_multi_subject(self):
        """A multi-record recordset raises ValidationError."""
        partners = self.env['res.partner'].create([
            {'name': 'A'},
            {'name': 'B'},
        ])
        with self.assertRaises(ValidationError):
            self.AuditLog.create_audit_entry(
                action_code='test.event',
                subject=partners,
            )

    def test_create_audit_entry_rejects_empty_subject(self):
        """An empty recordset raises ValidationError."""
        empty = self.env['res.partner']
        with self.assertRaises(ValidationError):
            self.AuditLog.create_audit_entry(
                action_code='test.event',
                subject=empty,
            )

    def test_create_audit_entry_rejects_empty_action_code(self):
        """Empty or None action_code raises ValidationError."""
        with self.assertRaises(ValidationError):
            self.AuditLog.create_audit_entry(
                action_code='',
                subject=self.test_partner,
            )
        with self.assertRaises(ValidationError):
            self.AuditLog.create_audit_entry(
                action_code=None,
                subject=self.test_partner,
            )

    # ------------------------------------------------------------------
    # Append-only — guards on create, write, unlink
    # ------------------------------------------------------------------

    def test_direct_create_is_forbidden(self):
        """Direct .create() must be blocked."""
        with self.assertRaises(UserError):
            self.AuditLog.create({
                'action_code':   'bypass.attempt',
                'subject_model': 'res.partner',
                'subject_id':    self.test_partner.id,
                'actor_type':    'user',
            })

    def test_write_is_forbidden(self):
        """Even minor field updates must be blocked."""
        entry = self.AuditLog.create_audit_entry(
            action_code='test.event',
            subject=self.test_partner,
        )
        with self.assertRaises(UserError):
            entry.write({'action_code': 'mutated.action'})
        with self.assertRaises(UserError):
            entry.write({'request_ip': '10.0.0.1'})

    def test_unlink_without_retention_context_is_forbidden(self):
        """Direct unlink() must be blocked."""
        entry = self.AuditLog.create_audit_entry(
            action_code='test.event',
            subject=self.test_partner,
        )
        with self.assertRaises(UserError):
            entry.unlink()
        self.assertTrue(entry.exists(),
                        "Entry should still exist after blocked unlink")

    def test_unlink_with_retention_context_is_allowed(self):
        """Unlink with the retention purge context must succeed."""
        entry = self.AuditLog.create_audit_entry(
            action_code='test.event',
            subject=self.test_partner,
        )
        entry_id = entry.id
        entry.with_context(audit_retention_purge=True).unlink()
        self.assertFalse(
            self.AuditLog.browse(entry_id).exists(),
            "Entry should be deleted after retention purge",
        )

    # ------------------------------------------------------------------
    # Subject UUID detection
    # ------------------------------------------------------------------

    def test_subject_uuid_captured_when_available(self):
        """If the subject has a 'uuid' or 'x_uuid' field, it must be captured.

        res.partner does not have one by default. We test by creating a
        log on an audit log entry itself (which DOES have 'uuid').
        """
        first_entry = self.AuditLog.create_audit_entry(
            action_code='test.first',
            subject=self.test_partner,
        )
        second_entry = self.AuditLog.create_audit_entry(
            action_code='test.referencing',
            subject=first_entry,
        )
        self.assertEqual(second_entry.subject_uuid, first_entry.uuid)

    def test_subject_uuid_absent_when_no_uuid_field(self):
        """If the subject has no 'uuid' or 'x_uuid' field, subject_uuid is False."""
        entry = self.AuditLog.create_audit_entry(
            action_code='test.event',
            subject=self.test_partner,
        )
        self.assertFalse(entry.subject_uuid)

    # ------------------------------------------------------------------
    # Search helpers
    # ------------------------------------------------------------------

    def test_search_entries_for_subject(self):
        """search_entries_for_subject returns matching entries."""
        partner_b = self.env['res.partner'].create({'name': 'Other'})
        # Create some entries
        self.AuditLog.create_audit_entry(
            action_code='partner.created', subject=self.test_partner)
        self.AuditLog.create_audit_entry(
            action_code='partner.viewed', subject=self.test_partner)
        self.AuditLog.create_audit_entry(
            action_code='partner.created', subject=partner_b)

        entries_a = self.AuditLog.search_entries_for_subject(
            'res.partner', self.test_partner.id)
        entries_b = self.AuditLog.search_entries_for_subject(
            'res.partner', partner_b.id)

        self.assertEqual(len(entries_a), 2)
        self.assertEqual(len(entries_b), 1)
        self.assertTrue(all(e.subject_id == self.test_partner.id for e in entries_a))

    def test_search_entries_for_action(self):
        """search_entries_for_action returns matching entries."""
        self.AuditLog.create_audit_entry(
            action_code='kyc.validated', subject=self.test_partner)
        self.AuditLog.create_audit_entry(
            action_code='kyc.rejected', subject=self.test_partner)
        self.AuditLog.create_audit_entry(
            action_code='kyc.validated', subject=self.test_partner)

        validated = self.AuditLog.search_entries_for_action('kyc.validated')
        rejected = self.AuditLog.search_entries_for_action('kyc.rejected')

        self.assertEqual(len(validated), 2)
        self.assertEqual(len(rejected), 1)

    # ------------------------------------------------------------------
    # Ordering
    # ------------------------------------------------------------------

    def test_default_order_is_most_recent_first(self):
        """search() should return most recent entries first by default."""
        e1 = self.AuditLog.create_audit_entry(
            action_code='test.one', subject=self.test_partner)
        e2 = self.AuditLog.create_audit_entry(
            action_code='test.two', subject=self.test_partner)
        e3 = self.AuditLog.create_audit_entry(
            action_code='test.three', subject=self.test_partner)

        recent_three = self.AuditLog.search(
            [('action_code', 'in', ['test.one', 'test.two', 'test.three'])],
            limit=3,
        )
        # Should be ordered: e3, e2, e1 (newest first)
        self.assertEqual(recent_three[0].id, e3.id)
        self.assertEqual(recent_three[1].id, e2.id)
        self.assertEqual(recent_three[2].id, e1.id)
