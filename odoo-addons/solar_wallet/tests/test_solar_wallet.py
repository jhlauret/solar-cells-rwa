# -*- coding: utf-8 -*-
# Part of SolarCells RWA. See LICENSE file for full copyright and licensing details.

"""Tests for solar.wallet.

Coverage:
  - Wallet creation (UUID, defaults)
  - Address format constraint (Ethereum-style)
  - Address uniqueness constraint
  - MVP constraint Q-WAL-01: only 1 active wallet per partner
  - State machine: all valid transitions and guards
  - Auto-set primary wallet on activation
  - Clear primary wallet on close
  - action_whitelist_on_chain (with and without address)
  - Cron: verify whitelist consistency
  - JSON-RPC: create_wallet_for_partner (with KYC guard)
  - JSON-RPC: get_wallet_info
"""

from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError, ValidationError


@tagged('post_install', '-at_install', 'solar_wallet')
class TestSolarWallet(TransactionCase):
    """Unit tests for solar.wallet."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Wallet  = cls.env['solar.wallet']
        cls.Partner = cls.env['res.partner']
        cls.KycCase = cls.env['solar.kyc.case']
        cls.KycDoc  = cls.env['solar.kyc.document']
        cls.france  = cls.env.ref('base.fr')

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_validated_partner(self, email=None):
        """Create an investor with a validated KYC case."""
        partner = self.Partner.create({
            'name':          'Wallet Test Partner',
            'email':         email or f'wallet.{id(self)}@example.com',
            'x_is_investor': True,
            'country_id':    self.france.id,
        })
        # Create and validate KYC
        case = self.KycCase.create({'partner_id': partner.id})
        for doc_type in ['identity_card', 'selfie_liveness', 'proof_of_address']:
            self.KycDoc.create({
                'case_id':        case.id,
                'document_type':  doc_type,
                'minio_path':     f'kyc-documents/{doc_type}.pdf',
                'sha256_hash':    'b' * 64,
                'mime_type':      'application/pdf',
                'file_size_bytes': 1024,
            })
        case.action_submit()
        case.action_approve(kyc_level='L2')
        partner.write({'x_kyc_case_id': case.id})
        return partner

    def _create_wallet(self, partner=None, address=None, state='pending'):
        if partner is None:
            partner = self._create_validated_partner()
        vals = {
            'partner_id':       partner.id,
            'provider_vault_id': f'vault-{id(self)}',
        }
        if address:
            vals['address'] = address
        wallet = self.Wallet.create(vals)
        if state == 'active':
            wallet.write({'address': '0x' + 'a' * 40})
            wallet.action_activate()
        return wallet

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_wallet_uuid_generated(self):
        wallet = self._create_wallet()
        self.assertEqual(len(wallet.uuid), 36)

    def test_wallet_default_state_pending(self):
        wallet = self._create_wallet()
        self.assertEqual(wallet.state, 'pending')

    def test_wallet_default_type_custodial(self):
        wallet = self._create_wallet()
        self.assertEqual(wallet.wallet_type, 'custodial')

    # ------------------------------------------------------------------
    # Constraints
    # ------------------------------------------------------------------

    def test_invalid_address_raises(self):
        partner = self._create_validated_partner()
        with self.assertRaises(ValidationError):
            self.Wallet.create({
                'partner_id':        partner.id,
                'provider_vault_id': 'vault-bad',
                'address':           'not-an-address',
            })

    def test_valid_eth_address_accepted(self):
        wallet = self._create_wallet(address='0x' + 'a' * 40)
        self.assertEqual(wallet.address, '0x' + 'a' * 40)

    def test_duplicate_address_raises(self):
        addr = '0x' + 'c' * 40
        p1 = self._create_validated_partner(email='dup1@example.com')
        p2 = self._create_validated_partner(email='dup2@example.com')
        self.Wallet.create({
            'partner_id': p1.id, 'provider_vault_id': 'v1', 'address': addr,
        })
        with self.assertRaises(ValidationError):
            self.Wallet.create({
                'partner_id': p2.id, 'provider_vault_id': 'v2', 'address': addr,
            })

    def test_q_wal_01_one_active_wallet_per_partner(self):
        """MVP constraint: only 1 active wallet per partner."""
        partner = self._create_validated_partner()
        w1 = self._create_wallet(partner, address='0x' + 'd' * 40)
        w1.action_activate()
        w2 = self.Wallet.create({
            'partner_id': partner.id,
            'provider_vault_id': 'v-second',
            'address': '0x' + 'e' * 40,
        })
        with self.assertRaises(ValidationError):
            w2.action_activate()

    # ------------------------------------------------------------------
    # State machine — valid transitions
    # ------------------------------------------------------------------

    def test_activate_from_pending(self):
        wallet = self._create_wallet()
        wallet.write({'address': '0x' + 'f' * 40})
        wallet.action_activate()
        self.assertEqual(wallet.state, 'active')
        self.assertIsNotNone(wallet.activated_at)

    def test_mark_failed_from_pending(self):
        wallet = self._create_wallet()
        wallet.action_mark_failed(reason='Provider timeout')
        self.assertEqual(wallet.state, 'failed')
        self.assertEqual(wallet.failure_reason, 'Provider timeout')

    def test_freeze_active_wallet(self):
        wallet = self._create_wallet(state='active')
        wallet.action_freeze(reason='AML alert #42')
        self.assertEqual(wallet.state, 'frozen')
        self.assertIsNotNone(wallet.frozen_at)
        self.assertEqual(wallet.freeze_reason, 'AML alert #42')

    def test_unfreeze_wallet(self):
        wallet = self._create_wallet(state='active')
        wallet.action_freeze(reason='test')
        wallet.action_unfreeze()
        self.assertEqual(wallet.state, 'active')
        self.assertFalse(wallet.freeze_reason)

    def test_close_active_wallet(self):
        wallet = self._create_wallet(state='active')
        wallet.action_close()
        self.assertEqual(wallet.state, 'closed')
        self.assertIsNotNone(wallet.closed_at)

    def test_close_frozen_wallet(self):
        wallet = self._create_wallet(state='active')
        wallet.action_freeze(reason='compliance')
        wallet.action_close()
        self.assertEqual(wallet.state, 'closed')

    # ------------------------------------------------------------------
    # State machine — invalid transitions
    # ------------------------------------------------------------------

    def test_activate_non_pending_raises(self):
        wallet = self._create_wallet(state='active')
        with self.assertRaises(UserError):
            wallet.action_activate()

    def test_freeze_non_active_raises(self):
        wallet = self._create_wallet()  # pending
        with self.assertRaises(UserError):
            wallet.action_freeze()

    def test_unfreeze_non_frozen_raises(self):
        wallet = self._create_wallet(state='active')
        with self.assertRaises(UserError):
            wallet.action_unfreeze()

    # ------------------------------------------------------------------
    # Primary wallet management
    # ------------------------------------------------------------------

    def test_first_activated_wallet_becomes_primary(self):
        partner = self._create_validated_partner()
        wallet = self._create_wallet(partner, address='0x' + '1' * 40)
        wallet.action_activate()
        self.assertEqual(partner.x_primary_wallet_id.id, wallet.id)

    def test_closing_primary_wallet_clears_primary(self):
        partner = self._create_validated_partner()
        wallet = self._create_wallet(partner, address='0x' + '2' * 40)
        wallet.action_activate()
        self.assertEqual(partner.x_primary_wallet_id.id, wallet.id)
        wallet.action_close()
        self.assertFalse(partner.x_primary_wallet_id)

    # ------------------------------------------------------------------
    # Whitelist
    # ------------------------------------------------------------------

    def test_whitelist_sets_flag(self):
        wallet = self._create_wallet(state='active')
        self.assertFalse(wallet.whitelisted_on_chain)
        wallet.action_whitelist_on_chain()
        self.assertTrue(wallet.whitelisted_on_chain)
        self.assertIsNotNone(wallet.whitelisted_at)

    def test_whitelist_without_address_raises(self):
        partner = self._create_validated_partner()
        wallet = self.Wallet.create({
            'partner_id': partner.id,
            'provider_vault_id': 'v-no-addr',
        })
        wallet.write({'state': 'active'})  # bypass state guard for this test
        with self.assertRaises(UserError):
            wallet.action_whitelist_on_chain()

    # ------------------------------------------------------------------
    # Cron
    # ------------------------------------------------------------------

    def test_cron_flags_active_unwhitelisted_wallets(self):
        wallet = self._create_wallet(state='active')
        # has address but not whitelisted
        audit_count_before = self.env['solar.audit.log'].search_count([
            ('action_code', '=', 'wallet.whitelist.inconsistency'),
        ])
        self.Wallet._cron_verify_whitelist_consistency()
        audit_count_after = self.env['solar.audit.log'].search_count([
            ('action_code', '=', 'wallet.whitelist.inconsistency'),
        ])
        self.assertGreater(audit_count_after, audit_count_before)

    # ------------------------------------------------------------------
    # JSON-RPC: create_wallet_for_partner
    # ------------------------------------------------------------------

    def test_create_wallet_api_with_validated_kyc(self):
        partner = self._create_validated_partner(email='api@example.com')
        result = self.Wallet.create_wallet_for_partner(
            partner_uuid=partner.x_uuid,
            provider_vault_id='vault-api-001',
            address='0x' + '9' * 40,
        )
        self.assertIn('wallet_uuid', result)
        self.assertEqual(result['state'], 'pending')

    def test_create_wallet_api_without_kyc_raises(self):
        partner = self.Partner.create({
            'name': 'No KYC', 'email': 'nokyc@example.com',
            'x_is_investor': True, 'country_id': self.france.id,
        })
        with self.assertRaises(UserError):
            self.Wallet.create_wallet_for_partner(
                partner_uuid=partner.x_uuid,
                provider_vault_id='vault-nokyc',
            )

    # ------------------------------------------------------------------
    # JSON-RPC: get_wallet_info
    # ------------------------------------------------------------------

    def test_get_wallet_info_returns_safe_fields(self):
        wallet = self._create_wallet(state='active')
        info = wallet.get_wallet_info()
        self.assertIn('uuid', info)
        self.assertIn('state', info)
        self.assertIn('network', info)
        self.assertIn('whitelisted_on_chain', info)
        self.assertEqual(info['state'], 'active')
