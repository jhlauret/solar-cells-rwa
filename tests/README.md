# tests

Tests transverses qui dépassent le périmètre d'un seul service.

> Les tests unitaires de chaque service vivent dans leur propre dossier (`frontend-react/`, `backend-node/`, `odoo-addons/<module>/tests`). Ce dossier-ci concentre les tests **multi-services**.

## Sous-dossiers
- `e2e/` — scénarios bout-en-bout (frontend ↔ backend ↔ Odoo).
- `integration/` — tests d'intégration entre deux services (ex. backend ↔ Odoo JSON-RPC).
- `unit/` — utilitaires de test partagés.

## Outils prévus (à figer dans une spec dédiée)
- E2E : Playwright (proposé).
- Intégration backend ↔ Odoo : Vitest + client JSON-RPC mocké ou Odoo de test.

## Statut
🚧 Aucun test écrit. Squelettes vides.
