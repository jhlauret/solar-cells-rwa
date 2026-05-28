# solar_audit

Append-only audit log for the SolarCells RWA platform.

## Purpose

Provides `solar.audit.log`, the immutable trail of all sensitive business
actions performed on the SolarCells platform.

Every other `solar_*` addon writes here when:

- a KYC case is validated, rejected, or expired
- an investment order is created, paid, or settled
- a marketplace trade is executed
- a yield distribution is computed or executed
- a wallet is created, frozen, or closed
- a compliance officer takes action (suspension, alert resolution)

## Why a dedicated addon

- **Foundation.** Has no business dependencies (only `base`). All other
  addons depend on `solar_audit` and write into it.
- **Immutability.** The model overrides `create`, `write`, `unlink` to
  enforce that entries can only be created through the dedicated API
  and never modified once written.
- **Retention.** Designed for 10-year retention by default. Controlled
  purge available via context flag.

## How to write an audit entry

From another addon's Python code:

```python
self.env['solar.audit.log'].create_audit_entry(
    action_code='kyc.validated',
    subject=partner_record,
    before={'state': 'submitted'},
    after={'state': 'validated'},
    actor={'type': 'user', 'id': self.env.user.id, 'name': self.env.user.name},
    request_metadata={
        'ip': '192.168.1.42',
        'user_agent': 'SolarCells-Backend/1.0',
        'trace_id': 'trace-abc-123',
    },
    external_refs={
        'redis_event_id': 'evt-...',
        'on_chain_tx_hash': '0x...',
    },
)
```

`subject` MUST be a singleton recordset. All other arguments are optional.

## What MUST NOT be done

- ❌ `self.env['solar.audit.log'].create({...})`        — blocked
- ❌ `entry.write({...})`                                — blocked
- ❌ `entry.unlink()` (without retention context)        — blocked

## Action code convention

Use dot-notation `<domain>.<event>`:

- `kyc.submitted`, `kyc.validated`, `kyc.rejected`
- `wallet.created`, `wallet.frozen`, `wallet.closed`
- `investment.created`, `investment.paid`, `investment.settled`
- `marketplace.offer.published`, `marketplace.trade.executed`
- `yield.distribution.calculated`, `yield.distribution.executed`
- `compliance.alert.opened`, `compliance.alert.resolved`
- `partner.account.closed`, `partner.account.suspended`

Maintain a central glossary of action codes (to be added in V1.1).

## Security

| Group | Permissions |
|-------|-------------|
| `solar_audit.group_audit_reader` | Read only |
| `solar_audit.group_audit_writer` | Read + Create (for technical API user) |
| `base.group_system` | Read + Create (admin) |

No group has `write` or `unlink` permission — those are blocked at the
model level regardless of CSV permissions.

## Tests

```bash
docker compose exec odoo \
    odoo --test-enable --stop-after-init \
         --test-tags solar_audit \
         -d <database_name> \
         -i solar_audit
```

## Installation

1. Mount `odoo-addons/` into the Odoo container at `/mnt/extra-addons`
   (already done by `docker-compose.yml`).
2. Update apps list in Odoo UI.
3. Search "Solar — Audit" and click Install.
4. Add the technical API user (`ODOO_API_USER`) to the
   `Solar / Audit Writer (API)` group.

## Dependencies

- `base` only.

This addon must be installed before any other `solar_*` addon.

## Version

`18.0.1.0.0` — initial release.
