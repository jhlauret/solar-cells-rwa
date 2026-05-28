---
spec: odoo-rules
version: 1.1.0
status: active
supersedes: 1.0.0
applies-to: [odoo-addons]
parent: constitution.md
stack: [Odoo Community V18, Python 3.11+, PostgreSQL 16]
changelog-v1-1:
  - naming: addons passent de `solarcells_*` à `solar_*`
  - naming: modèles passent de `sc.*` à `solar.*`
  - naming: groupes de sécurité passent à `solar_core.group_*`
  - alignment: cohérence avec specs/mdd/00-overview.md v2.0 et docs/odoo-mdd.md v1.0
---

# Odoo Rules — SolarCells RWA

> Ces règles s'appliquent à tout fichier sous `odoo-addons/`.
> Odoo V18 est la seule source de vérité métier.
> Ces règles sont destinées à être lues par un LLM avant toute génération
> de module ou de code Python Odoo.

---

## 1. Modules — Naming & périmètre

> **RULE-OO-01.** Chaque module MUST être nommé `solar_<bounded_context>`.
> Le bounded context est un mot court en snake_case représentant un périmètre fonctionnel
> ayant sa propre cohérence métier.
>
> | Module | Périmètre |
> |--------|-----------|
> | `solar_audit` | Journal d'audit immuable |
> | `solar_core` | Extension `res.partner` (investisseurs), groupes de sécurité |
> | `solar_kyc` | Cas KYC + documents + décisions |
> | `solar_wallet` | Wallets custodial |
> | `solar_asset` | Référentiel des actifs solaires |
> | `solar_holding` | Détentions par investisseur |
> | `solar_investment` | Ordres d'investissement |
> | `solar_payment` | Transactions de paiement (in/out unifiées) |
> | `solar_market` | Marketplace secondaire (offres + trades) |
> | `solar_yield` | Distribution de revenus |
> | `solar_compliance` | Alertes AML, screening sanctions |

> **RULE-OO-02.** Un module = un bounded context.
> Un module ne MUST NOT mélanger deux bounded contexts.

> **RULE-OO-03.** Les dépendances inter-modules MUST être déclarées
> dans `__manifest__.py` sous `depends`.
> Un module MUST NOT importer un autre module `solar_*` sans le déclarer.

---

## 2. Structure d'un module

```
solar_<bounded_context>/
├── __manifest__.py          # Obligatoire
├── __init__.py              # Obligatoire
├── models/
│   ├── __init__.py
│   └── <model_name>.py
├── security/
│   ├── ir.model.access.csv  # Obligatoire pour chaque nouveau modèle
│   └── <module>_groups.xml  # Si de nouveaux groupes sont créés
├── views/
│   └── <model_name>_views.xml
├── data/
│   └── <fichiers_de_données>.xml
└── tests/
    ├── __init__.py
    └── test_<model_name>.py
```

> **RULE-OO-04.** Tout nouveau modèle MUST avoir une entrée dans
> `security/ir.model.access.csv`.
> Un modèle sans règle d'accès MUST NOT être mergé.

> **RULE-OO-05.** Le dossier `tests/` MUST exister dans chaque module.
> Au minimum un test de smoke (création d'un enregistrement) MUST être présent.

---

## 3. `__manifest__.py`

> **RULE-OO-06.** Chaque `__manifest__.py` MUST contenir au minimum :
>
> ```python
> {
>     'name':        'Solar — <Bounded Context>',
>     'version':     '18.0.1.0.0',
>     'category':    'Solar',
>     'summary':     '<Une phrase décrivant le rôle du module>',
>     'author':      'SolarCells RWA',
>     'license':     'LGPL-3',
>     'depends':     ['base'],        # + autres dépendances explicites
>     'data':        [],              # vues, données, sécurité
>     'installable': True,
>     'auto_install': False,
> }
> ```

> **RULE-OO-07.** La version MUST suivre le format `18.0.X.Y.Z`
> où `X.Y.Z` suit semver. Elle MUST être incrémentée à chaque migration.

---

## 4. Modèles Python

> **RULE-OO-08.** Les modèles MUST hériter de modèles Odoo existants
> plutôt que de créer de nouveaux modèles orphelins, quand c'est possible.
>
> ✅ `class SolarPartner(models.Model): _inherit = 'res.partner'`
> ✅ `class SolarAsset(models.Model): _name = 'solar.asset'` (domaine propre)
> ❌ Créer `solar.investor` alors que `res.partner` avec extension suffit

> **RULE-OO-09.** Chaque champ MUST avoir les attributs `string` et `help`.
>
> ```python
> x_kyc_status = fields.Selection(
>     selection=[
>         ('pending',   'En attente'),
>         ('validated', 'Validé'),
>         ('rejected',  'Rejeté'),
>     ],
>     string='Statut KYC',
>     help='Statut de validation KYC de l\'investisseur.',
>     default='pending',
>     required=True,
>     tracking=True,   # historique des changements
> )
> ```

> **RULE-OO-10.** Les champs custom ajoutés à des modèles natifs Odoo
> MUST être préfixés `x_` pour éviter les collisions avec les futures versions.
>
> ✅ `x_kyc_status`, `x_wallet_ref`, `x_is_whitelisted`
> ❌ `kyc_status` sur `res.partner`

> **RULE-OO-11.** MUST NOT : SQL raw dans les modèles.
> Utiliser l'ORM Odoo (`search`, `create`, `write`, `unlink`, `filtered`, `mapped`).
> Exception documentée uniquement pour les rapports de performance critiques.

> **RULE-OO-12.** Les méthodes exposées via JSON-RPC au backend Node
> MUST être décorées `@api.model` ou `@api.multi` selon leur contexte,
> et documentées avec leur signature attendue dans un docstring.

---

## 5. Champs calculés & contraintes

> **RULE-OO-13.** Les champs calculés MUST déclarer explicitement `compute`,
> `store` (si mis en cache), et `depends`.
>
> ```python
> total_invested = fields.Monetary(
>     string='Total investi',
>     compute='_compute_total_invested',
>     store=True,
>     depends=['holding_ids.amount'],
> )
> ```

> **RULE-OO-14.** Les contraintes métier MUST être implémentées comme
> contraintes Python (`@api.constrains`) ou SQL (`_sql_constraints`),
> jamais comme validation uniquement côté frontend.

---

## 6. Sécurité Odoo

> **RULE-OO-15.** `ir.model.access.csv` MUST définir des accès par groupe,
> jamais pour `base.group_public`. Les groupes définis dans `solar_core` :
>
> | Groupe | Usage |
> |--------|-------|
> | `solar_core.group_investor` | Accès lecture propre portefeuille (par `ir.rule`) |
> | `solar_core.group_asset_manager` | Gestion des actifs solaires |
> | `solar_core.group_finance` | Gestion paiements, distributions de revenus |
> | `solar_core.group_compliance` | KYC, AML, accès audit complet |
> | `solar_kyc.group_kyc_operator` | Opérateur KYC (file de traitement) |
> | `solar_core.group_api` | Compte technique JSON-RPC (backend Node) |

> **RULE-OO-16.** Le compte technique utilisé par le backend Node
> (`ODOO_API_USER`) MUST appartenir au groupe `solar_core.group_api`
> et avoir uniquement les droits nécessaires (principe du moindre privilège).

> **RULE-OO-17.** Les règles d'enregistrement (`ir.rule`) MUST restreindre
> la visibilité des investisseurs à leurs propres données
> quand ils accèdent à l'interface Odoo native.

---

## 7. Vues XML

> **RULE-OO-18.** Les vues MUST être minimales et fonctionnelles.
> Elles servent aux opérateurs internes (back-office), pas aux investisseurs.

> **RULE-OO-19.** Les vues MUST utiliser des identifiants XML stables
> (`id` préfixé par le nom du module) :
>
> ✅ `id="solar_kyc.view_kyc_case_form"`
> ❌ `id="view_kyc_form"`

---

## 8. Migrations

> **RULE-OO-20.** Tout changement de schéma sur un modèle existant MUST
> être accompagné d'un script de migration dans :
> `solar_<bounded_context>/migrations/18.0.X.Y.Z/pre-migrate.py`
> ou `post-migrate.py`.

> **RULE-OO-21.** La version dans `__manifest__.py` MUST être incrémentée
> en même temps que le script de migration.
> Un changement de schéma sans incrément de version est une violation.

---

## 9. Tests

> **RULE-OO-22.** Les tests MUST hériter de `odoo.tests.common.TransactionCase`
> ou `SavepointCase`.

> **RULE-OO-23.** Chaque règle métier critique (validation KYC, whitelist,
> contrainte de transfert) MUST avoir au moins un test couvrant le cas
> nominal ET le cas d'erreur.

---

## 10. Exposition JSON-RPC

> **RULE-OO-24.** Odoo est interrogé exclusivement via JSON-RPC standard
> (`/jsonrpc` endpoint).
> Les contrôleurs HTTP custom (`@http.route`) MUST NOT être créés
> pour servir le backend Node. Tout passe par les méthodes de modèles via `call_kw`.

> **RULE-OO-25.** Les méthodes de modèles exposées au backend Node
> MUST retourner des structures sérialisables en JSON
> (pas d'objets Odoo recordset bruts).
