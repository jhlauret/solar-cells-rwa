---
spec: constitution
version: 2.0.0
status: active
supersedes: 1.0.0
applies-to: [all]
references:
  - architecture-principles.md
  - frontend-rules.md
  - backend-rules.md
  - odoo-rules.md
  - security-rules.md
  - commit-rules.md
---

# Constitution — SolarCells RWA

> Document suprême. Toute règle des autres fichiers `.specify/` découle de cette constitution.
> En cas de conflit, la constitution prévaut.
> Toute modification exige un commit dédié `docs(.specify): amend constitution vX.Y.Z`
> suivi d'une revue explicite par le responsable technique.

---

## 1. Identité du projet

**SolarCells RWA** est une plateforme permettant à des investisseurs KYC validés
d'acheter, détenir, transférer et recevoir des revenus liés à des actifs solaires.

Les actifs sont représentés de façon tokenisée en backend,
**sans jamais exposer de jargon blockchain à l'utilisateur final.**

---

## 2. Hiérarchie des sources de vérité

| Rang | Source | Périmètre |
|------|--------|-----------|
| 1 | **Odoo V18** | Toute la logique métier |
| 2 | **Ce dossier `.specify/`** | Toutes les règles de génération de code |
| 3 | **`docs/`** | Documentation humaine (architecture, glossaire) |
| 4 | **`specs/`** | Spécifications fonctionnelles |

> **RULE-C-01.** Odoo V18 Community est la seule source de vérité métier.
> Aucun service externe ne peut stocker ni émettre des données métier de façon autonome.

---

## 3. Règles absolues (non dérogeables)

> **RULE-C-02.** Le backend Node.js MUST NOT posséder de base de données métier.
> Il est un orchestrateur sans état métier.

> **RULE-C-03.** Toute communication backend → Odoo MUST passer par JSON-RPC.
> Aucun accès direct à PostgreSQL depuis Node.js.

> **RULE-C-04.** PostgreSQL est réservé à Odoo. Aucun autre service MUST NOT
> s'y connecter.

> **RULE-C-05.** Le frontend MUST NOT appeler Odoo directement.
> Tout appel passe par le backend Node.js.

> **RULE-C-06.** Aucun jargon crypto (wallet, blockchain, token, mint, gas…)
> MUST NOT apparaître dans l'interface utilisateur.
> Se référer à `docs/GLOSSARY.md`.

> **RULE-C-07.** Les wallets sont custodial au MVP.
> Aucune clé privée ne MUST être exposée, générée côté client, ni stockée en clair.

> **RULE-C-08.** Tous les transferts MUST être vérifiés contre une whitelist
> avant toute exécution.

> **RULE-C-09.** Seuls les investisseurs dont le statut KYC est `validated`
> dans Odoo MUST pouvoir réaliser des opérations financières.

> **RULE-C-10.** Aucun secret (clé API, mot de passe, JWT secret…)
> MUST NOT être commité dans le dépôt.
> Les secrets vivent dans `.env` (jamais versionné).

---

## 4. Règles de génération de code

> **RULE-C-11.** Un commit = une responsabilité unique.
> Voir `commit-rules.md`.

> **RULE-C-12.** Tous les formulaires frontend MUST utiliser React Hook Form + Zod.
> Aucune alternative n'est acceptée.

> **RULE-C-13.** Tous les composants UI frontend MUST être réutilisables.
> Un composant couplé à un seul écran est un défaut de conception.

> **RULE-C-14.** Le frontend MUST être ultra-segmenté.
> Un fichier = un composant. Un composant = une responsabilité.

> **RULE-C-15.** TypeScript strict mode MUST être activé
> sur le frontend et le backend.

---

## 5. Périmètre MVP

Les éléments suivants sont **hors périmètre MVP** et MUST NOT être implémentés
sans décision documentée dans ce fichier :

- Wallets non-custodial
- Smart contracts en production (dossier `smart-contracts/` en stand-by)
- Base de données métier hors Odoo
- API publique non authentifiée
- Jargon crypto dans l'UI

---

## 6. Processus d'amendement

1. Ouvrir une branche `spec/amend-constitution-vX-Y-Z`.
2. Modifier ce fichier avec justification dans le corps du commit.
3. Mettre à jour `version` dans le frontmatter.
4. Revue obligatoire avant merge sur `main`.
5. Annoncer l'amendement dans `docs/ARCHITECTURE.md` si l'impact est structurel.
