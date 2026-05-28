# odoo-addons

Modules Odoo V18 spécifiques au projet SolarCells RWA.

Ce dossier est monté dans le conteneur Odoo sur `/mnt/extra-addons`
(voir `docker-compose.yml`).

## Principe

Odoo V18 est la **seule source de vérité métier**. Tous les concepts métier
(investisseurs, KYC, actifs solaires, parts détenues, transferts,
distributions de revenus, whitelist) sont modélisés ici sous forme de
modules Odoo (un par bounded context).

Voir `specs/mdd/00-overview.md` v2.1 pour le catalogue des 15 entités
et `docs/odoo-mdd.md` v1.0 pour le détail d'implémentation.

## Convention

Chaque module suit la convention :

```
solar_<bounded_context>/
├── __manifest__.py
├── __init__.py
├── README.md
├── models/
├── security/
├── views/
└── tests/
```

## Modules planifiés (11 addons)

| Module | Statut | Rôle |
|--------|--------|------|
| **`solar_audit`** | ✅ **v18.0.1.0.0** | Journal d'audit immuable (fondation) |
| `solar_core` | 🚧 À faire | Extension `res.partner`, groupes de sécurité |
| `solar_kyc` | 🚧 À faire | Cas KYC, documents, décisions |
| `solar_wallet` | 🚧 À faire | Wallets custodial |
| `solar_asset` | 🚧 À faire | Référentiel des actifs solaires |
| `solar_holding` | 🚧 À faire | Détentions par investisseur |
| `solar_investment` | 🚧 À faire | Ordres de souscription |
| `solar_payment` | 🚧 À faire | Transactions de paiement (in/out unifiées) |
| `solar_market` | 🚧 À faire | Marketplace secondaire |
| `solar_yield` | 🚧 À faire | Distribution de revenus |
| `solar_compliance` | 🚧 À faire | Alertes AML, screening sanctions |

## Ordre d'installation

L'ordre de dépendances suivant DOIT être respecté à l'installation :

1. `solar_audit` ← aucune dépendance, base de tout
2. `solar_core` (minimal) ← dépend de `solar_audit`
3. `solar_kyc` ← dépend de `solar_core`
4. `solar_wallet` ← dépend de `solar_core`
5. `solar_core` (mise à jour) ← branche les relations vers `solar_kyc` et `solar_wallet`
6. `solar_asset`, `solar_holding`, `solar_payment`
7. `solar_investment` ← dépend de `solar_payment` et `solar_holding`
8. `solar_market`, `solar_yield`, `solar_compliance`

## Tests

Chaque module a son dossier `tests/` avec des tests héritant de
`odoo.tests.common.TransactionCase`.

Exécution :

```bash
docker compose exec odoo \
    odoo --test-enable --stop-after-init \
         --test-tags <module> \
         -d <database> \
         -i <module>
```

## Statut

✅ **1 / 11 modules implémentés** (`solar_audit`).

Voir `specs/mdd/00-overview.md` §16 "Ordre d'implémentation des addons"
pour la suite.
