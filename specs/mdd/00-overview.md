---
document: mdd-overview
version: 2.1.0
status: draft
classification: interne — confidentiel
supersedes: 2.0.0
applies-to: odoo-addons
based-on:
  - product-spec.md v2.0
  - .specify/odoo-rules.md v1.1
last-updated: 2025-05
authors: [architecture]
changelog-v2-1:
  - all 12 open questions arbitrated (§15)
  - asset cancellation workflow documented (§15.2)
  - late payment handling documented (§15.3)
  - GDPR / AMLD6 retention workflow documented (§15.4)
changelog-v2-0:
  - naming: passage de sc.* à solar.* sur l'ensemble des modèles
  - new entity: solar.wallet extrait de res.partner (modèle dédié)
  - new entity: solar.investment.order (ordre de souscription explicite)
  - restructure: KYC découpé en case (agrégateur) + document + decision
  - merge: solar.payment.transaction unifie inbound (sc.payment) et outbound (sc.payout)
  - count: 13 entités → 15 entités
---

# MDD — Modèle de Données Détaillé — Vue d'ensemble (v2.0)

> **Document de référence des entités métier de SolarCells RWA.**
> Source de vérité pour toute implémentation Odoo dans `odoo-addons/`.

---

## 0. Changements depuis v1.0

Cette version intègre les décisions d'architecture suivantes :

| Décision | Justification |
|----------|---------------|
| **Naming `solar.*`** (au lieu de `sc.*`) | Convention Odoo standard (`account.*`, `stock.*`, `hr.*`). Plus lisible dans les vues XML et logs. |
| **Extension `res.partner` conservée pour l'investisseur** | RULE-OO-08 maintenue : héritage > création. L'investisseur réutilise gratuitement CRM/comptabilité/mail Odoo. |
| **`solar.wallet` extrait en modèle dédié** | Cycle de vie propre, provider IDs distincts, surveillance dédiée. Les champs `x_wallet_*` sur `res.partner` deviennent une relation. |
| **`solar.investment.order` ajouté** | L'acte de souscription a un cycle de vie autonome (intention → paiement → exécution) qui ne se réduit pas à un payment + holding. |
| **KYC restructuré en 3 modèles** | `solar.kyc.case` = agrégateur (1 par investisseur), `solar.kyc.document` et `solar.kyc.decision` = enfants. |
| **`solar.payment.transaction` unifié** | Un seul modèle pour les flux entrants et sortants, avec champ `direction`. Simplifie la réconciliation. |

> Aucun amendement de la constitution `.specify/` n'a été nécessaire.

---

## 1. Conventions de modélisation

### 1.1 Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Modèle Odoo natif étendu | `_inherit` | `_inherit = 'res.partner'` |
| Nouveau modèle métier | `solar.<entity>[.<subentity>]` | `solar.asset`, `solar.market.order` |
| Module Odoo | `solar_<bounded_context>` | `solar_core`, `solar_market` |
| Champ custom sur modèle natif | Préfixe `x_` | `x_kyc_case_id` sur `res.partner` |
| Champ sur nouveau modèle `solar.*` | Pas de préfixe | `state`, `cells_owned` |
| Many2one | Suffixe `_id` | `partner_id`, `asset_id` |
| One2many / Many2many | Suffixe `_ids` | `holding_ids` |
| Booléen | Préfixe `is_` ou `has_` | `is_active` |
| Datetime | Suffixe `_at` | `created_at` |
| Date (sans heure) | Suffixe `_date` | `commissioning_date` |

### 1.2 Bounded contexts et addons Odoo

Un **bounded context** = un **addon Odoo** = un dossier sous `odoo-addons/`.
Cette règle garantit l'évolutivité et permet d'activer/désactiver des fonctionnalités.

| Bounded context | Addon | Modèles contenus |
|----------------|-------|------------------|
| **Core** | `solar_core` | Extension `res.partner`, groupes de sécurité, paramétrage global |
| **Wallet** | `solar_wallet` | `solar.wallet` |
| **Asset** | `solar_asset` | `solar.asset`, documents techniques |
| **Holding** | `solar_holding` | `solar.holding` |
| **Investment** | `solar_investment` | `solar.investment.order` |
| **Payment** | `solar_payment` | `solar.payment.transaction` |
| **Market** | `solar_market` | `solar.market.order`, `solar.market.trade` |
| **Yield** | `solar_yield` | `solar.yield.distribution`, `solar.yield.line` |
| **KYC** | `solar_kyc` | `solar.kyc.case`, `solar.kyc.document`, `solar.kyc.decision` |
| **Compliance** | `solar_compliance` | `solar.aml.alert`, `solar.sanction.check` |
| **Audit** | `solar_audit` | `solar.audit.log` |

**Total : 11 addons.** Voir `docs/odoo-mdd.md` pour le détail d'implémentation.

### 1.3 Conventions de types

| Type métier | Type Odoo | Notes |
|-------------|-----------|-------|
| Identifiant externe (UUID exposé API) | `Char(36)` unique | Champ `uuid` sur chaque modèle |
| Texte court | `Char(255)` | |
| Texte long | `Text` | |
| Enum / Statut | `Selection` | Liste typée |
| Montant fiat | `Monetary` (+ `currency_id`) | 2 décimales |
| Quantité de cells | `Integer` (entières au MVP) | Voir Q-AST-02 dans v1 |
| Pourcentage | `Float(5,4)` | 0.0850 = 8,50 % |
| Date+heure | `Datetime` (UTC) | |
| Référence externe | `Char` (format libre) | tx hashes, IBAN, etc. |
| Données JSON | `Json` | Métadonnées techniques |
| Hash de transaction | `Char(66)` | `0x` + 64 hex |
| Adresse Ethereum | `Char(42)` | `0x` + 40 hex |
| IBAN | `Char(34)` | |

### 1.4 Règles transverses

> **R-MDD-01.** Toute entité MUST avoir un champ `uuid` (Char 36, unique, indexé)
> exposé via l'API. Le `id` Odoo n'est jamais retourné publiquement.

> **R-MDD-02.** Toute entité avec cycle de vie MUST avoir un champ `state` (Selection)
> avec `tracking=True`.

> **R-MDD-03.** Tout champ métier sensible MUST avoir `tracking=True`.

> **R-MDD-04.** Toute action métier impactante MUST déclencher une écriture dans
> `solar.audit.log` via une méthode wrapper.

---

## 2. Catalogue des 15 entités

### 2.1 Vue synthétique

| # | Entité métier | Modèle Odoo | Addon | Nouveau v2 |
|---|---------------|-------------|-------|------------|
| **E01** | Investisseur | `res.partner` (extension) | `solar_core` | — |
| **E02** | Wallet | `solar.wallet` | `solar_wallet` | ✨ Extrait |
| **E03** | Actif solaire | `solar.asset` | `solar_asset` | — |
| **E04** | Détention | `solar.holding` | `solar_holding` | — |
| **E05** | Ordre d'investissement | `solar.investment.order` | `solar_investment` | ✨ Nouveau |
| **E06** | Transaction de paiement | `solar.payment.transaction` | `solar_payment` | 🔁 Unifié (in+out) |
| **E07** | Offre de marché | `solar.market.order` | `solar_market` | — |
| **E08** | Trade de marché | `solar.market.trade` | `solar_market` | — |
| **E09** | Distribution de revenu | `solar.yield.distribution` | `solar_yield` | — |
| **E10** | Ligne de distribution | `solar.yield.line` | `solar_yield` | — |
| **E11** | Cas KYC | `solar.kyc.case` | `solar_kyc` | ✨ Agrégateur |
| **E12** | Document KYC | `solar.kyc.document` | `solar_kyc` | — |
| **E13** | Décision KYC | `solar.kyc.decision` | `solar_kyc` | — |
| **E14** | Alerte AML | `solar.aml.alert` | `solar_compliance` | — |
| **E15** | Journal d'audit | `solar.audit.log` | `solar_audit` | — |

### 2.2 Diagramme de relations (synthétique)

```
                            ┌────────────────────────┐
                            │   res.partner          │
                            │   (Investisseur E01)   │
                            └──┬───┬────┬────┬───┬───┘
                               │   │    │    │   │
                  ┌────────────┘   │    │    │   └─────────────┐
                  │ 1..1           │1..N│1..N │ 1..N           │ 1..N
                  ▼                ▼    ▼     ▼                ▼
            ┌──────────┐    ┌──────────┐  ┌────────┐    ┌──────────────┐
            │ solar.   │    │ solar.   │  │ solar. │    │ solar.kyc.   │
            │ wallet   │    │ holding  │  │ invest │    │ case (E11)   │
            │  (E02)   │    │  (E04)   │  │ .order │    └──┬────────┬──┘
            └──────────┘    └────┬─────┘  │ (E05)  │       │1..N    │1..N
                                 │        └────┬───┘       ▼        ▼
                                 │ N..1        │       ┌────────┐ ┌────────┐
                                 ▼             │       │ kyc.   │ │ kyc.   │
                            ┌──────────┐       │       │ doc.   │ │ decis. │
                            │ solar.   │◄──────┘       │ (E12)  │ │ (E13)  │
                            │ asset    │  N..1         └────────┘ └────────┘
                            │  (E03)   │
                            └─────┬────┘
                                  │ 1..N
                                  ▼
                          ┌──────────────────┐
                          │ solar.yield.     │
                          │ distribution     │
                          │   (E09)          │
                          └────────┬─────────┘
                                   │ 1..N
                                   ▼
                          ┌──────────────────┐
                          │ solar.yield.line │
                          │   (E10)          │
                          └──────────────────┘

       Marché secondaire :

       res.partner ──► solar.market.order ◄── solar.asset
       (vendeur)  1..N      (E07)        N..1

       solar.market.order ──► solar.market.trade ◄── res.partner
                         1..N        (E08)         N..1   (acheteur)

       Flux financiers (in + out unifiés) :

       res.partner ──► solar.payment.transaction (E06)
                  1..N      direction: 'inbound' | 'outbound'
                            linked_order_id / linked_yield_line_id / linked_trade_id

       Transverse :

       Toute action métier → solar.audit.log (E15)  (append-only)
       Anomalie compliance → solar.aml.alert (E14)
```

---

## 3. Entité E01 — Investisseur

### 3.1 Carte d'identité

| Propriété | Valeur |
|-----------|--------|
| **Modèle Odoo** | `res.partner` (étendu via `_inherit`) |
| **Addon** | `solar_core` |
| **Cardinalité** | 1 000 → 100 000 |
| **Cycle de vie** | Oui (`x_kyc_status` via `solar.kyc.case`) |

### 3.2 Champs custom principaux

| Champ | Type | Rôle |
|-------|------|------|
| `x_uuid` | `Char(36)` unique | ID externe API |
| `x_is_investor` | `Boolean` | Filtre |
| `x_investor_type` | `Selection` | `retail` / `qualified` / `institutional` |
| `x_kyc_case_id` | `Many2one('solar.kyc.case')` | Lien vers son cas KYC (la source de vérité du statut) |
| `x_kyc_status` | `Selection` (related = `x_kyc_case_id.state`) | Dénormalisé pour rapidité |
| `x_wallet_ids` | `One2many('solar.wallet')` | Wallets associés (>=1) |
| `x_primary_wallet_id` | `Many2one('solar.wallet')` | Wallet principal |
| `x_iban` | `Char(34)` | IBAN validé pour payouts |
| `x_iban_validated_at` | `Datetime` | |
| `x_date_of_birth` | `Date` | |
| `x_nationality_id` | `Many2one('res.country')` | |
| `x_cgp_id` | `Many2one('res.partner')` | CGP délégué |
| `x_terms_accepted_at` | `Datetime` | |
| `x_marketing_optin` | `Boolean` | |
| `x_account_state` | `Selection` | `pending` / `active` / `suspended` / `closed` |

### 3.3 Relations principales

| Champ | Vers | Type |
|-------|------|------|
| `x_kyc_case_id` | `solar.kyc.case` | Many2one |
| `x_wallet_ids` | `solar.wallet` | One2many |
| `x_holding_ids` | `solar.holding` | One2many |
| `x_investment_order_ids` | `solar.investment.order` | One2many |
| `x_payment_transaction_ids` | `solar.payment.transaction` | One2many |
| `x_market_order_ids` | `solar.market.order` | One2many (en tant que vendeur) |
| `x_aml_alert_ids` | `solar.aml.alert` | One2many |

> Le détail exhaustif (validations, contraintes, calculs) est dans `docs/odoo-mdd.md`.

---

## 4. Entité E02 — Wallet (✨ Nouveau modèle dédié)

### 4.1 Carte d'identité

| Propriété | Valeur |
|-----------|--------|
| **Modèle Odoo** | `solar.wallet` |
| **Addon** | `solar_wallet` |
| **Cardinalité** | 1 000 → 100 000 (1 par investisseur au MVP) |
| **Cycle de vie** | Oui |

### 4.2 Justification du modèle séparé

L'extension `res.partner` avec champs `x_wallet_*` (v1) ne tenait plus pour 3 raisons :
- Un investisseur peut avoir plusieurs wallets (custodial + self-custodial post-V2).
- Le wallet a son propre cycle de vie (création → actif → gelé → fermé).
- La surveillance et l'audit on-chain méritent un objet dédié.

### 4.3 Champs principaux

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` unique | |
| `partner_id` | `Many2one('res.partner')` | Propriétaire |
| `wallet_type` | `Selection` | `custodial` / `mpc` / `self_custodial` (post-V2) |
| `provider` | `Selection` | `fireblocks` / `copper` / `bitgo` / `other` |
| `provider_vault_id` | `Char(64)` unique | Référence chez le custodian |
| `address` | `Char(42)` unique | Adresse on-chain |
| `network` | `Selection` | `tempo` / `polygon` / `base` / `avalanche` |
| `state` | `Selection` | `pending` / `active` / `frozen` / `closed` |
| `whitelisted_on_chain` | `Boolean` | Inscrit dans le contrat Whitelist |
| `whitelisted_at` | `Datetime` | |
| `created_at` | `Datetime` | |
| `last_balance_sync_at` | `Datetime` | Dernière synchro avec le réseau |
| `metadata` | `Json` | Provider-specific |

### 4.4 Cycle de vie

| Valeur | Description | Transitions |
|--------|-------------|-------------|
| `pending` | En cours de création chez le provider | → `active`, → `failed` |
| `active` | Wallet opérationnel, whitelisté on-chain | → `frozen`, → `closed` |
| `frozen` | Gelé par compliance (alerte AML) | → `active`, → `closed` |
| `closed` | Fermé (clôture compte) | (terminal) |
| `failed` | Échec création | (terminal) |

---

## 5. Entité E03 — Actif solaire

### 5.1 Carte d'identité

| Propriété | Valeur |
|-----------|--------|
| **Modèle Odoo** | `solar.asset` |
| **Addon** | `solar_asset` |
| **Cardinalité** | 5 → 500 |
| **Cycle de vie** | Oui (`draft` → `decommissioned`) |

### 5.2 Champs principaux

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` unique | |
| `code` | `Char(32)` unique | Code court (`FR-PROV-01`) |
| `name` | `Char(128)` | Nom commercial |
| `slug` | `Char(128)` unique | URL slug |
| `state` | `Selection` | 9 valeurs (voir §5.3) |
| `country_id` | `Many2one('res.country')` | |
| `region`, `city` | `Char` | |
| `latitude`, `longitude` | `Float(10,7)` | |
| `asset_type` | `Selection` | 6 types (ground / canopy / rooftop / battery / EV / residential) |
| `installed_power_mwc` | `Float(10,3)` | |
| `annual_production_mwh` | `Float(12,2)` | |
| `commissioning_date` | `Date` | |
| `project_duration_years` | `Integer` | Default 20 |
| `total_capital_raised` | `Monetary` | |
| `cell_unit_price` | `Monetary` | Default 1,00 € |
| `total_cells` | `Integer` | |
| `cells_available` | `Integer` (computed) | |
| `target_yield_rate` | `Float(5,4)` | |
| `ppa_type` | `Selection` | 5 types |
| `ppa_price_per_kwh` | `Float(6,4)` | |
| `ppa_duration_years` | `Integer` | |
| `operator_id` | `Many2one('res.partner')` | |
| `owner_spv_id` | `Many2one('res.partner')` | |
| `distribution_frequency` | `Selection` | `monthly` / `quarterly` / `biannual` / `annual` |
| `is_secondary_market_enabled` | `Boolean` | |
| `geo_restriction_country_ids` | `Many2many('res.country')` | |
| `on_chain_token_address` | `Char(42)` unique | Adresse smart contract `SolarToken` |
| `on_chain_token_symbol` | `Char(16)` | |

### 5.3 Cycle de vie `state`

`draft` → `pending_approval` → `financing` → `financing_complete` → `in_production` → `mature` → `decommissioned` (+ branches `paused`, `cancelled`).

---

## 6. Entité E04 — Détention (Holding)

### 6.1 Carte d'identité

| Propriété | Valeur |
|-----------|--------|
| **Modèle Odoo** | `solar.holding` |
| **Addon** | `solar_holding` |
| **Cardinalité** | 5 000 → 5 000 000 |
| **Cycle de vie** | Oui (`active` / `closed`) |

### 6.2 Modèle agrégé

Un seul holding par couple (`partner_id`, `asset_id`).
Les acquisitions successives mettent à jour `cells_owned` et `average_acquisition_price`.

### 6.3 Champs principaux

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` unique | |
| `partner_id` | `Many2one('res.partner')` | Détenteur |
| `asset_id` | `Many2one('solar.asset')` | Actif |
| `wallet_id` | `Many2one('solar.wallet')` | Wallet de détention |
| `cells_owned` | `Integer` | |
| `average_acquisition_price` | `Monetary` | Pondéré |
| `total_invested` | `Monetary` | Cumul |
| `total_yield_received` | `Monetary` (computed) | |
| `first_acquired_at` | `Datetime` | |
| `last_updated_at` | `Datetime` | |
| `state` | `Selection` | `active` / `closed` |
| `reinvest_enabled` | `Boolean` | Auto-réinvestissement |
| `yield_line_ids` | `One2many('solar.yield.line')` | Lignes reçues |

---

## 7. Entité E05 — Ordre d'investissement (✨ Nouveau)

### 7.1 Carte d'identité

| Propriété | Valeur |
|-----------|--------|
| **Modèle Odoo** | `solar.investment.order` |
| **Addon** | `solar_investment` |
| **Cardinalité** | 5 000 → 5 000 000 |
| **Cycle de vie** | Oui |

### 7.2 Justification

L'acte d'investir a un cycle de vie autonome **avant** que le paiement et le holding existent :
- Saisie dans le tunnel S10 → ordre `draft`
- Validation du tunnel → `pending_payment`
- Paiement Stripe confirmé → `paid`
- Conversion stablecoin + transfert on-chain → `settling`
- Holding mis à jour → `settled`
- Échec / annulation possible à toutes les étapes

Sans ce modèle, on perdait le statut intermédiaire et la capacité à gérer les abandons,
les retries Stripe, les expirations de session de paiement.

### 7.3 Champs principaux

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` unique | |
| `partner_id` | `Many2one('res.partner')` | Souscripteur |
| `asset_id` | `Many2one('solar.asset')` | Actif visé |
| `wallet_id` | `Many2one('solar.wallet')` | Wallet destinataire |
| `cells_requested` | `Integer` | Quantité demandée |
| `unit_price` | `Monetary` | Prix au moment de l'ordre |
| `total_amount` | `Monetary` | `cells × unit_price` |
| `fees_amount` | `Monetary` | Frais SolarCells |
| `total_charged` | `Monetary` | Montant à débiter |
| `currency_id` | `Many2one('res.currency')` | |
| `state` | `Selection` | 8 valeurs (voir §7.4) |
| `created_at` | `Datetime` | |
| `expires_at` | `Datetime` | Auto-cancel après 30 min |
| `payment_transaction_id` | `Many2one('solar.payment.transaction')` | Paiement associé |
| `holding_id` | `Many2one('solar.holding')` | Holding créé/mis à jour |
| `on_chain_tx_hash` | `Char(66)` | Tx d'émission/transfert tokens |
| `failure_reason` | `Text` | |

### 7.4 Cycle de vie `state`

| Valeur | Description | Transitions |
|--------|-------------|-------------|
| `draft` | En cours de saisie tunnel S10–S12 | → `pending_payment`, → `cancelled`, → `expired` |
| `pending_payment` | Validé, en attente du paiement Stripe | → `paid`, → `failed`, → `cancelled`, → `expired` |
| `paid` | Paiement reçu, conversion stablecoin en cours | → `settling`, → `failed` |
| `settling` | Tokens en cours de transfert on-chain | → `settled`, → `failed` |
| `settled` | Holding mis à jour, ordre complété | (terminal) |
| `failed` | Échec à une étape | → `pending_payment` (retry), → `cancelled` |
| `cancelled` | Annulé manuellement | (terminal) |
| `expired` | Expiration sans paiement | (terminal) |

---

## 8. Entité E06 — Transaction de paiement (🔁 Unifiée)

### 8.1 Carte d'identité

| Propriété | Valeur |
|-----------|--------|
| **Modèle Odoo** | `solar.payment.transaction` |
| **Addon** | `solar_payment` |
| **Cardinalité** | 10 000 → 50 000 000 |
| **Cycle de vie** | Oui |

### 8.2 Unification in/out

Au lieu de deux modèles (`sc.payment` + `sc.payout` en v1), un seul modèle avec champ
`direction`. Cela simplifie :
- la réconciliation (une seule table à inspecter)
- les rapports financiers (un seul export comptable)
- les workflows (un seul cycle de vie commun à comprendre)

### 8.3 Champs principaux

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` unique | |
| `partner_id` | `Many2one('res.partner')` | Investisseur concerné |
| `direction` | `Selection` | `inbound` / `outbound` |
| `transaction_type` | `Selection` | 7 valeurs (voir §8.4) |
| `payment_method` | `Selection` | `sepa` / `card` / `stablecoin` |
| `fiat_amount` | `Monetary` | |
| `currency_id` | `Many2one('res.currency')` | |
| `stablecoin_amount` | `Float(20,6)` | Si conversion |
| `stablecoin_type` | `Selection` | `EURC` / `USDC` / `EURCV` |
| `stripe_intent_id` | `Char(64)` | Inbound |
| `stripe_payout_id` | `Char(64)` | Outbound |
| `bridge_conversion_id` | `Char(64)` | |
| `iban_used` | `Char(34)` | Outbound (figé au moment du payout) |
| `state` | `Selection` | 7 valeurs |
| `linked_order_id` | `Many2one('solar.investment.order')` | Si inbound = souscription |
| `linked_trade_id` | `Many2one('solar.market.trade')` | Si lié à marketplace |
| `linked_yield_line_ids` | `One2many('solar.yield.line')` | Si outbound = distribution |
| `metadata` | `Json` | |

### 8.4 Champ `transaction_type`

| Valeur | Direction | Description |
|--------|-----------|-------------|
| `subscription` | inbound | Souscription d'actif (primary market) |
| `marketplace_buy` | inbound | Achat sur marketplace secondaire |
| `top_up` | inbound | Approvisionnement libre |
| `onboarding_fee` | inbound | Frais d'onboarding |
| `management_fee` | inbound | Prélèvement des frais |
| `yield_distribution` | outbound | Versement de revenu |
| `marketplace_sale` | outbound | Vente sur marketplace (payout vendeur) |
| `withdrawal` | outbound | Retrait demandé |
| `refund` | outbound | Remboursement |

---

## 9. Entités E07 + E08 — Marché secondaire

### 9.1 `solar.market.order` (offre de cession)

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `seller_id` | `Many2one('res.partner')` | |
| `asset_id` | `Many2one('solar.asset')` | |
| `cells_offered` | `Integer` | |
| `cells_remaining` | `Integer` (computed) | |
| `price_per_cell` | `Monetary` | |
| `total_amount` | `Monetary` (computed) | |
| `state` | `Selection` | `draft` / `published` / `partially_filled` / `filled` / `cancelled` / `expired` |
| `expires_at` | `Datetime` | Default now+30j |
| `trade_ids` | `One2many('solar.market.trade')` | |

### 9.2 `solar.market.trade` (cession exécutée)

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `market_order_id` | `Many2one('solar.market.order')` | |
| `seller_id` | `Many2one('res.partner')` | Dénormalisé |
| `buyer_id` | `Many2one('res.partner')` | |
| `asset_id` | `Many2one('solar.asset')` | Dénormalisé |
| `cells_traded` | `Integer` | |
| `price_per_cell` | `Monetary` | |
| `gross_amount` | `Monetary` | |
| `platform_fees` | `Monetary` | Frais SolarCells (vendeur, 0,5 %) |
| `net_to_seller` | `Monetary` | |
| `state` | `Selection` | `pending` / `validated` / `settling` / `settled` / `failed` / `cancelled` |
| `whitelist_check_passed` | `Boolean` | |
| `kyc_check_passed` | `Boolean` | |
| `geo_check_passed` | `Boolean` | |
| `on_chain_tx_hash` | `Char(66)` | |
| `payment_transaction_buyer_id` | `Many2one('solar.payment.transaction')` | Inbound |
| `payment_transaction_seller_id` | `Many2one('solar.payment.transaction')` | Outbound |

---

## 10. Entités E09 + E10 — Yield (revenus)

### 10.1 `solar.yield.distribution` (par actif × période)

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `asset_id` | `Many2one('solar.asset')` | |
| `period_start` | `Date` | |
| `period_end` | `Date` | |
| `gross_revenue` | `Monetary` | Revenu brut période |
| `operational_costs` | `Monetary` | |
| `platform_management_fees` | `Monetary` | |
| `net_distributable` | `Monetary` | |
| `total_cells_at_period_end` | `Integer` | Snapshot |
| `amount_per_cell` | `Monetary` | |
| `state` | `Selection` | `draft` / `calculated` / `validated` / `executing` / `completed` / `failed` / `cancelled` |
| `calculated_at` | `Datetime` | |
| `validated_at` | `Datetime` | |
| `validated_by` | `Many2one('res.users')` | |
| `executed_at` | `Datetime` | |
| `on_chain_tx_hash` | `Char(66)` | Tx `YieldDistributor` |
| `line_ids` | `One2many('solar.yield.line')` | |

### 10.2 `solar.yield.line` (par investisseur)

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `distribution_id` | `Many2one('solar.yield.distribution')` | |
| `partner_id` | `Many2one('res.partner')` | |
| `holding_id` | `Many2one('solar.holding')` | |
| `cells_held_at_snapshot` | `Integer` | |
| `gross_amount` | `Monetary` | |
| `management_fees` | `Monetary` | |
| `withholding_tax` | `Monetary` | |
| `net_amount` | `Monetary` | |
| `state` | `Selection` | `pending` / `paid` / `reinvested` / `cancelled` / `failed` |
| `payment_transaction_id` | `Many2one('solar.payment.transaction')` | Si payé fiat |
| `reinvest_order_id` | `Many2one('solar.investment.order')` | Si réinvesti |

---

## 11. Entités E11 + E12 + E13 — KYC restructuré

### 11.1 Architecture

```
res.partner
   │
   │ x_kyc_case_id (1..1)
   ▼
solar.kyc.case  ← agrégateur, 1 par investisseur
   │
   ├── document_ids ──► solar.kyc.document  (N)
   │
   └── decision_ids ──► solar.kyc.decision  (N)
```

Le `solar.kyc.case` porte le **statut KYC global** de l'investisseur.
Les documents sont les pièces uploadées. Les décisions sont les validations/rejets
historiques (audit trail compliance).

### 11.2 `solar.kyc.case`

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `partner_id` | `Many2one('res.partner')` unique | 1 par investisseur |
| `state` | `Selection` | 7 valeurs (voir §11.5) |
| `level` | `Selection` | `L1` / `L2` / `L3` / `L4` |
| `level_required` | `Selection` (computed) | Niveau requis selon les transactions de l'investisseur |
| `provider` | `Selection` | `onfido` / `sumsub` / `veriff` / `manual` |
| `provider_case_id` | `Char(64)` | Référence chez le prestataire |
| `risk_score` | `Float(5,2)` | 0–100 |
| `pep_status` | `Boolean` | |
| `pep_details` | `Text` | |
| `sanctions_check_at` | `Datetime` | |
| `submitted_at` | `Datetime` | |
| `validated_at` | `Datetime` | |
| `expires_at` | `Datetime` | Default `validated_at + 2 ans` |
| `rejected_at` | `Datetime` | |
| `rejection_reason` | `Text` | |
| `document_ids` | `One2many('solar.kyc.document')` | |
| `decision_ids` | `One2many('solar.kyc.decision')` | |

### 11.3 `solar.kyc.document`

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `case_id` | `Many2one('solar.kyc.case')` | |
| `document_type` | `Selection` | 12 types |
| `minio_path` | `Char(512)` | Stockage objet |
| `sha256_hash` | `Char(64)` | Intégrité |
| `mime_type` | `Char(64)` | |
| `file_size_bytes` | `Integer` | |
| `uploaded_at` | `Datetime` | |
| `state` | `Selection` | `pending` / `validated` / `rejected` / `expired` |
| `provider_document_id` | `Char(64)` | |
| `validation_result` | `Json` | |
| `rejection_reason` | `Text` | |

### 11.4 `solar.kyc.decision` (immuable)

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `case_id` | `Many2one('solar.kyc.case')` | |
| `decision` | `Selection` | `approved` / `rejected` / `escalated` / `renewal_required` |
| `kyc_level` | `Selection` | |
| `decision_at` | `Datetime` | |
| `decided_by` | `Many2one('res.users')` | NULL si auto |
| `decision_source` | `Selection` | `automatic` / `manual` / `provider` |
| `decision_reason` | `Text` | |
| `previous_state` | `Char(32)` | |
| `new_state` | `Char(32)` | |
| `document_ids` | `Many2many('solar.kyc.document')` | Documents pris en compte |

### 11.5 Cycle de vie `solar.kyc.case.state`

| Valeur | Description |
|--------|-------------|
| `not_started` | Investisseur inscrit mais KYC non démarré |
| `in_progress` | Documents en cours d'upload |
| `submitted` | Tous documents reçus, en attente vérification |
| `under_review` | Vérification manuelle (escalade) |
| `validated` | KYC approuvé |
| `rejected` | KYC refusé |
| `expired` | Validation expirée (> 2 ans) |
| `suspended` | Gel administratif |

---

## 12. Entité E14 — Alerte AML

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `partner_id` | `Many2one('res.partner')` | |
| `alert_type` | `Selection` | 9 types |
| `severity` | `Selection` | `low` / `medium` / `high` / `critical` |
| `source` | `Selection` | `automatic_rule` / `provider` / `manual` |
| `state` | `Selection` | `open` / `under_review` / `escalated` / `resolved` / `false_positive` / `closed` |
| `description` | `Text` | |
| `details` | `Json` | |
| `triggered_at` | `Datetime` | |
| `assigned_to` | `Many2one('res.users')` | Compliance officer |
| `resolution` | `Text` | |
| `resolved_at` | `Datetime` | |
| `related_trade_id` | `Many2one('solar.market.trade')` | |
| `related_payment_id` | `Many2one('solar.payment.transaction')` | |
| `related_kyc_case_id` | `Many2one('solar.kyc.case')` | |
| `str_filed` | `Boolean` | Déclaration de soupçon |

---

## 13. Entité E15 — Journal d'audit

| Champ | Type | Rôle |
|-------|------|------|
| `uuid` | `Char(36)` | |
| `timestamp` | `Datetime` | UTC |
| `actor_type` | `Selection` | `user` / `partner` / `system` / `api_client` |
| `actor_id` | `Integer` | |
| `actor_name` | `Char(128)` | Dénormalisé |
| `action_code` | `Char(64)` | Ex. `kyc.validated`, `investment.settled` |
| `subject_model` | `Char(64)` | Modèle Odoo concerné |
| `subject_id` | `Integer` | |
| `subject_uuid` | `Char(36)` | |
| `before_state` | `Json` | |
| `after_state` | `Json` | |
| `request_ip` | `Char(45)` | |
| `request_user_agent` | `Char(512)` | |
| `request_trace_id` | `Char(64)` | OpenTelemetry |
| `redis_event_id` | `Char(64)` | Domain event associé |
| `on_chain_tx_hash` | `Char(66)` | Si tx blockchain |

> **Append-only.** Pas de `write` ni `unlink`. Voir `docs/odoo-mdd.md` pour les contraintes.

---

## 14. Cycles de vie — Diagrammes à produire

| Fichier (à produire séparément) | Contenu |
|---------|---------|
| `diagrams/er-global.mermaid` | Diagramme ER complet des 15 entités |
| `diagrams/lifecycle-investor.mermaid` | `x_account_state` × `solar.kyc.case.state` |
| `diagrams/lifecycle-wallet.mermaid` | `solar.wallet.state` |
| `diagrams/lifecycle-asset.mermaid` | `solar.asset.state` |
| `diagrams/lifecycle-investment-order.mermaid` | `solar.investment.order.state` |
| `diagrams/lifecycle-payment.mermaid` | `solar.payment.transaction.state` |
| `diagrams/lifecycle-market-order.mermaid` | `solar.market.order` + `trade` combinés |
| `diagrams/lifecycle-distribution.mermaid` | `solar.yield.distribution` + `line` |
| `diagrams/lifecycle-kyc.mermaid` | `solar.kyc.case.state` |
| `diagrams/lifecycle-aml.mermaid` | `solar.aml.alert.state` |

---

## 15. Décisions arbitrées

> Les 12 questions ouvertes de la v1 et v2 ont été tranchées le 25 mai 2025
> par l'équipe architecture (validation product / compliance restant à recueillir).
> Cette section fait foi pour l'implémentation.

### 15.1 Tableau de synthèse

| ID | Question | Décision | Rationale |
|----|----------|----------|-----------|
| **Q-WAL-01** | Plusieurs `solar.wallet` actifs simultanément ? | **Non au MVP** (1 actif max par investisseur). Plusieurs en V2 (custodial + self). | Custody simple, surveillance simple, conformité simple. |
| **Q-INV-02** | Durée d'expiration KYC | **2 ans** pour L1–L2, **1 an** pour L3–L4 | Plus de surveillance pour les profils à risque ou montants élevés (cohérent FINMA / AMLD6). |
| **Q-AST-01** | PPA multiples par actif | **Non au MVP** (1 PPA principal) | Couvre 95 % des cas. Si besoin V2 → sous-modèle `solar.asset.ppa`. |
| **Q-AST-02** | Solar Cells fractionnables | **Non au MVP** (entières, `Integer`) | Cohérent ERC-3643. Évite les bugs d'arrondi. Migration future facile vers `Float(16,8)`. |
| **Q-AST-03** | Procédure de remboursement si actif `cancelled` | **Workflow documenté §15.2** | Compliance impose une procédure tracée. |
| **Q-IO-01** | Expiration ordre non payé | **30 min si carte**, **7 jours si SEPA** | Adapté au délai bancaire SEPA. Configurable. |
| **Q-IO-02** | Paiement reçu mais ordre `expired` | **Workflow documenté §15.3** | Doit éviter de bloquer les fonds des investisseurs. |
| **Q-HLD-01** | Historique granulaire (FIFO/LIFO fiscalité) | **Moyenne pondérée au MVP**. Lot-level reporté V2. | Suffisant pour reporting trimestriel. Lot-level si exigence fiscale spécifique apparaît. |
| **Q-MKT-01** | Whitelist : globale ou par paire ? | **Globale** : KYC validé + geo check = autorisé | Simplicité MVP. Par-paire ajoutable en V2 sans refonte. |
| **Q-PAY-01** | Conversion stablecoin auto ou manuel ? | **Automatique** via Bridge | Évite l'overhead opérationnel. Rate spot au moment de la conversion. |
| **Q-PAY-02** | Multi-devises : un actif = une devise ? | **Oui au MVP** (1 actif = 1 devise) | EUR par défaut. CHF en V2 (extension Suisse). Investisseur peut détenir plusieurs devises via plusieurs actifs. |
| **Q-COMPL-01** | Conservation données après clôture | **Workflow documenté §15.4** | RGPD + AMLD6 imposent des règles précises. |

### 15.2 Décision Q-AST-03 — Procédure d'annulation d'actif

Quand un `solar.asset` transite vers l'état `cancelled` (typiquement parce que
le financement n'a pas atteint son seuil minimum ou qu'un problème technique
est découvert avant la mise en service), la procédure suivante MUST être exécutée :

```
1. Geler l'actif sur la marketplace (is_secondary_market_enabled = False)
2. Pour chaque solar.investment.order en `settled` sur cet actif :
   2.1. Créer une solar.payment.transaction outbound (type=refund)
        montant = order.total_charged (capital + frais remboursés)
   2.2. Marquer le holding en state='closed'
   2.3. Burn des SolarTokens on-chain (méthode SolarToken.burn)
3. Pour chaque solar.investment.order en `pending_payment` ou `paid` :
   3.1. Annuler le payment (refund Stripe si succeeded, cancel sinon)
   3.2. Marquer l'order en `cancelled`
4. Pour chaque solar.market.order `published` sur cet actif :
   4.1. Marquer en `cancelled`
   4.2. Notifier le vendeur
5. Enregistrer un solar.audit.log par opération (action_code='asset.cancelled.refund')
6. Notifier tous les investisseurs concernés par email + push
```

Implémentation : méthode `action_cancel()` sur `solar.asset` orchestre via
des tâches asynchrones (un domain event `asset.cancelled` consommé par
le Refund Service).

### 15.3 Décision Q-IO-02 — Paiement reçu après expiration d'ordre

Scénario : un investisseur valide un ordre SEPA, l'ordre expire au bout de 7 jours
sans paiement reçu, puis le virement SEPA arrive (banque lente).

**Logique d'arbitrage** :

```
Cas 1 : ordre expiré, cells encore disponibles sur l'actif
   → Ranimer l'ordre : state expired → pending_payment → paid
   → Procéder au settlement normal
   → Log : action_code='investment.revived'
   → Notifier l'investisseur

Cas 2 : ordre expiré, cells plus disponibles (financement complet ou actif cancelled)
   → Auto-refund : créer solar.payment.transaction outbound type=refund
   → L'ordre reste expired
   → Log : action_code='investment.auto_refunded'
   → Notifier l'investisseur (avec excuses et suggestion d'alternatives)
```

Décision auto en moins de 5 minutes. Pas d'intervention humaine au MVP.

### 15.4 Décision Q-COMPL-01 — Conservation des données après clôture

Conformément à AMLD6 (rétention 5 ans minimum), RGPD (minimisation),
et exigences fiscales (jusqu'à 10 ans selon juridiction) :

```
Lors de la clôture d'un compte (action_close_account sur res.partner) :

PHASE 1 — Immédiat
  - Anonymiser PII non essentielle dans res.partner :
      name        → "[CLOSED-" + x_uuid[:8] + "]"
      email       → null
      phone       → null
      street      → null
  - Conserver intacts : x_uuid, x_iban (chiffré), x_date_of_birth, x_nationality_id
    (nécessaires aux obligations légales et fiscales)
  - Geler les wallets : state = 'closed'

PHASE 2 — Pendant 5 ans (rétention AMLD6)
  - solar.kyc.case, solar.kyc.document, solar.kyc.decision  → conservés intacts
  - solar.payment.transaction, solar.holding (closed), solar.yield.line  → conservés intacts
  - MinIO bucket `kyc-documents`  → chiffrés, accès restreint compliance

PHASE 3 — Après 5 ans
  - Hard-delete des documents KYC (MinIO + références dans Odoo)
  - Anonymisation profonde des solar.kyc.decision (suppression des champs personnels,
    conservation de la décision elle-même)

PHASE 4 — Après 10 ans (rétention fiscale max)
  - Hard-delete des solar.payment.transaction
  - solar.audit.log : déplacement vers archivage cold storage

PHASE PERMANENTE
  - solar.audit.log conservés pour les actions de la clôture elle-même
  - Soldes agrégés annuels (pour audit fiscal historique)
```

Implémentation : cron quotidien `Cron: GDPR retention cleanup` qui purge
les données arrivées en fin de période. Audit log généré pour chaque suppression.

### 15.5 Conséquences sur les modèles

Les décisions ci-dessus impliquent les ajustements suivants par rapport à la
version courante des modèles (à intégrer dans `docs/odoo-mdd.md` v1.1) :

| Décision | Modèle impacté | Ajout |
|----------|---------------|-------|
| Q-WAL-01 | `solar.wallet` | Contrainte `@api.constrains` : 1 wallet `active` max par partner au MVP |
| Q-INV-02 | `solar.kyc.case` | `expires_at` calculé selon `level` : 2 ans pour L1/L2, 1 an pour L3/L4 |
| Q-IO-01 | `solar.investment.order` | `expires_at` calculé selon `payment_method` |
| Q-COMPL-01 | `solar_core` | Cron + méthode `action_close_account` + champs d'anonymisation |
| Q-AST-03 | `solar.asset` | Méthode `action_cancel` détaillée |
| Q-IO-02 | `solar.investment.order` | Méthode `_handle_late_payment` |

> Ces ajustements sont marqués comme **enrichissements v1.1** de `docs/odoo-mdd.md`
> et feront l'objet d'un commit dédié `docs: enrich odoo-mdd with arbitrated decisions`.

---

## 16. Prochaines étapes

### 16.1 Avant codage

1. **Trancher les questions ⚠** avec product + compliance.
2. **Valider les 11 bounded contexts (addons)** ci-dessus.

### 16.2 Documents à produire

```
specs/mdd/
├── 00-overview.md                      ← ce fichier ✓
├── 01-investor.md                      (à produire)
├── 02-wallet.md
├── 03-asset.md
├── 04-holding.md
├── 05-investment-order.md
├── 06-payment-transaction.md
├── 07-market.md                        (orders + trades)
├── 08-yield.md                         (distribution + lines)
├── 09-kyc.md                           (case + documents + decisions)
├── 10-compliance.md
├── 11-audit.md
└── diagrams/                           (10 fichiers Mermaid)

docs/
└── odoo-mdd.md                         ← niveau implémentation Odoo ✓
```

### 16.3 Premier module Odoo

`solar_core` (extension `res.partner` + champs `x_kyc_case_id`, `x_wallet_ids`) ne peut
démarrer qu'après publication de `solar_kyc` et `solar_wallet` (relations nécessaires).

**Ordre d'implémentation suggéré des addons :**
1. `solar_audit` (utilisé par tous)
2. `solar_core` (extension `res.partner` minimale, sans relations KYC/wallet)
3. `solar_kyc` (case + document + decision)
4. `solar_wallet`
5. `solar_core` (update pour brancher relations KYC/wallet)
6. `solar_asset`
7. `solar_holding`
8. `solar_payment`
9. `solar_investment` (dépend de payment + holding)
10. `solar_market`
11. `solar_yield`
12. `solar_compliance`

---

*Document vivant. v2.0.0 du 24 mai 2025. Toute modification : commit `docs(mdd): update overview vX.Y.Z`.*
