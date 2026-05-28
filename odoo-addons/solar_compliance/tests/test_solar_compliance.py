# -*- coding: utf-8 -*-
# Part of SolarCells RWA.

"""Tests for solar.compliance.alert."""

from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import UserError


@tagged('post_install', '-at_install', 'solar_compliance')
class TestSolarCompliance(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.Alert   = cls.env['solar.compliance.alert']
        cls.Partner = cls.env['res.partner']
        cls.france  = cls.env.ref('base.fr')

    def _investor(self, email=None, state='active'):
        return self.Partner.create({
            'name': 'CompInv', 'x_is_investor': True,
            'email': email or f'comp.{id(self)}@x.com',
            'country_id': self.france.id,
            'x_account_state': state,
        })

    def _alert(self, partner, severity='medium', alert_type='manual'):
        return self.Alert.create({
            'partner_id':  partner.id,
            'alert_type':  alert_type,
            'severity':    severity,
            'description': 'Test alert',
        })

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def test_alert_uuid_generated(self):
        p = self._investor()
        a = self._alert(p)
        self.assertEqual(len(a.uuid), 36)

    def test_initial_state_open(self):
        p = self._investor()
        a = self._alert(p)
        self.assertEqual(a.state, 'open')

    def test_audit_log_on_create(self):
        p = self._investor()
        before = self.env['solar.audit.log'].search_count([
            ('action_code', '=', 'compliance.alert.raised')])
        self._alert(p)
        after = self.env['solar.audit.log'].search_count([
            ('action_code', '=', 'compliance.alert.raised')])
        self.assertGreater(after, before)

    # ------------------------------------------------------------------
    # Auto-suspend on high/critical
    # ------------------------------------------------------------------

    def test_high_alert_auto_suspends_active_investor(self):
        p = self._investor(email='autosusp@x.com')
        self.assertEqual(p.x_account_state, 'active')
        self._alert(p, severity='high')
        self.assertEqual(p.x_account_state, 'suspended')

    def test_critical_alert_auto_suspends(self):
        p = self._investor(email='crit@x.com')
        self._alert(p, severity='critical')
        self.assertEqual(p.x_account_state, 'suspended')

    def test_low_alert_does_not_suspend(self):
        p = self._investor(email='low@x.com')
        self._alert(p, severity='low')
        self.assertEqual(p.x_account_state, 'active')

    def test_medium_alert_does_not_suspend(self):
        p = self._investor(email='med@x.com')
        self._alert(p, severity='medium')
        self.assertEqual(p.x_account_state, 'active')

    # ------------------------------------------------------------------
    # State transitions
    # ------------------------------------------------------------------

    def test_start_review(self):
        p = self._investor()
        a = self._alert(p)
        a.action_start_review()
        self.assertEqual(a.state, 'under_review')

    def test_resolve(self):
        p = self._investor()
        a = self._alert(p)
        a.action_start_review()
        a.action_resolve(resolution_note='Cleared')
        self.assertEqual(a.state, 'resolved')
        self.assertEqual(a.resolution_note, 'Cleared')
        self.assertIsNotNone(a.resolved_at)

    def test_dismiss(self):
        p = self._investor()
        a = self._alert(p)
        a.action_dismiss(note='False positive')
        self.assertEqual(a.state, 'dismissed')

    def test_escalate(self):
        p = self._investor()
        a = self._alert(p)
        a.action_escalate()
        self.assertEqual(a.state, 'escalated')

    def test_cannot_resolve_dismissed(self):
        p = self._investor()
        a = self._alert(p)
        a.action_dismiss()
        with self.assertRaises(UserError):
            a.action_resolve()

    # ------------------------------------------------------------------
    # raise_alert API
    # ------------------------------------------------------------------

    def test_raise_alert_api(self):
        p = self._investor(email='api@x.com')
        result = self.Alert.raise_alert(
            partner_uuid=p.x_uuid,
            alert_type='sanctions_hit',
            severity='high',
            description='Hit on OFAC SDN list',
        )
        self.assertIn('alert_uuid', result)
        self.assertTrue(result['auto_suspended'])

    def test_raise_alert_unknown_partner_raises(self):
        with self.assertRaises(UserError):
            self.Alert.raise_alert(
                partner_uuid='00000000-0000-0000-0000-000000000000',
                alert_type='manual', severity='low', description='test',
            )

    # ------------------------------------------------------------------
    # Partner extension
    # ------------------------------------------------------------------

    def test_partner_open_alert_count(self):
        p = self._investor(email='cnt@x.com')
        self._alert(p, severity='low')
        self._alert(p, severity='low')
        self.assertEqual(p.x_open_alert_count, 2)

    def test_resolved_alert_not_counted(self):
        p = self._investor(email='rcnt@x.com')
        a = self._alert(p, severity='low')
        a.action_resolve()
        self.assertEqual(p.x_open_alert_count, 0)
