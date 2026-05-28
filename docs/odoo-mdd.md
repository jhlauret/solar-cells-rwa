---
document: odoo-mdd
version: 1.0.0
status: draft
classification: interne — confidentiel
applies-to: odoo-addons
based-on:
  - specs/mdd/00-overview.md v2.0
  - .specify/odoo-rules.md v1.1
last-updated: 2025-05
authors: [architecture, odoo-dev]
compatible-with: [claude-code, codex, github-spec-kit]
---

# SolarCells RWA — Odoo MDD (niveau implémentation)

> Spécification d'implémentation Odoo V18 pour les 10 modèles métier principaux.
> Document destiné aux développeurs Odoo et aux outils de génération de code (Claude Code / Codex).
> **Aucune ligne de Python n'est encore écrite — ce document décrit le contrat.**

---

## 0. Préambule

### 0.1 Lien avec les autres documents

| Document | Rôle | Lecture obligatoire avant codage |
|----------|------|---------------------------------|
| `specs/mdd/00-overview.md` v2.0 | Catalogue des 15 entités, relations, bounded contexts | ✅ |
| `.specify/odoo-rules.md` v1.1 | Règles de génération Odoo (RULE-OO-*) | ✅ |
| `.specify/security-rules.md` | Règles KYC, AML, secrets | ✅ |
| `.specify/constitution.md` v2.0 | Règles suprêmes | ✅ |

### 0.2 Architecture obligatoire

> **Un addon Odoo = un bounded context.**
> 11 addons au total (voir `00-overview.md` §1.2).

> **ORM Odoo exclusivement.**
> Pas de SQL raw, sauf dans les scripts de migration `migrations/<version>/`.

> **JSON-RPC obligatoire pour toute communication backend Node ↔ Odoo.**
> Aucun contrôleur HTTP custom au MVP.

### 0.3 Modèles couverts par ce document

Conformément au Prompt #5, ce document détaille les **10 modèles principaux** :

1. `solar.asset`
2. `solar.wallet`
3. `solar.investor` → **implémenté comme extension `res.partner`** (cf. RULE-OO-08)
4. `solar.investment.order`
5. `solar.payment.transaction`
6. `solar.market.order`
7. `solar.market.trade`
8. `solar.yield.distribution`
9. `solar.kyc.case`
10. `solar.audit.log`

Les 5 entités secondaires (`solar.wallet`, déjà ci-dessus, `solar.yield.line`,
`solar.kyc.document`, `solar.kyc.decision`, `solar.aml.alert`) sont documentées
en tant qu'enfants ou compagnons de leur entité principale.

### 0.4 Structure de chaque section modèle

Chaque modèle ci-dessous est documenté selon le template :

```
## solar.X — <Nom métier>
  1. Identité (addon, héritage, cardinalité)
  2. Fields (Python ORM)
  3. Relations
  4. States & transitions
  5. Workflows (méthodes Python, automated actions)
  6. Security (groupes, ir.model.access, ir.rule)
  7. Vues XML (tree, form, kanban, search)
  8. Menus
  9. Server actions
  10. Méthodes exposées JSON-RPC
```

### 0.5 Conventions de code Python (rappel)

| Convention | Application |
|------------|-------------|
| Format de fichier | UTF-8, LF, indentation 4 espaces |
| Imports | `from odoo import models, fields, api, _` |
| Logger | `_logger = logging.getLogger(__name__)` |
| Classe par fichier | `models/<entity>.py` |
| Tests | `tests/test_<entity>.py` héritant de `TransactionCase` |
| Migrations | `migrations/18.0.X.Y.Z/{pre,post}-migrate.py` |

---

## 1. `solar.asset` — Actif solaire

### 1.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.asset` |
| **`_description`** | `Solar Asset (RWA)` |
| **`_inherit`** | `['mail.thread', 'mail.activity.mixin']` (pour chatter et activités) |
| **`_order`** | `code asc` |
| **`_rec_name`** | `name` |
| **Addon** | `solar_asset` |
| **Dépend de** | `solar_core`, `solar_audit` |

### 1.2 Fields

```python
# Identifiants
uuid = fields.Char(string="UUID", required=True, copy=False, readonly=True,
                   index=True, default=lambda self: str(uuid.uuid4()),
                   help="External public identifier exposed via API.")
code = fields.Char(string="Code", required=True, copy=False, index=True,
                   help="Short unique code (e.g. FR-PROV-01).")
name = fields.Char(string="Name", required=True, translate=True, tracking=True)
slug = fields.Char(string="URL slug", required=True, copy=False, index=True)

# State machine
state = fields.Selection([
    ('draft',              'Draft'),
    ('pending_approval',   'Pending approval'),
    ('financing',          'Financing'),
    ('financing_complete', 'Financing complete'),
    ('in_production',      'In production'),
    ('paused',             'Paused'),
    ('mature',             'Mature'),
    ('decommissioned',     'Decommissioned'),
    ('cancelled',          'Cancelled'),
], string="State", default='draft', required=True, tracking=True, index=True)

# Geography
country_id = fields.Many2one('res.country', string="Country", required=True, tracking=True)
region = fields.Char(string="Region")
city = fields.Char(string="City")
latitude = fields.Float(string="Latitude", digits=(10, 7))
longitude = fields.Float(string="Longitude", digits=(10, 7))

# Technical
asset_type = fields.Selection([
    ('solar_ground',     'Ground-mounted solar'),
    ('solar_canopy',     'Solar canopy'),
    ('solar_industrial', 'Industrial rooftop'),
    ('solar_residential','Residential collective'),
    ('battery_storage',  'Battery storage (BESS)'),
    ('ev_charging',      'EV charging station'),
], string="Asset type", required=True, default='solar_ground', tracking=True)
installed_power_mwc = fields.Float(string="Installed power (MWc)", digits=(10, 3),
                                    required=True, tracking=True)
annual_production_mwh = fields.Float(string="Annual production (MWh)", digits=(12, 2))
commissioning_date = fields.Date(string="Commissioning date", tracking=True)
project_duration_years = fields.Integer(string="Project duration (years)",
                                         default=20, required=True)

# Financial
currency_id = fields.Many2one('res.currency', string="Currency", required=True,
                              default=lambda self: self.env.ref('base.EUR'))
total_capital_raised = fields.Monetary(string="Total capital to raise",
                                        currency_field='currency_id', tracking=True)
cell_unit_price = fields.Monetary(string="Cell unit price",
                                   currency_field='currency_id',
                                   default=1.00, required=True)
total_cells = fields.Integer(string="Total cells", required=True, tracking=True)
cells_subscribed = fields.Integer(string="Cells subscribed",
                                   compute='_compute_cells_subscribed', store=True)
cells_available = fields.Integer(string="Cells available",
                                  compute='_compute_cells_available', store=True)
target_yield_rate = fields.Float(string="Target yield rate (annual)",
                                  digits=(5, 4),
                                  help="Decimal (0.0850 = 8.50 %)")

# PPA
ppa_type = fields.Selection([
    ('ppa_long_term',  'Long-term PPA'),
    ('ppa_short_term', 'Short-term PPA'),
    ('feed_in_tariff', 'Feed-in tariff'),
    ('spot_market',    'Spot market'),
    ('mixed',          'Mixed'),
], string="PPA type", default='ppa_long_term')
ppa_price_per_kwh = fields.Float(string="PPA price (€/kWh)", digits=(6, 4))
ppa_duration_years = fields.Integer(string="PPA duration (years)")
ppa_buyer_id = fields.Many2one('res.partner', string="PPA buyer",
                                domain=[('is_company', '=', True)])

# Operations
operator_id = fields.Many2one('res.partner', string="Solar operator", tracking=True)
owner_spv_id = fields.Many2one('res.partner', string="Owner SPV",
                                domain=[('is_company', '=', True)], tracking=True)
insurance_provider = fields.Char(string="Insurance provider")
insurance_policy_ref = fields.Char(string="Insurance policy ref")

# Distribution
distribution_frequency = fields.Selection([
    ('monthly',   'Monthly'),
    ('quarterly', 'Quarterly'),
    ('biannual',  'Bi-annual'),
    ('annual',    'Annual'),
], string="Distribution frequency", default='quarterly', required=True)

# Marketplace
is_secondary_market_enabled = fields.Boolean(
    string="Secondary market enabled", default=True, tracking=True)
geo_restriction_country_ids = fields.Many2many(
    'res.country', 'solar_asset_geo_restriction_rel',
    string="Geo-restricted to countries",
    help="If empty, no restriction. Otherwise list of allowed countries.")

# Content
description = fields.Text(string="Description", translate=True)
risk_disclosures = fields.Html(string="Risk disclosures", translate=True)
image_url = fields.Char(string="Main image URL")
gallery_urls = fields.Json(string="Gallery URLs", default=list)

# Relations
holding_ids = fields.One2many('solar.holding', 'asset_id', string="Holdings")
investment_order_ids = fields.One2many('solar.investment.order', 'asset_id',
                                        string="Investment orders")
distribution_ids = fields.One2many('solar.yield.distribution', 'asset_id',
                                    string="Yield distributions")
market_order_ids = fields.One2many('solar.market.order', 'asset_id',
                                    string="Marketplace orders")
document_ids = fields.One2many('solar.asset.document', 'asset_id',
                                string="Asset documents")

# On-chain
on_chain_token_address = fields.Char(string="On-chain token address",
                                      copy=False, tracking=True,
                                      help="ERC-3643 SolarToken contract address.")
on_chain_token_symbol = fields.Char(string="On-chain token symbol", copy=False)
on_chain_deployed_at = fields.Datetime(string="On-chain deployed at", copy=False)

# Audit
active = fields.Boolean(default=True)
```

### 1.3 Relations

| Field | Type | Target | Inverse |
|-------|------|--------|---------|
| `country_id` | Many2one | `res.country` | — |
| `ppa_buyer_id` | Many2one | `res.partner` | — |
| `operator_id` | Many2one | `res.partner` | — |
| `owner_spv_id` | Many2one | `res.partner` | — |
| `geo_restriction_country_ids` | Many2many | `res.country` | — |
| `holding_ids` | One2many | `solar.holding` | `asset_id` |
| `investment_order_ids` | One2many | `solar.investment.order` | `asset_id` |
| `distribution_ids` | One2many | `solar.yield.distribution` | `asset_id` |
| `market_order_ids` | One2many | `solar.market.order` | `asset_id` |
| `document_ids` | One2many | `solar.asset.document` | `asset_id` |

### 1.4 State transitions

```
draft → pending_approval         (action_request_approval)
pending_approval → financing     (action_approve)
pending_approval → cancelled     (action_cancel)
financing → financing_complete   (auto when cells_subscribed == total_cells)
financing → cancelled            (action_cancel, only by compliance)
financing_complete → in_production (action_commission, requires commissioning_date)
in_production → paused           (action_pause)
paused → in_production           (action_resume)
in_production → mature           (auto when project_duration approaches)
mature → decommissioned          (action_decommission)
in_production → decommissioned   (action_decommission, exceptional)
```

### 1.5 Workflows (méthodes Python)

```python
def action_request_approval(self):
    """draft → pending_approval. Verifies all required fields are set."""

def action_approve(self):
    """pending_approval → financing. Triggers on-chain token deployment."""

def action_deploy_on_chain(self):
    """Internal: deploys the SolarToken contract via Tempo Adapter.
       Sets on_chain_token_address. Called by action_approve."""

def action_pause(self):
    """in_production → paused. Stops distributions, holdings stay valid."""

def action_resume(self):
    """paused → in_production. Resumes distributions."""

def action_cancel(self):
    """pending_approval or financing → cancelled. Triggers refund workflow."""

def action_decommission(self):
    """mature or in_production → decommissioned. Liquidation."""

@api.depends('investment_order_ids.cells_requested', 'investment_order_ids.state')
def _compute_cells_subscribed(self):
    """Sum of cells from settled investment orders."""

@api.depends('total_cells', 'cells_subscribed')
def _compute_cells_available(self):
    """total_cells - cells_subscribed."""

@api.constrains('total_cells', 'cell_unit_price', 'total_capital_raised')
def _check_capital_consistency(self):
    """total_capital_raised == total_cells * cell_unit_price."""

@api.constrains('state', 'on_chain_token_address')
def _check_on_chain_deployed_before_financing(self):
    """state='financing' requires on_chain_token_address."""
```

**Automated actions (cron) :**
- `Cron: Auto-transition mature` — quotidien, passe en `mature` les actifs proches de fin.
- `Cron: Compute available cells` — toutes les heures (sécurité).

### 1.6 Security

**Groupes utilisés (définis dans `solar_core/security/solar_groups.xml`) :**
- `solar_core.group_investor` — peut lire les actifs en `financing`, `financing_complete`, `in_production`, `mature`.
- `solar_core.group_asset_manager` — CRUD complet.
- `solar_core.group_compliance` — lecture complète + actions de `cancel`.
- `solar_core.group_api` — lecture complète (compte technique backend Node).

**`solar_asset/security/ir.model.access.csv` :**

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_solar_asset_investor,solar.asset.investor,model_solar_asset,solar_core.group_investor,1,0,0,0
access_solar_asset_manager,solar.asset.manager,model_solar_asset,solar_core.group_asset_manager,1,1,1,1
access_solar_asset_compliance,solar.asset.compliance,model_solar_asset,solar_core.group_compliance,1,1,0,0
access_solar_asset_api,solar.asset.api,model_solar_asset,solar_core.group_api,1,1,0,0
```

**`ir.rule` (record-level security) :**

```xml
<record id="rule_asset_investor_visibility" model="ir.rule">
    <field name="name">Investors see only published assets</field>
    <field name="model_id" ref="model_solar_asset"/>
    <field name="groups" eval="[(4, ref('solar_core.group_investor'))]"/>
    <field name="domain_force">
        [('state', 'in', ['financing', 'financing_complete', 'in_production', 'mature'])]
    </field>
    <field name="perm_read" eval="1"/>
</record>
```

### 1.7 Vues XML

**Tree view (`solar_asset/views/solar_asset_views.xml`) :**

```xml
<record id="view_solar_asset_tree" model="ir.ui.view">
    <field name="name">solar.asset.tree</field>
    <field name="model">solar.asset</field>
    <field name="arch" type="xml">
        <tree string="Solar Assets" decoration-success="state == 'in_production'"
              decoration-warning="state == 'financing'"
              decoration-muted="state in ['decommissioned', 'cancelled']">
            <field name="code"/>
            <field name="name"/>
            <field name="country_id"/>
            <field name="asset_type"/>
            <field name="installed_power_mwc"/>
            <field name="target_yield_rate" widget="percentage"/>
            <field name="cells_subscribed"/>
            <field name="total_cells"/>
            <field name="state" widget="badge"/>
        </tree>
    </field>
</record>
```

**Form view :**

```xml
<record id="view_solar_asset_form" model="ir.ui.view">
    <field name="name">solar.asset.form</field>
    <field name="model">solar.asset</field>
    <field name="arch" type="xml">
        <form string="Solar Asset">
            <header>
                <button name="action_request_approval" string="Request approval"
                        states="draft" type="object" class="oe_highlight"/>
                <button name="action_approve" string="Approve &amp; deploy on-chain"
                        states="pending_approval" type="object" class="oe_highlight"
                        groups="solar_core.group_compliance"/>
                <button name="action_pause" string="Pause"
                        states="in_production" type="object"/>
                <button name="action_resume" string="Resume" states="paused" type="object"/>
                <button name="action_cancel" string="Cancel"
                        states="pending_approval,financing" type="object"
                        groups="solar_core.group_compliance"
                        confirm="Cancelling will trigger refunds. Confirm?"/>
                <field name="state" widget="statusbar"
                       statusbar_visible="draft,pending_approval,financing,financing_complete,in_production,mature,decommissioned"/>
            </header>
            <sheet>
                <div class="oe_button_box" name="button_box">
                    <button name="action_view_holdings" type="object"
                            class="oe_stat_button" icon="fa-users">
                        <field name="holding_ids" widget="statinfo" string="Holdings"/>
                    </button>
                    <button name="action_view_distributions" type="object"
                            class="oe_stat_button" icon="fa-money">
                        <field name="distribution_ids" widget="statinfo" string="Distributions"/>
                    </button>
                </div>
                <group>
                    <group string="Identity">
                        <field name="code"/>
                        <field name="name"/>
                        <field name="slug"/>
                        <field name="uuid" groups="base.group_no_one"/>
                    </group>
                    <group string="Type">
                        <field name="asset_type"/>
                        <field name="distribution_frequency"/>
                        <field name="is_secondary_market_enabled"/>
                    </group>
                </group>
                <notebook>
                    <page string="Geography">
                        <group>
                            <field name="country_id"/>
                            <field name="region"/>
                            <field name="city"/>
                            <field name="latitude"/>
                            <field name="longitude"/>
                        </group>
                    </page>
                    <page string="Technical">
                        <group>
                            <field name="installed_power_mwc"/>
                            <field name="annual_production_mwh"/>
                            <field name="commissioning_date"/>
                            <field name="project_duration_years"/>
                        </group>
                    </page>
                    <page string="Financial">
                        <group>
                            <field name="currency_id"/>
                            <field name="cell_unit_price"/>
                            <field name="total_cells"/>
                            <field name="total_capital_raised"/>
                            <field name="cells_subscribed"/>
                            <field name="cells_available"/>
                            <field name="target_yield_rate" widget="percentage"/>
                        </group>
                    </page>
                    <page string="PPA">
                        <group>
                            <field name="ppa_type"/>
                            <field name="ppa_price_per_kwh"/>
                            <field name="ppa_duration_years"/>
                            <field name="ppa_buyer_id"/>
                        </group>
                    </page>
                    <page string="Operations">
                        <group>
                            <field name="operator_id"/>
                            <field name="owner_spv_id"/>
                            <field name="insurance_provider"/>
                            <field name="insurance_policy_ref"/>
                        </group>
                    </page>
                    <page string="On-chain">
                        <group>
                            <field name="on_chain_token_address"/>
                            <field name="on_chain_token_symbol"/>
                            <field name="on_chain_deployed_at"/>
                        </group>
                    </page>
                    <page string="Holdings">
                        <field name="holding_ids" readonly="1"/>
                    </page>
                    <page string="Documents">
                        <field name="document_ids"/>
                    </page>
                </notebook>
            </sheet>
            <div class="oe_chatter">
                <field name="message_follower_ids"/>
                <field name="activity_ids"/>
                <field name="message_ids"/>
            </div>
        </form>
    </field>
</record>
```

**Kanban view** (regroupé par `state`) — pour la vue opérationnelle.

**Search view** :

```xml
<record id="view_solar_asset_search" model="ir.ui.view">
    <field name="name">solar.asset.search</field>
    <field name="model">solar.asset</field>
    <field name="arch" type="xml">
        <search>
            <field name="code"/>
            <field name="name"/>
            <field name="country_id"/>
            <filter string="In production" name="in_production" domain="[('state', '=', 'in_production')]"/>
            <filter string="Financing" name="financing" domain="[('state', '=', 'financing')]"/>
            <filter string="With secondary market" name="secondary_market" domain="[('is_secondary_market_enabled', '=', True)]"/>
            <group string="Group by">
                <filter string="State" name="group_state" context="{'group_by':'state'}"/>
                <filter string="Asset type" name="group_type" context="{'group_by':'asset_type'}"/>
                <filter string="Country" name="group_country" context="{'group_by':'country_id'}"/>
            </group>
        </search>
    </field>
</record>
```

### 1.8 Menus

```xml
<menuitem id="menu_solar_root" name="SolarCells" sequence="20"
          web_icon="solar_core,static/description/icon.png"/>

<menuitem id="menu_solar_asset_root" name="Solar Assets"
          parent="menu_solar_root" sequence="10"/>

<menuitem id="menu_solar_asset_all" name="All Assets"
          parent="menu_solar_asset_root" sequence="10"
          action="action_solar_asset_list"/>

<menuitem id="menu_solar_asset_financing" name="In Financing"
          parent="menu_solar_asset_root" sequence="20"
          action="action_solar_asset_financing"/>

<menuitem id="menu_solar_asset_production" name="In Production"
          parent="menu_solar_asset_root" sequence="30"
          action="action_solar_asset_production"/>
```

### 1.9 Server actions

```xml
<record id="action_solar_asset_list" model="ir.actions.act_window">
    <field name="name">All Assets</field>
    <field name="res_model">solar.asset</field>
    <field name="view_mode">tree,kanban,form</field>
    <field name="search_view_id" ref="view_solar_asset_search"/>
</record>

<record id="action_solar_asset_financing" model="ir.actions.act_window">
    <field name="name">Assets in Financing</field>
    <field name="res_model">solar.asset</field>
    <field name="view_mode">kanban,tree,form</field>
    <field name="domain">[('state', '=', 'financing')]</field>
</record>
```

### 1.10 Méthodes JSON-RPC exposées

| Méthode | Args | Returns | Usage backend Node |
|---------|------|---------|-------------------|
| `search_read` (standard) | domain, fields, limit, offset | List[Dict] | Marketplace listing |
| `get_public_catalog` | filters: Dict | List[Dict] | Endpoint catalogue investisseur |
| `get_detail` | uuid: str | Dict | Page S09 |
| `simulate_investment` | uuid: str, cells: int | Dict (estimation) | Page S10 |

```python
@api.model
def get_public_catalog(self, filters=None):
    """Returns the public catalog filtered for investor visibility.
    Excludes draft, pending_approval, decommissioned, cancelled.
    Returns only fields safe for public exposure."""

@api.model
def get_detail(self, uuid):
    """Returns full asset details for the given UUID.
    Filtered by ir.rule based on calling user."""

def simulate_investment(self, cells):
    """Returns estimated investment summary: total amount, fees, expected yield."""
```

---

## 2. `solar.wallet` — Wallet custodial

### 2.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.wallet` |
| **`_description`** | `Custodial wallet` |
| **`_inherit`** | `['mail.thread']` |
| **`_order`** | `created_at desc` |
| **Addon** | `solar_wallet` |
| **Dépend de** | `solar_core`, `solar_audit` |

### 2.2 Fields

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
partner_id = fields.Many2one('res.partner', string="Owner", required=True,
                              ondelete='restrict', index=True, tracking=True)
wallet_type = fields.Selection([
    ('custodial',     'Custodial (managed)'),
    ('mpc',           'MPC (co-signed)'),
    ('self_custodial','Self-custodial'),
], string="Wallet type", required=True, default='custodial', tracking=True)
provider = fields.Selection([
    ('fireblocks', 'Fireblocks'),
    ('copper',     'Copper'),
    ('bitgo',      'BitGo'),
    ('other',      'Other'),
], string="Custody provider", required=True, default='fireblocks', tracking=True)
provider_vault_id = fields.Char(string="Provider vault ID", required=True,
                                 copy=False, index=True)
address = fields.Char(string="On-chain address", required=True, copy=False, index=True)
network = fields.Selection([
    ('tempo',     'Tempo'),
    ('polygon',   'Polygon'),
    ('base',      'Base'),
    ('avalanche', 'Avalanche'),
], string="Network", default='tempo', required=True)
state = fields.Selection([
    ('pending', 'Pending creation'),
    ('active',  'Active'),
    ('frozen',  'Frozen'),
    ('closed',  'Closed'),
    ('failed',  'Failed creation'),
], string="State", default='pending', required=True, tracking=True, index=True)
whitelisted_on_chain = fields.Boolean(string="Whitelisted on-chain", default=False,
                                       tracking=True)
whitelisted_at = fields.Datetime(string="Whitelisted at", copy=False)
created_at = fields.Datetime(string="Created at", default=fields.Datetime.now,
                              required=True, copy=False)
activated_at = fields.Datetime(string="Activated at", copy=False)
frozen_at = fields.Datetime(string="Frozen at", copy=False)
closed_at = fields.Datetime(string="Closed at", copy=False)
last_balance_sync_at = fields.Datetime(string="Last balance sync at")
freeze_reason = fields.Text(string="Freeze reason")
metadata = fields.Json(string="Provider metadata", default=dict)
active = fields.Boolean(default=True)

# Computed
is_primary = fields.Boolean(string="Is primary wallet",
                             compute='_compute_is_primary', store=True)
```

### 2.3 Relations

| Field | Type | Target | Inverse |
|-------|------|--------|---------|
| `partner_id` | Many2one | `res.partner` | `x_wallet_ids` |

### 2.4 State transitions

```
pending → active                 (action_activate, after provider confirms)
pending → failed                 (action_mark_failed)
active → frozen                  (action_freeze, by compliance)
frozen → active                  (action_unfreeze, by compliance)
active → closed                  (action_close, on account closure)
frozen → closed                  (action_close)
```

### 2.5 Workflows

```python
def action_activate(self):
    """pending → active. Called after provider webhook confirms vault creation."""

def action_whitelist_on_chain(self):
    """Submits the wallet address to the on-chain whitelist contract.
       Idempotent. Sets whitelisted_on_chain=True and whitelisted_at."""

def action_freeze(self, reason):
    """active → frozen. Sets freeze_reason. Called from AML alert resolution."""

def action_unfreeze(self):
    """frozen → active. Requires explicit compliance officer confirmation."""

def action_close(self):
    """any → closed. Final step in account closure flow."""

@api.constrains('partner_id', 'state')
def _check_one_primary_wallet(self):
    """Only one active wallet per partner can be primary."""
```

**Automated actions :**
- `Cron: Sync wallet balances` — toutes les 15 min, met à jour les soldes via custody provider.
- `Cron: Verify whitelist consistency` — quotidien, vérifie que les wallets `active`
  sont bien `whitelisted_on_chain`. Sinon, alerte.

### 2.6 Security

```csv
access_solar_wallet_investor,solar.wallet.investor,model_solar_wallet,solar_core.group_investor,1,0,0,0
access_solar_wallet_manager,solar.wallet.manager,model_solar_wallet,solar_core.group_compliance,1,1,1,0
access_solar_wallet_api,solar.wallet.api,model_solar_wallet,solar_core.group_api,1,1,1,0
```

**`ir.rule` :**

```xml
<record id="rule_wallet_own_only" model="ir.rule">
    <field name="name">Investors see only their own wallets</field>
    <field name="model_id" ref="model_solar_wallet"/>
    <field name="groups" eval="[(4, ref('solar_core.group_investor'))]"/>
    <field name="domain_force">[('partner_id.user_ids', 'in', [user.id])]</field>
</record>
```

### 2.7 Vues

**Tree :**

```xml
<tree decoration-success="state == 'active'"
      decoration-warning="state == 'pending'"
      decoration-danger="state == 'frozen'"
      decoration-muted="state in ['closed', 'failed']">
    <field name="partner_id"/>
    <field name="address"/>
    <field name="wallet_type"/>
    <field name="provider"/>
    <field name="network"/>
    <field name="whitelisted_on_chain" widget="boolean_toggle"/>
    <field name="state" widget="badge"/>
    <field name="created_at"/>
</tree>
```

**Form :**

```xml
<form>
    <header>
        <button name="action_activate" string="Activate"
                states="pending" type="object" class="oe_highlight"/>
        <button name="action_whitelist_on_chain" string="Whitelist on-chain"
                states="active" type="object"
                invisible="whitelisted_on_chain == True"/>
        <button name="action_freeze" string="Freeze"
                states="active" type="object" class="btn-warning"
                groups="solar_core.group_compliance"/>
        <button name="action_unfreeze" string="Unfreeze"
                states="frozen" type="object"
                groups="solar_core.group_compliance"/>
        <field name="state" widget="statusbar"/>
    </header>
    <sheet>
        <group>
            <group>
                <field name="partner_id"/>
                <field name="wallet_type"/>
                <field name="provider"/>
                <field name="provider_vault_id"/>
            </group>
            <group>
                <field name="address" widget="CopyClipboardChar"/>
                <field name="network"/>
                <field name="whitelisted_on_chain"/>
                <field name="whitelisted_at"/>
            </group>
        </group>
        <notebook>
            <page string="Lifecycle">
                <group>
                    <field name="created_at"/>
                    <field name="activated_at"/>
                    <field name="frozen_at"/>
                    <field name="freeze_reason" invisible="not frozen_at"/>
                    <field name="closed_at"/>
                </group>
            </page>
            <page string="Metadata" groups="base.group_no_one">
                <field name="metadata" widget="json"/>
            </page>
        </notebook>
    </sheet>
    <div class="oe_chatter">
        <field name="message_follower_ids"/>
        <field name="message_ids"/>
    </div>
</form>
```

### 2.8 Menus

```xml
<menuitem id="menu_solar_wallet" name="Wallets" parent="menu_solar_root"
          sequence="20" action="action_solar_wallet_list"
          groups="solar_core.group_compliance,solar_core.group_asset_manager"/>
```

### 2.9 Server actions

```xml
<record id="action_solar_wallet_list" model="ir.actions.act_window">
    <field name="name">All Wallets</field>
    <field name="res_model">solar.wallet</field>
    <field name="view_mode">tree,form</field>
</record>
```

### 2.10 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `create_wallet_for_partner` | wallet uuid | Création wallet après KYC validé |
| `get_my_wallet` | Dict | Frontend S06 |
| `get_balance` | Dict (balances par token) | Dashboard portefeuille |

---

## 3. `solar.investor` — Extension `res.partner`

### 3.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | (extension, pas de nouveau `_name`) |
| **`_inherit`** | `'res.partner'` |
| **Addon** | `solar_core` |
| **Justification** | RULE-OO-08 (héritage > création) |

> **Note importante.** Bien que le Prompt #5 mentionne `solar.investor`, l'implémentation
> est une **extension de `res.partner`**. Aucun nouveau modèle Odoo n'est créé.
> Les utilisateurs filtrent par `x_is_investor = True` pour ne voir que les investisseurs.

### 3.2 Fields custom ajoutés à `res.partner`

```python
# Identifiant
x_uuid = fields.Char(string="UUID", copy=False, readonly=True, index=True,
                     default=lambda self: str(uuid.uuid4()))
x_is_investor = fields.Boolean(string="Is investor", default=False, index=True,
                                tracking=True,
                                help="True if this partner is a SolarCells investor.")
x_investor_type = fields.Selection([
    ('retail',        'Retail'),
    ('qualified',     'Qualified'),
    ('institutional', 'Institutional'),
], string="Investor type", tracking=True)

# KYC (delegated to solar.kyc.case)
x_kyc_case_id = fields.Many2one('solar.kyc.case', string="KYC case",
                                 copy=False, tracking=True)
x_kyc_status = fields.Selection(related='x_kyc_case_id.state',
                                 string="KYC status", store=True, readonly=True)
x_kyc_level = fields.Selection(related='x_kyc_case_id.level',
                                string="KYC level", store=True, readonly=True)

# Wallets
x_wallet_ids = fields.One2many('solar.wallet', 'partner_id', string="Wallets")
x_primary_wallet_id = fields.Many2one('solar.wallet', string="Primary wallet",
                                       domain="[('partner_id', '=', id),"
                                              " ('state', '=', 'active')]")

# Identity
x_date_of_birth = fields.Date(string="Date of birth")
x_nationality_id = fields.Many2one('res.country', string="Nationality")
x_phone_validated = fields.Boolean(string="Phone validated (OTP)", default=False)

# Banking
x_iban = fields.Char(string="IBAN", tracking=True, copy=False)
x_iban_validated_at = fields.Datetime(string="IBAN validated at")

# Delegation
x_cgp_id = fields.Many2one('res.partner', string="Wealth advisor (CGP)",
                            domain="[('is_company', '=', False)]")
x_managed_partner_ids = fields.One2many('res.partner', 'x_cgp_id',
                                          string="Managed investors")

# Account state
x_account_state = fields.Selection([
    ('pending',   'Pending email confirmation'),
    ('active',    'Active'),
    ('suspended', 'Suspended'),
    ('closed',    'Closed'),
], string="Account state", default='pending', tracking=True, index=True)

# Consent
x_terms_accepted_at = fields.Datetime(string="Terms accepted at", readonly=True)
x_marketing_optin = fields.Boolean(string="Marketing opt-in", default=False)

# Relations (One2many for navigation)
x_holding_ids = fields.One2many('solar.holding', 'partner_id', string="Holdings")
x_investment_order_ids = fields.One2many('solar.investment.order', 'partner_id',
                                           string="Investment orders")
x_payment_transaction_ids = fields.One2many('solar.payment.transaction', 'partner_id',
                                              string="Payment transactions")
x_market_order_ids = fields.One2many('solar.market.order', 'seller_id',
                                       string="Marketplace orders (as seller)")
x_aml_alert_ids = fields.One2many('solar.aml.alert', 'partner_id',
                                    string="AML alerts")

# Computed aggregates
x_total_invested = fields.Monetary(string="Total invested",
                                    compute='_compute_total_invested',
                                    currency_field='currency_id')
x_total_yield_received = fields.Monetary(string="Total yield received",
                                          compute='_compute_total_yield',
                                          currency_field='currency_id')
x_portfolio_value = fields.Monetary(string="Portfolio value (nominal)",
                                     compute='_compute_portfolio_value',
                                     currency_field='currency_id')
```

### 3.3 State transitions (`x_account_state`)

```
pending   → active     (action_activate_account, after email confirmation)
active    → suspended  (action_suspend, by compliance)
suspended → active     (action_reactivate, by compliance)
active    → closed     (action_close_account, by investor or compliance)
suspended → closed
```

### 3.4 Workflows

```python
def action_activate_account(self):
    """pending → active. Called after email OTP confirmation."""

def action_suspend(self, reason):
    """active → suspended. Triggers wallet freeze."""

def action_close_account(self):
    """any → closed. Triggers wallet closure + RGPD data minimization
       after the AMLD6 retention period."""

def action_create_kyc_case(self):
    """Creates a solar.kyc.case if none exists. Idempotent."""

@api.depends('x_holding_ids.total_invested')
def _compute_total_invested(self):
    """Sum of all holdings' total_invested."""

@api.depends('x_holding_ids.total_yield_received')
def _compute_total_yield(self):
    """Sum of all yield received."""

@api.depends('x_holding_ids.cells_owned', 'x_holding_ids.asset_id.cell_unit_price')
def _compute_portfolio_value(self):
    """Nominal valuation: sum(cells_owned * cell_unit_price)."""
```

### 3.5 Security

L'extension hérite des permissions `res.partner` standard, restreintes par `ir.rule` :

```xml
<record id="rule_partner_self_only" model="ir.rule">
    <field name="name">Investors see only themselves</field>
    <field name="model_id" ref="base.model_res_partner"/>
    <field name="groups" eval="[(4, ref('solar_core.group_investor'))]"/>
    <field name="domain_force">[('user_ids', 'in', [user.id])]</field>
</record>
```

### 3.6 Vues (héritage de `res.partner`)

```xml
<record id="view_partner_form_solar_inherit" model="ir.ui.view">
    <field name="name">res.partner.form.solar.inherit</field>
    <field name="model">res.partner</field>
    <field name="inherit_id" ref="base.view_partner_form"/>
    <field name="arch" type="xml">
        <xpath expr="//notebook" position="inside">
            <page string="Investor (SolarCells)" invisible="not x_is_investor">
                <group>
                    <group string="Status">
                        <field name="x_is_investor"/>
                        <field name="x_investor_type"/>
                        <field name="x_account_state" widget="badge"/>
                        <field name="x_kyc_status" widget="badge"/>
                        <field name="x_kyc_level"/>
                    </group>
                    <group string="Identity">
                        <field name="x_date_of_birth"/>
                        <field name="x_nationality_id"/>
                        <field name="x_phone_validated"/>
                    </group>
                </group>
                <group>
                    <group string="Banking">
                        <field name="x_iban"/>
                        <field name="x_iban_validated_at"/>
                    </group>
                    <group string="Delegation">
                        <field name="x_cgp_id"/>
                    </group>
                </group>
                <notebook>
                    <page string="Wallets">
                        <field name="x_wallet_ids" readonly="1"/>
                    </page>
                    <page string="Holdings">
                        <field name="x_holding_ids" readonly="1"/>
                    </page>
                    <page string="Portfolio summary">
                        <group>
                            <field name="x_total_invested"/>
                            <field name="x_total_yield_received"/>
                            <field name="x_portfolio_value"/>
                        </group>
                    </page>
                </notebook>
            </page>
        </xpath>
    </field>
</record>
```

### 3.7 Menus

```xml
<menuitem id="menu_solar_investor_root" name="Investors"
          parent="menu_solar_root" sequence="5"/>

<menuitem id="menu_solar_investor_all" name="All Investors"
          parent="menu_solar_investor_root" sequence="10"
          action="action_solar_investor_list"/>

<menuitem id="menu_solar_investor_pending_kyc" name="Pending KYC"
          parent="menu_solar_investor_root" sequence="20"
          action="action_solar_investor_pending_kyc"/>
```

### 3.8 Server actions

```xml
<record id="action_solar_investor_list" model="ir.actions.act_window">
    <field name="name">All Investors</field>
    <field name="res_model">res.partner</field>
    <field name="view_mode">tree,kanban,form</field>
    <field name="domain">[('x_is_investor', '=', True)]</field>
    <field name="context">{'default_x_is_investor': True}</field>
</record>

<record id="action_solar_investor_pending_kyc" model="ir.actions.act_window">
    <field name="name">Pending KYC</field>
    <field name="res_model">res.partner</field>
    <field name="view_mode">tree,form</field>
    <field name="domain">[('x_is_investor', '=', True),
                           ('x_kyc_status', 'in', ['not_started', 'in_progress', 'submitted', 'under_review'])]</field>
</record>
```

### 3.9 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `register_investor` | partner uuid | Inscription (S03) |
| `confirm_email_otp` | bool | OTP confirmation |
| `get_my_profile` | Dict | Profile page |
| `get_my_portfolio_summary` | Dict | Dashboard |
| `update_iban` | bool | Profile update |
| `request_account_closure` | bool | Settings page |

---

## 4. `solar.investment.order` — Ordre d'investissement

### 4.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.investment.order` |
| **`_description`** | `Investment subscription order` |
| **`_inherit`** | `['mail.thread', 'mail.activity.mixin']` |
| **`_order`** | `created_at desc` |
| **Addon** | `solar_investment` |
| **Dépend de** | `solar_core`, `solar_asset`, `solar_holding`, `solar_payment`, `solar_audit` |

### 4.2 Fields

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
name = fields.Char(string="Order reference", required=True, copy=False, readonly=True,
                   default=lambda self: self.env['ir.sequence'].next_by_code('solar.investment.order'))
partner_id = fields.Many2one('res.partner', string="Investor", required=True,
                              ondelete='restrict', index=True, tracking=True)
asset_id = fields.Many2one('solar.asset', string="Asset", required=True,
                            ondelete='restrict', index=True, tracking=True)
wallet_id = fields.Many2one('solar.wallet', string="Destination wallet", required=True,
                             domain="[('partner_id','=',partner_id),('state','=','active')]")
cells_requested = fields.Integer(string="Cells requested", required=True, tracking=True)
unit_price = fields.Monetary(string="Unit price",
                              currency_field='currency_id', required=True)
total_amount = fields.Monetary(string="Total amount",
                                currency_field='currency_id',
                                compute='_compute_total_amount', store=True)
fees_amount = fields.Monetary(string="Fees",
                               currency_field='currency_id',
                               compute='_compute_fees', store=True)
total_charged = fields.Monetary(string="Total charged",
                                 currency_field='currency_id',
                                 compute='_compute_total_charged', store=True)
currency_id = fields.Many2one('res.currency', string="Currency", required=True,
                               related='asset_id.currency_id', store=True)
state = fields.Selection([
    ('draft',           'Draft'),
    ('pending_payment', 'Pending payment'),
    ('paid',            'Paid'),
    ('settling',        'Settling on-chain'),
    ('settled',         'Settled'),
    ('failed',          'Failed'),
    ('cancelled',       'Cancelled'),
    ('expired',         'Expired'),
], string="State", default='draft', required=True, tracking=True, index=True)
created_at = fields.Datetime(default=fields.Datetime.now, required=True, copy=False)
expires_at = fields.Datetime(string="Expires at",
                              default=lambda self: fields.Datetime.now() + timedelta(minutes=30))
paid_at = fields.Datetime(copy=False)
settled_at = fields.Datetime(copy=False)
failed_at = fields.Datetime(copy=False)
failure_reason = fields.Text(copy=False)
payment_transaction_id = fields.Many2one('solar.payment.transaction',
                                          string="Payment", copy=False)
holding_id = fields.Many2one('solar.holding', string="Created/updated holding",
                              copy=False, readonly=True)
on_chain_tx_hash = fields.Char(string="On-chain TX hash", copy=False)
on_chain_settled_at = fields.Datetime(copy=False)
active = fields.Boolean(default=True)
```

### 4.3 Relations

| Field | Type | Target |
|-------|------|--------|
| `partner_id` | Many2one | `res.partner` |
| `asset_id` | Many2one | `solar.asset` |
| `wallet_id` | Many2one | `solar.wallet` |
| `payment_transaction_id` | Many2one | `solar.payment.transaction` |
| `holding_id` | Many2one | `solar.holding` |

### 4.4 State transitions

```
draft → pending_payment      (action_submit, after S12 confirmation)
draft → cancelled            (action_cancel, by investor)
draft → expired              (cron, after expires_at)
pending_payment → paid       (action_register_payment, on Stripe webhook)
pending_payment → failed     (action_mark_failed, on payment failure)
pending_payment → expired    (cron)
paid → settling              (auto, after stablecoin conversion)
settling → settled           (action_mark_settled, after on-chain tx)
settling → failed            (action_mark_failed, on on-chain failure)
failed → pending_payment     (action_retry, by support)
failed → cancelled           (action_cancel, definitive)
```

### 4.5 Workflows

```python
@api.depends('cells_requested', 'unit_price')
def _compute_total_amount(self):
    """cells_requested × unit_price."""

@api.depends('total_amount')
def _compute_fees(self):
    """Apply fee schedule (default 1.5 %)."""

@api.depends('total_amount', 'fees_amount')
def _compute_total_charged(self):
    """total_amount + fees_amount."""

def action_submit(self):
    """draft → pending_payment. Validates KYC, cell availability, wallet state.
       Creates the payment_transaction (Stripe Payment Intent)."""

def action_register_payment(self, payment_transaction_id):
    """pending_payment → paid. Called by Payment Service on webhook."""

def action_settle_on_chain(self):
    """paid → settling → settled.
       Triggers SolarToken.mint() via Tempo Adapter.
       Updates or creates the holding."""

def action_mark_settled(self, tx_hash):
    """settling → settled. Stores tx_hash, updates holding, fires audit event."""

def action_cancel(self):
    """Cancel and trigger refund if payment was received."""

def action_retry(self):
    """failed → pending_payment (only if failure happened in payment step)."""

@api.constrains('partner_id', 'state')
def _check_kyc_validated_at_submit(self):
    """state != draft requires partner KYC validated."""

@api.constrains('asset_id', 'cells_requested')
def _check_cells_available(self):
    """cells_requested ≤ asset.cells_available at the moment of submit."""
```

**Automated actions :**
- `Cron: Expire pending orders` — toutes les 5 minutes, passe en `expired` les orders
  `draft` ou `pending_payment` au-delà de `expires_at`.

### 4.6 Security

```csv
access_solar_investment_order_investor,solar.investment.order.investor,model_solar_investment_order,solar_core.group_investor,1,1,1,0
access_solar_investment_order_manager,solar.investment.order.manager,model_solar_investment_order,solar_core.group_compliance,1,1,0,0
access_solar_investment_order_api,solar.investment.order.api,model_solar_investment_order,solar_core.group_api,1,1,1,0
```

```xml
<record id="rule_investment_order_own" model="ir.rule">
    <field name="name">Investors see only their own orders</field>
    <field name="model_id" ref="model_solar_investment_order"/>
    <field name="groups" eval="[(4, ref('solar_core.group_investor'))]"/>
    <field name="domain_force">[('partner_id.user_ids', 'in', [user.id])]</field>
</record>
```

### 4.7 Vues

**Tree :**

```xml
<tree decoration-success="state == 'settled'"
      decoration-warning="state in ['pending_payment','paid','settling']"
      decoration-danger="state == 'failed'"
      decoration-muted="state in ['cancelled','expired']">
    <field name="name"/>
    <field name="partner_id"/>
    <field name="asset_id"/>
    <field name="cells_requested"/>
    <field name="total_charged"/>
    <field name="created_at"/>
    <field name="state" widget="badge"/>
</tree>
```

**Form, Kanban (par `state`), Search** — voir patterns de `solar.asset`.

### 4.8 Menus

```xml
<menuitem id="menu_solar_investment" name="Investment Orders"
          parent="menu_solar_root" sequence="30"/>

<menuitem id="menu_solar_investment_pending" name="Pending"
          parent="menu_solar_investment" sequence="10"
          action="action_solar_investment_pending"/>

<menuitem id="menu_solar_investment_all" name="All orders"
          parent="menu_solar_investment" sequence="20"
          action="action_solar_investment_all"/>
```

### 4.9 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `create_order` | order uuid + payment intent client_secret | Page S10/S11 |
| `confirm_order` | bool | Webhook Stripe |
| `get_my_orders` | List[Dict] | Historique investisseur |
| `cancel_order` | bool | Bouton Annuler |

---

## 5. `solar.payment.transaction` — Transaction de paiement

### 5.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.payment.transaction` |
| **`_description`** | `Payment transaction (inbound or outbound)` |
| **`_inherit`** | `['mail.thread']` |
| **`_order`** | `created_at desc` |
| **Addon** | `solar_payment` |

### 5.2 Fields

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
name = fields.Char(default=lambda self: self.env['ir.sequence'].next_by_code('solar.payment.transaction'))
partner_id = fields.Many2one('res.partner', required=True, index=True, ondelete='restrict')
direction = fields.Selection([
    ('inbound',  'Inbound (money in)'),
    ('outbound', 'Outbound (money out)'),
], required=True, tracking=True, index=True)
transaction_type = fields.Selection([
    ('subscription',       'Investment subscription'),
    ('marketplace_buy',    'Marketplace buy'),
    ('top_up',             'Account top-up'),
    ('onboarding_fee',     'Onboarding fee'),
    ('management_fee',     'Management fee charge'),
    ('yield_distribution', 'Yield distribution payout'),
    ('marketplace_sale',   'Marketplace sale payout'),
    ('withdrawal',         'Withdrawal'),
    ('refund',             'Refund'),
], required=True, tracking=True, index=True)
payment_method = fields.Selection([
    ('sepa',       'SEPA transfer'),
    ('card',       'Card (Visa/MC)'),
    ('stablecoin', 'Stablecoin'),
], tracking=True)
fiat_amount = fields.Monetary(required=True, currency_field='currency_id', tracking=True)
currency_id = fields.Many2one('res.currency', required=True,
                               default=lambda self: self.env.ref('base.EUR'))
stablecoin_amount = fields.Float(digits=(20, 6))
stablecoin_type = fields.Selection([
    ('EURC',  'EURC'),
    ('USDC',  'USDC'),
    ('EURCV', 'EURCV'),
])
stripe_intent_id = fields.Char(copy=False, index=True)
stripe_charge_id = fields.Char(copy=False)
stripe_payout_id = fields.Char(copy=False, index=True)
bridge_conversion_id = fields.Char(copy=False)
iban_used = fields.Char(string="IBAN (frozen at payout time)")
state = fields.Selection([
    ('initiated',  'Initiated'),
    ('processing', 'Processing'),
    ('succeeded',  'Succeeded'),
    ('failed',     'Failed'),
    ('refunded',   'Refunded'),
    ('cancelled',  'Cancelled'),
], default='initiated', required=True, tracking=True, index=True)
initiated_at = fields.Datetime(default=fields.Datetime.now, required=True)
processing_at = fields.Datetime()
succeeded_at = fields.Datetime()
failed_at = fields.Datetime()
failure_reason = fields.Text()
# Links
linked_order_id = fields.Many2one('solar.investment.order',
                                    string="Linked investment order")
linked_trade_id = fields.Many2one('solar.market.trade',
                                    string="Linked marketplace trade")
linked_yield_line_ids = fields.One2many('solar.yield.line',
                                          'payment_transaction_id')
metadata = fields.Json(default=dict)
```

### 5.3 State transitions

```
initiated → processing   (action_mark_processing, on provider response)
processing → succeeded   (action_mark_succeeded, on webhook)
processing → failed      (action_mark_failed)
succeeded → refunded     (action_refund)
initiated → cancelled    (action_cancel)
```

### 5.4 Workflows

```python
def action_mark_processing(self):
    """initiated → processing."""

def action_mark_succeeded(self):
    """processing → succeeded. Triggers downstream actions:
       - if linked_order_id, call action_register_payment on the order
       - if outbound yield_distribution, mark linked yield_lines as paid"""

def action_mark_failed(self, reason):
    """processing → failed. Stores reason. Notifies linked entities."""

def action_refund(self):
    """succeeded → refunded. Creates a refund transaction (Stripe Refund)."""
```

### 5.5 Security & vues

Standard (voir patterns ci-dessus). Investisseurs voient leurs propres transactions.

### 5.6 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `handle_stripe_webhook` | bool | Webhook handler |
| `handle_bridge_webhook` | bool | Webhook handler |
| `get_my_transactions` | List[Dict] | Historique investisseur |

---

## 6. `solar.market.order` — Offre de marché secondaire

### 6.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.market.order` |
| **`_description`** | `Secondary marketplace sell order` |
| **`_inherit`** | `['mail.thread']` |
| **Addon** | `solar_market` |

### 6.2 Fields

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
name = fields.Char(default=lambda self: self.env['ir.sequence'].next_by_code('solar.market.order'))
seller_id = fields.Many2one('res.partner', required=True, ondelete='restrict',
                             tracking=True, index=True)
asset_id = fields.Many2one('solar.asset', required=True, ondelete='restrict',
                            tracking=True, index=True)
cells_offered = fields.Integer(required=True, tracking=True)
cells_remaining = fields.Integer(compute='_compute_cells_remaining', store=True)
price_per_cell = fields.Monetary(required=True, currency_field='currency_id', tracking=True)
total_amount = fields.Monetary(compute='_compute_total_amount', store=True,
                                currency_field='currency_id')
currency_id = fields.Many2one(related='asset_id.currency_id', store=True)
state = fields.Selection([
    ('draft',             'Draft'),
    ('published',         'Published'),
    ('partially_filled',  'Partially filled'),
    ('filled',            'Filled'),
    ('cancelled',         'Cancelled'),
    ('expired',           'Expired'),
], default='draft', required=True, tracking=True, index=True)
published_at = fields.Datetime()
expires_at = fields.Datetime(default=lambda self: fields.Datetime.now() + timedelta(days=30))
cancelled_at = fields.Datetime()
cancellation_reason = fields.Text()
trade_ids = fields.One2many('solar.market.trade', 'market_order_id', string="Trades")
geo_restriction_country_ids = fields.Many2many(
    'res.country', 'solar_market_order_geo_rel',
    help="Inherited from asset, overridable.")
```

### 6.3 State transitions

```
draft → published          (action_publish)
draft → cancelled
published → partially_filled (auto when first partial trade)
published → filled         (auto when remaining == 0)
published → cancelled      (action_cancel, only if no trade yet)
published → expired        (cron)
partially_filled → filled
partially_filled → cancelled (action_cancel_remaining)
partially_filled → expired
```

### 6.4 Workflows

```python
def action_publish(self):
    """draft → published. Verifies seller KYC, holding cells available."""

def action_cancel(self):
    """Cancel offer. Cannot be called if there are settled trades."""

@api.depends('cells_offered', 'trade_ids.cells_traded', 'trade_ids.state')
def _compute_cells_remaining(self):
    """cells_offered minus sum of settled trades."""

@api.constrains('seller_id', 'asset_id', 'cells_offered')
def _check_seller_has_enough_cells(self):
    """At publish time, seller's holding must have ≥ cells_offered."""
```

**Cron :** `Expire market orders` — quotidien.

### 6.5 Security, vues, menus — standards.

### 6.6 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `create_market_order` | uuid | S18 Transfers — créer une offre |
| `cancel_market_order` | bool | |
| `list_marketplace_offers` | List[Dict] | Frontend marketplace |

---

## 7. `solar.market.trade` — Exécution de cession

### 7.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.market.trade` |
| **`_description`** | `Secondary marketplace trade execution` |
| **`_inherit`** | `['mail.thread']` |
| **Addon** | `solar_market` |

### 7.2 Fields

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
name = fields.Char(default=lambda self: self.env['ir.sequence'].next_by_code('solar.market.trade'))
market_order_id = fields.Many2one('solar.market.order', required=True,
                                    ondelete='restrict', index=True)
seller_id = fields.Many2one('res.partner', required=True, ondelete='restrict')
buyer_id = fields.Many2one('res.partner', required=True, ondelete='restrict')
asset_id = fields.Many2one('solar.asset', required=True)
cells_traded = fields.Integer(required=True, tracking=True)
price_per_cell = fields.Monetary(required=True, currency_field='currency_id')
gross_amount = fields.Monetary(compute='_compute_amounts', store=True,
                                currency_field='currency_id')
platform_fees = fields.Monetary(compute='_compute_amounts', store=True,
                                 currency_field='currency_id')
net_to_seller = fields.Monetary(compute='_compute_amounts', store=True,
                                 currency_field='currency_id')
currency_id = fields.Many2one(related='asset_id.currency_id', store=True)
state = fields.Selection([
    ('pending',   'Pending validations'),
    ('validated', 'Validated'),
    ('settling',  'Settling on-chain'),
    ('settled',   'Settled'),
    ('failed',    'Failed'),
    ('cancelled', 'Cancelled'),
], default='pending', required=True, tracking=True, index=True)
whitelist_check_passed = fields.Boolean(default=False)
whitelist_check_at = fields.Datetime()
kyc_check_passed = fields.Boolean(default=False)
geo_check_passed = fields.Boolean(default=False)
on_chain_tx_hash = fields.Char(copy=False)
settled_at = fields.Datetime()
failed_at = fields.Datetime()
failure_reason = fields.Text()
payment_transaction_buyer_id = fields.Many2one('solar.payment.transaction',
                                                 string="Buyer payment (inbound)")
payment_transaction_seller_id = fields.Many2one('solar.payment.transaction',
                                                  string="Seller payout (outbound)")
```

### 7.3 State transitions

```
pending → validated   (after all *_check_passed = True)
pending → cancelled   (any check failed)
validated → settling  (action_initiate_settlement)
settling → settled    (action_mark_settled)
settling → failed     (action_mark_failed)
failed → settling     (action_retry)
failed → cancelled
```

### 7.4 Workflows

```python
def action_run_checks(self):
    """Runs whitelist, KYC, geo checks. Sets _check_passed booleans.
       If all pass, transition to validated."""

def action_initiate_settlement(self):
    """validated → settling. Calls SolarToken.transfer() via Tempo Adapter.
       Initiates buyer payment + seller payout."""

def action_mark_settled(self, tx_hash):
    """settling → settled. Updates buyer + seller holdings atomically."""

@api.depends('cells_traded', 'price_per_cell')
def _compute_amounts(self):
    """gross_amount, platform_fees (0.5 %), net_to_seller."""
```

### 7.5 Security, vues, menus — standards.

### 7.6 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `accept_market_order` | trade uuid | Acheteur clique "Acheter" sur une offre |
| `get_my_trade_history` | List[Dict] | Historique cessions |

---

## 8. `solar.yield.distribution` — Distribution de revenus

### 8.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.yield.distribution` |
| **`_description`** | `Periodic yield distribution per asset` |
| **`_inherit`** | `['mail.thread', 'mail.activity.mixin']` |
| **Addon** | `solar_yield` |

### 8.2 Fields (modèle parent)

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
name = fields.Char(compute='_compute_name', store=True)
asset_id = fields.Many2one('solar.asset', required=True, ondelete='restrict',
                            tracking=True, index=True)
period_start = fields.Date(required=True, tracking=True)
period_end = fields.Date(required=True, tracking=True)
gross_revenue = fields.Monetary(required=True, currency_field='currency_id', tracking=True)
operational_costs = fields.Monetary(default=0, currency_field='currency_id')
platform_management_fees = fields.Monetary(default=0, currency_field='currency_id')
withholding_tax_total = fields.Monetary(default=0, currency_field='currency_id')
net_distributable = fields.Monetary(compute='_compute_net_distributable',
                                      store=True, currency_field='currency_id')
total_cells_at_period_end = fields.Integer(required=True)
amount_per_cell = fields.Monetary(compute='_compute_amount_per_cell',
                                    store=True, currency_field='currency_id')
currency_id = fields.Many2one(related='asset_id.currency_id', store=True)
state = fields.Selection([
    ('draft',      'Draft'),
    ('calculated', 'Calculated'),
    ('validated',  'Validated'),
    ('executing',  'Executing on-chain'),
    ('completed',  'Completed'),
    ('failed',     'Failed'),
    ('cancelled',  'Cancelled'),
], default='draft', required=True, tracking=True, index=True)
calculated_at = fields.Datetime()
validated_at = fields.Datetime()
validated_by = fields.Many2one('res.users', string="Validated by")
executed_at = fields.Datetime()
on_chain_tx_hash = fields.Char(copy=False)
line_ids = fields.One2many('solar.yield.line', 'distribution_id', string="Lines")
```

### 8.3 Modèle enfant `solar.yield.line`

```python
class SolarYieldLine(models.Model):
    _name = 'solar.yield.line'
    _description = 'Yield distribution line per investor'
    _inherit = ['mail.thread']

    uuid = fields.Char(...)
    distribution_id = fields.Many2one('solar.yield.distribution', required=True,
                                        ondelete='cascade', index=True)
    partner_id = fields.Many2one('res.partner', required=True, index=True)
    holding_id = fields.Many2one('solar.holding', required=True)
    cells_held_at_snapshot = fields.Integer(required=True)
    gross_amount = fields.Monetary(required=True, currency_field='currency_id')
    management_fees = fields.Monetary(default=0, currency_field='currency_id')
    withholding_tax = fields.Monetary(default=0, currency_field='currency_id')
    net_amount = fields.Monetary(compute='_compute_net', store=True,
                                  currency_field='currency_id')
    currency_id = fields.Many2one(related='distribution_id.currency_id', store=True)
    state = fields.Selection([
        ('pending',     'Pending'),
        ('paid',        'Paid to bank'),
        ('reinvested',  'Reinvested'),
        ('cancelled',   'Cancelled'),
        ('failed',      'Failed'),
    ], default='pending', required=True, tracking=True, index=True)
    payment_transaction_id = fields.Many2one('solar.payment.transaction',
                                              string="Payout transaction")
    reinvest_order_id = fields.Many2one('solar.investment.order',
                                          string="Reinvestment order")
    on_chain_tx_hash = fields.Char()
```

### 8.4 State transitions (distribution)

```
draft → calculated         (action_calculate)
calculated → validated     (action_validate)
calculated → draft         (action_recalculate)
validated → executing      (action_execute)
executing → completed      (auto when all lines paid/reinvested)
executing → failed         (on chain error)
failed → executing         (action_retry)
any → cancelled            (action_cancel, exceptional)
```

### 8.5 Workflows

```python
def action_calculate(self):
    """draft → calculated.
       For each active holding on asset_id:
       - snapshot cells_held at period_end
       - create solar.yield.line with prorated gross_amount
       Computes net_distributable and amount_per_cell."""

def action_validate(self):
    """calculated → validated. Requires compliance approval.
       Sets validated_at and validated_by."""

def action_execute(self):
    """validated → executing. Calls YieldDistributor smart contract.
       For each line:
       - if reinvest_enabled on holding → create solar.investment.order
       - else → create solar.payment.transaction (outbound)"""
```

**Cron :** `Compute periodic distributions` — selon `distribution_frequency` de chaque actif.

### 8.6 Security

Distributions visibles aux investisseurs en lecture (leurs propres lignes uniquement).
Validation et exécution réservées à `solar_core.group_finance`.

### 8.7 Vues, menus — standards.

### 8.8 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `get_my_yield_history` | List[Dict] | Page S17 Rendement |
| `get_yield_projections` | Dict | Projections portefeuille |

---

## 9. `solar.kyc.case` — Cas KYC

### 9.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.kyc.case` |
| **`_description`** | `KYC case (aggregator)` |
| **`_inherit`** | `['mail.thread', 'mail.activity.mixin']` |
| **Addon** | `solar_kyc` |
| **Sous-modèles** | `solar.kyc.document`, `solar.kyc.decision` |

### 9.2 Fields

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
name = fields.Char(compute='_compute_name', store=True)  # ex. "KYC-2025-00042"
partner_id = fields.Many2one('res.partner', required=True, ondelete='restrict',
                              tracking=True, index=True)
state = fields.Selection([
    ('not_started',  'Not started'),
    ('in_progress',  'In progress'),
    ('submitted',    'Submitted'),
    ('under_review', 'Under review'),
    ('validated',    'Validated'),
    ('rejected',     'Rejected'),
    ('expired',      'Expired'),
    ('suspended',    'Suspended'),
], default='not_started', required=True, tracking=True, index=True)
level = fields.Selection([
    ('L1', 'L1 (Basic)'),
    ('L2', 'L2 (Standard)'),
    ('L3', 'L3 (Enhanced)'),
    ('L4', 'L4 (Institutional)'),
], tracking=True)
level_required = fields.Selection(related='level', store=True)  # could be computed differently
provider = fields.Selection([
    ('onfido', 'Onfido'),
    ('sumsub', 'Sumsub'),
    ('veriff', 'Veriff'),
    ('manual', 'Manual'),
], default='onfido', tracking=True)
provider_case_id = fields.Char(copy=False, index=True)
risk_score = fields.Float(digits=(5, 2), tracking=True)
pep_status = fields.Boolean(default=False, tracking=True)
pep_details = fields.Text()
sanctions_check_at = fields.Datetime()
submitted_at = fields.Datetime()
validated_at = fields.Datetime(tracking=True)
expires_at = fields.Datetime(tracking=True)
rejected_at = fields.Datetime()
rejection_reason = fields.Text()
document_ids = fields.One2many('solar.kyc.document', 'case_id', string="Documents")
decision_ids = fields.One2many('solar.kyc.decision', 'case_id', string="Decisions")
```

### 9.3 Modèle enfant `solar.kyc.document`

```python
class SolarKycDocument(models.Model):
    _name = 'solar.kyc.document'
    _description = 'KYC document'

    uuid = fields.Char(...)
    case_id = fields.Many2one('solar.kyc.case', required=True,
                                ondelete='cascade', index=True)
    document_type = fields.Selection([
        ('identity_card',     'National ID'),
        ('passport',          'Passport'),
        ('driving_licence',   'Driving licence'),
        ('selfie_liveness',   'Selfie + liveness'),
        ('proof_of_address',  'Proof of address'),
        ('source_of_funds',   'Source of funds'),
        ('bank_statement',    'Bank statement'),
        ('tax_residency',     'Tax residency'),
        ('corporate_kbis',    'K-bis / extract'),
        ('corporate_statutes','Statutes (corp.)'),
        ('corporate_ubo',     'UBO declaration'),
        ('other',             'Other'),
    ], required=True)
    minio_path = fields.Char(required=True)
    sha256_hash = fields.Char(required=True)
    mime_type = fields.Char()
    file_size_bytes = fields.Integer()
    uploaded_at = fields.Datetime(default=fields.Datetime.now, required=True)
    state = fields.Selection([
        ('pending',   'Pending'),
        ('validated', 'Validated'),
        ('rejected',  'Rejected'),
        ('expired',   'Expired'),
    ], default='pending', required=True)
    provider_document_id = fields.Char()
    validation_result = fields.Json()
    rejection_reason = fields.Text()
```

### 9.4 Modèle enfant `solar.kyc.decision` (immuable)

```python
class SolarKycDecision(models.Model):
    _name = 'solar.kyc.decision'
    _description = 'KYC decision (immutable audit trail)'
    _order = 'decision_at desc'

    uuid = fields.Char(...)
    case_id = fields.Many2one('solar.kyc.case', required=True,
                                ondelete='restrict', index=True)
    decision = fields.Selection([
        ('approved',          'Approved'),
        ('rejected',          'Rejected'),
        ('escalated',         'Escalated'),
        ('renewal_required',  'Renewal required'),
    ], required=True)
    kyc_level = fields.Selection([('L1','L1'),('L2','L2'),('L3','L3'),('L4','L4')])
    decision_at = fields.Datetime(default=fields.Datetime.now, required=True)
    decided_by = fields.Many2one('res.users')
    decision_source = fields.Selection([
        ('automatic', 'Automatic rule'),
        ('manual',    'Manual'),
        ('provider',  'Provider decision'),
    ], required=True)
    decision_reason = fields.Text()
    previous_state = fields.Char()
    new_state = fields.Char(required=True)
    document_ids = fields.Many2many('solar.kyc.document')

    def write(self, vals):
        raise UserError(_("KYC decisions are immutable."))
    def unlink(self):
        raise UserError(_("KYC decisions cannot be deleted."))
```

### 9.5 State transitions (case)

```
not_started → in_progress     (when first document uploaded)
in_progress → submitted       (action_submit, all required docs uploaded)
submitted → under_review      (provider returns "manual review")
submitted → validated         (provider returns "approved")
under_review → validated      (action_approve_manually)
under_review → rejected       (action_reject)
validated → expired           (cron, after expires_at)
validated → suspended         (action_suspend, by compliance)
expired → in_progress         (renewal flow)
rejected → in_progress        (after manual review allows retry)
```

### 9.6 Workflows

```python
def action_submit(self):
    """in_progress → submitted. Validates all required docs uploaded.
       Triggers provider verification call."""

def action_approve(self):
    """Any non-final → validated. Sets validated_at, expires_at.
       Creates solar.kyc.decision (approved).
       Triggers wallet creation if first validation."""

def action_reject(self, reason):
    """Sets rejected_at. Creates decision (rejected)."""

def action_escalate(self):
    """submitted → under_review. Creates activity for compliance officer."""

def action_renew(self):
    """expired → in_progress. New documents required."""

@api.constrains('partner_id')
def _check_one_case_per_partner(self):
    """Unique constraint: one active case per partner."""
```

**Cron :** `Expire KYC cases` — quotidien, transitions vers `expired`.

### 9.7 Security

```csv
access_solar_kyc_case_investor_self,solar.kyc.case.investor,model_solar_kyc_case,solar_core.group_investor,1,0,0,0
access_solar_kyc_case_kyc_op,solar.kyc.case.kyc,model_solar_kyc_case,solar_kyc.group_kyc_operator,1,1,1,0
access_solar_kyc_case_compliance,solar.kyc.case.compliance,model_solar_kyc_case,solar_core.group_compliance,1,1,1,1
access_solar_kyc_case_api,solar.kyc.case.api,model_solar_kyc_case,solar_core.group_api,1,1,1,0
```

### 9.8 Vues

**Kanban (par `state`)** : crucial pour l'opérateur KYC.

### 9.9 Menus

```xml
<menuitem id="menu_solar_kyc_root" name="KYC / Compliance"
          parent="menu_solar_root" sequence="40"/>

<menuitem id="menu_solar_kyc_pending" name="Pending review"
          parent="menu_solar_kyc_root" sequence="10"
          action="action_solar_kyc_pending"/>

<menuitem id="menu_solar_kyc_all_cases" name="All cases"
          parent="menu_solar_kyc_root" sequence="20"
          action="action_solar_kyc_cases"/>

<menuitem id="menu_solar_kyc_expiring" name="Expiring soon"
          parent="menu_solar_kyc_root" sequence="30"
          action="action_solar_kyc_expiring"/>
```

### 9.10 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `start_kyc` | case uuid | Démarrage tunnel KYC S04 |
| `submit_personal_info` | bool | S04 |
| `upload_document` | document uuid + signed URL | S05, S07, S24 |
| `submit_for_review` | bool | S25 |
| `get_my_kyc_status` | Dict | Tableau de bord |

---

## 10. `solar.audit.log` — Journal d'audit

### 10.1 Identité

| Propriété | Valeur |
|-----------|--------|
| **`_name`** | `solar.audit.log` |
| **`_description`** | `Append-only audit log` |
| **`_inherit`** | `[]` (pas de chatter, c'est un log) |
| **`_order`** | `timestamp desc` |
| **Addon** | `solar_audit` |
| **Retention** | 10 ans |

### 10.2 Fields

```python
uuid = fields.Char(required=True, copy=False, readonly=True, index=True,
                   default=lambda self: str(uuid.uuid4()))
timestamp = fields.Datetime(default=fields.Datetime.now, required=True,
                             index=True, readonly=True)
actor_type = fields.Selection([
    ('user',       'Internal user'),
    ('partner',    'Investor / Partner'),
    ('system',     'System (cron, automated)'),
    ('api_client', 'API client'),
], required=True, readonly=True)
actor_id = fields.Integer(readonly=True)
actor_name = fields.Char(readonly=True,
                          help="Denormalised to survive deletion of the actor record.")
action_code = fields.Char(required=True, readonly=True, index=True,
                           help="e.g. kyc.validated, investment.settled")
subject_model = fields.Char(required=True, readonly=True, index=True)
subject_id = fields.Integer(required=True, readonly=True, index=True)
subject_uuid = fields.Char(readonly=True, index=True)
before_state = fields.Json(readonly=True)
after_state = fields.Json(readonly=True)
request_ip = fields.Char(readonly=True)
request_user_agent = fields.Char(readonly=True)
request_trace_id = fields.Char(readonly=True, index=True)
redis_event_id = fields.Char(readonly=True, index=True)
on_chain_tx_hash = fields.Char(readonly=True)
```

### 10.3 Cycle de vie

Aucun. Modèle append-only.

### 10.4 Méthodes

```python
@api.model
def create_audit_entry(self, action_code, subject, before=None, after=None,
                       request_metadata=None):
    """Unique point d'entrée pour créer un log. Toutes les autres méthodes
    de création (create()) sont désactivées via override."""

@api.model_create_multi
def create(self, vals_list):
    """Override pour forcer le passage par create_audit_entry()."""
    raise UserError(_("Use create_audit_entry() instead of create()."))

def write(self, vals):
    """Append-only: write is forbidden."""
    raise UserError(_("Audit logs are immutable."))

def unlink(self):
    """Append-only: unlink is forbidden (except via dedicated retention purge)."""
    if not self.env.context.get('audit_retention_purge'):
        raise UserError(_("Audit logs cannot be deleted."))
    return super().unlink()
```

### 10.5 Security

```csv
access_solar_audit_log_compliance,solar.audit.log.compliance,model_solar_audit_log,solar_core.group_compliance,1,0,0,0
access_solar_audit_log_admin,solar.audit.log.admin,model_solar_audit_log,base.group_system,1,0,0,0
access_solar_audit_log_api_write,solar.audit.log.api,model_solar_audit_log,solar_core.group_api,0,0,1,0
```

> Note : pas d'accès `write` pour personne. Seul l'API peut `create`.
> La lecture est restreinte à compliance et admin.

### 10.6 Vues — Tree + Search

```xml
<tree create="false" edit="false" delete="false">
    <field name="timestamp"/>
    <field name="actor_type"/>
    <field name="actor_name"/>
    <field name="action_code"/>
    <field name="subject_model"/>
    <field name="subject_uuid"/>
</tree>
```

### 10.7 Menus

```xml
<menuitem id="menu_solar_audit_root" name="Audit"
          parent="menu_solar_root" sequence="90"
          groups="solar_core.group_compliance,base.group_system"/>

<menuitem id="menu_solar_audit_log" name="Audit log"
          parent="menu_solar_audit_root" sequence="10"
          action="action_solar_audit_log"/>
```

### 10.8 Méthodes JSON-RPC

| Méthode | Returns | Usage |
|---------|---------|-------|
| `search_read` (standard, restreint compliance) | List | Inspection ad hoc |
| `export_for_subject` | URL signed (MinIO) | Export pour audit réglementaire |
| `export_for_period` | URL signed | Export annuel |

---

## 11. Récapitulatif — Mapping addons / modèles

| Addon | Modèles principaux | Modèles enfants | Dépendances |
|-------|-------------------|----------------|-------------|
| `solar_audit` | `solar.audit.log` | — | (aucune) |
| `solar_core` | `res.partner` (ext.) | groupes de sécurité, séquences | `solar_audit` |
| `solar_kyc` | `solar.kyc.case` | `solar.kyc.document`, `solar.kyc.decision` | `solar_core` |
| `solar_wallet` | `solar.wallet` | — | `solar_core` |
| `solar_asset` | `solar.asset` | `solar.asset.document` | `solar_core` |
| `solar_holding` | `solar.holding` | — | `solar_asset`, `solar_wallet` |
| `solar_payment` | `solar.payment.transaction` | — | `solar_core` |
| `solar_investment` | `solar.investment.order` | — | `solar_payment`, `solar_holding` |
| `solar_market` | `solar.market.order`, `solar.market.trade` | — | `solar_holding`, `solar_payment` |
| `solar_yield` | `solar.yield.distribution` | `solar.yield.line` | `solar_holding`, `solar_payment` |
| `solar_compliance` | `solar.aml.alert` | `solar.sanction.check` | `solar_kyc` |

**Total : 11 addons, 13 modèles principaux + 5 enfants = 18 tables Odoo.**

---

## 12. Prochaines étapes

### 12.1 Avant codage

1. Valider ce document avec les développeurs Odoo.
2. Trancher les questions ouvertes restantes du `00-overview.md` §15.

### 12.2 Ordre d'implémentation des addons

```
1. solar_audit               (1 jour)
2. solar_core (minimal)       (2 jours)
3. solar_kyc                  (3 jours)
4. solar_wallet               (2 jours)
5. solar_core (relations)     (1 jour)
6. solar_asset                (3 jours)
7. solar_holding              (2 jours)
8. solar_payment              (3 jours)
9. solar_investment           (3 jours)
10. solar_market              (3 jours)
11. solar_yield               (4 jours)
12. solar_compliance          (3 jours)
```

**Effort total estimé : ~30 jours-développeur Odoo + tests.**

### 12.3 Tests

Chaque addon DOIT avoir :
- `tests/test_<entity>.py` héritant de `TransactionCase`
- Couverture minimale : création, transitions d'état, contraintes, permissions

---

*Document vivant — v1.0.0 du 24 mai 2025.*
*Toute modification : commit `docs: update odoo-mdd vX.Y.Z`.*
*Compatible Claude Code / Codex / GitHub Spec Kit.*
