# solar_core

Foundation addon for the SolarCells RWA platform.

## Purpose

`solar_core` is the **mandatory dependency of every other `solar_*` addon**.
It must be installed first.

It provides:

1. **Extension of `res.partner`** — investor-specific fields (account state,
   identity, banking, CGP delegation, marketing consent)
2. **All shared security groups** — used across every `solar_*` addon
3. **Sequences** — reference numbers for orders, payments, distributions
4. **Root menu "Solar"** — visible to all Solar groups

## Security groups defined here

| Group | `xml_id` | Role |
|-------|----------|------|
| Investor | `solar_core.group_investor` | Portal-like; no Odoo UI access |
| Asset Manager | `solar_core.group_asset_manager` | Manages solar assets |
| Finance | `solar_core.group_finance` | Validates distributions and payouts |
| Compliance | `solar_core.group_compliance` | KYC, AML, account suspension, audit read |
| API Client | `solar_core.group_api` | Technical Node.js backend user |

## Fields added to `res.partner`

Fields that depend on addons not yet installed are added by those addons:

| Field | Added by |
|-------|---------|
| `x_uuid`, `x_is_investor`, `x_investor_type` | solar_core ✅ |
| `x_account_state`, `x_account_*_at` | solar_core ✅ |
| `x_date_of_birth`, `x_nationality_id` | solar_core ✅ |
| `x_iban`, `x_iban_validated_at` | solar_core ✅ |
| `x_cgp_id`, `x_marketing_optin` | solar_core ✅ |
| `x_kyc_case_id`, `x_kyc_status`, `x_kyc_level` | solar_kyc (future) |
| `x_wallet_ids`, `x_primary_wallet_id` | solar_wallet (future) |
| `x_holding_ids`, `x_total_invested` | solar_holding (future) |

## Key business methods on `res.partner`

```python
# Account lifecycle
partner.action_activate_account()          # pending → active
partner.action_suspend(reason="...")       # active → suspended
partner.action_reactivate()               # suspended → active
partner.action_close_account()            # any → closed

# Identity & banking
partner.action_validate_iban()
partner.action_record_terms_acceptance(version='2025-01')

# JSON-RPC API
partner.register_investor(name, email, password_hash, country_id, ...)
partner.get_investor_by_uuid(uuid)
partner.get_public_profile()
```

## Sequences created

| Code | Prefix | Example |
|------|--------|---------|
| `solar.investment.order` | `INV-YYYY-` | `INV-2025-00042` |
| `solar.payment.transaction` | `PAY-YYYY-` | `PAY-2025-00017` |
| `solar.market.order` | `MKT-YYYY-` | `MKT-2025-00003` |
| `solar.market.trade` | `TRD-YYYY-` | `TRD-2025-00001` |
| `solar.yield.distribution` | `YLD-YYYY-` | `YLD-2025-00004` |
| `solar.kyc.case` | `KYC-YYYY-` | `KYC-2025-00099` |

## Dependencies

- `base` — res.partner base model
- `mail` — mail.thread + mail.activity.mixin
- `solar_audit` — audit log entries

## Tests

```bash
docker compose exec odoo \
    odoo --test-enable --stop-after-init \
         --test-tags solar_core \
         -d <database> \
         -i solar_core
```

**20 test methods** covering:
- UUID auto-generation and uniqueness
- Account state machine (all transitions and guards)
- IBAN format validation and normalisation
- Minimum age constraint
- Audit log entries for every sensitive action
- `register_investor()` and `get_public_profile()` API methods

## Installation order

1. `solar_audit` ← must be installed first
2. **`solar_core`** ← this addon
3. All other `solar_*` addons can then be installed in any order

## Version

`18.0.1.0.0` — initial release.
