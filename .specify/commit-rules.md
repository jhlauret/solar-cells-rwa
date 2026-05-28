---
spec: commit-rules
version: 1.0.0
status: active
applies-to: [all]
parent: constitution.md
---

# Commit Rules — SolarCells RWA

> Ces règles s'appliquent à chaque commit dans le dépôt, sans exception.
> Elles sont destinées à être lues par un LLM avant toute proposition
> de commit, PR, ou séquence de commits.
> Un LLM MUST proposer des séquences de micro-commits,
> jamais un commit monolithique.

---

## 1. Principe fondamental

> **RULE-CM-01.** Un commit = une responsabilité unique.
> Si le message de commit contient le mot "et" entre deux actions,
> le commit MUST être découpé en deux.
>
> ✅ `feat(backend): add Zod schema for transfer endpoint`
> ❌ `feat(backend): add transfer schema and route and service`

> **RULE-CM-02.** Aucun commit MUST NOT casser le build, les tests,
> ou le linting sur la branche courante.
> Chaque commit MUST laisser le projet dans un état cohérent.

---

## 2. Format obligatoire — Conventional Commits

```
<type>(<scope>): <résumé impératif, ≤ 72 caractères>

[corps optionnel : pourquoi, pas quoi — le diff dit quoi]

[footer optionnel]
Refs: #<issue>
BREAKING CHANGE: <description>
```

> **RULE-CM-03.** Le format Conventional Commits est obligatoire.
> Tout commit ne respectant pas ce format MUST être rejeté en revue.

---

## 3. Types autorisés

| Type | Quand l'utiliser |
|------|-----------------|
| `feat` | Nouvelle fonctionnalité visible utilisateur ou API |
| `fix` | Correction de bug |
| `refactor` | Restructuration sans changement de comportement observable |
| `chore` | Outillage, dépendances, config (pas de comportement) |
| `docs` | Documentation uniquement (`.md`, commentaires) |
| `test` | Ajout ou modification de tests uniquement |
| `style` | Formatage, indentation (pas de logique) |
| `perf` | Optimisation de performance |
| `build` | Build system, Dockerfile, scripts de build |
| `ci` | Pipeline CI/CD |

> **RULE-CM-04.** `fix` MUST NOT être utilisé pour du refactoring.
> `refactor` MUST NOT introduire de nouveau comportement.
> La frontière est stricte.

---

## 4. Scopes obligatoires

| Scope | Périmètre |
|-------|-----------|
| `frontend` | Tout fichier sous `frontend-react/` |
| `backend` | Tout fichier sous `backend-node/` |
| `odoo` | Tout fichier sous `odoo-addons/` |
| `contracts` | Tout fichier sous `smart-contracts/` |
| `infra` | `docker-compose.yml`, Dockerfiles, CI |
| `docs` | Fichiers sous `docs/` |
| `specs` | Fichiers sous `specs/` |
| `specify` | Fichiers sous `.specify/` |
| `tests` | Fichiers sous `tests/` (tests transverses) |
| `repo` | Fichiers racine : `.gitignore`, `.editorconfig`, `README.md` |

> **RULE-CM-05.** Le scope MUST toujours être précisé.
> Un commit sans scope est invalide.

---

## 5. Granularité obligatoire

> **RULE-CM-06.** Un écran frontend (page + composants associés) MUST
> être découpé en une série de commits sur une branche dédiée.
> Ordre recommandé :
>
> 1. `chore(frontend): scaffold <ScreenName> page file`
> 2. `feat(frontend): add <ComponentA> UI component`
> 3. `feat(frontend): add <schema> Zod schema for <form>`
> 4. `feat(frontend): wire <form> to API endpoint`
> 5. `test(frontend): add tests for <ScreenName>`

> **RULE-CM-07.** Un module Odoo MUST être découpé en commits :
>
> 1. `chore(odoo): scaffold solarcells_<domain> module`
> 2. `feat(odoo): add <Model> model with base fields`
> 3. `feat(odoo): add ir.model.access for <Model>`
> 4. `feat(odoo): add <form/tree> view for <Model>`
> 5. `feat(odoo): add <method> business method on <Model>`
> 6. `test(odoo): add tests for <Model>`

> **RULE-CM-08.** Un endpoint backend MUST être découpé en commits :
>
> 1. `feat(backend): add Zod schema for <endpoint>`
> 2. `feat(backend): add Odoo model interface for <OdooModel>`
> 3. `feat(backend): add <service> service method`
> 4. `feat(backend): add <route> route with middleware chain`
> 5. `test(backend): add tests for <endpoint>`

---

## 6. Stratégie de branches

> **RULE-CM-09.** La branche `main` est protégée.
> Aucun commit direct sur `main`. Tout passe par une PR.

> **RULE-CM-10.** Nommage des branches :
>
> | Type | Format | Exemple |
> |------|--------|---------|
> | Feature | `feat/<scope>/<short-description>` | `feat/frontend/login-page` |
> | Fix | `fix/<scope>/<short-description>` | `fix/backend/jwt-expiry` |
> | Refactor | `refactor/<scope>/<short-description>` | `refactor/odoo/partner-model` |
> | Docs/Spec | `docs/<short-description>` | `docs/architecture-update` |
> | Spec amend | `spec/amend-<file>-v<X>` | `spec/amend-constitution-v2-1` |
> | Chore | `chore/<scope>/<short-description>` | `chore/infra/docker-healthchecks` |

> **RULE-CM-11.** Une branche = un périmètre fonctionnel cohérent.
> Les branches longue durée (> 3 jours sans merge) MUST être rebased
> régulièrement sur `main`.

---

## 7. Pull Requests

> **RULE-CM-12.** Chaque PR MUST référencer une spec (`specs/`) ou
> une règle (`.specify/`) justifiant la modification.
> Une PR sans contexte fonctionnel est bloquée.

> **RULE-CM-13.** Le titre d'une PR MUST suivre le format Conventional Commits.

> **RULE-CM-14.** Une PR MUST avoir au minimum :
> - Une description (quoi + pourquoi)
> - Un lien vers la spec ou le ticket
> - Les commits en micro-commits lisibles

---

## 8. Patterns interdits

> **RULE-CM-15.** Patterns de commit MUST NOT utilisés :
>
> | Interdit | Raison |
> |----------|--------|
> | `wip: …` | État de travail indéfini |
> | `fix: stuff` | Message non descriptif |
> | `chore: initial commit` (sur repo non vide) | Trop générique |
> | `feat: add frontend and backend` | Plusieurs responsabilités |
> | `update` seul | Aucune information |
> | `…` (ellipses seules) | Aucune information |
> | Commit de merge (sur branche feature) | Utiliser rebase |

> **RULE-CM-16.** MUST NOT commiter directement :
> - Fichiers `.env`
> - Fichiers `*.log`
> - Dossiers `node_modules/`, `dist/`, `build/`, `__pycache__/`
> - Secrets ou credentials, même de test

---

## 9. Instructions pour un LLM générant des commits

> Quand un LLM (Claude Code, Codex) génère une séquence de commits, il MUST :
>
> 1. **Lire ce fichier en premier** avant de proposer la moindre séquence.
> 2. **Proposer systématiquement** une liste numérotée de micro-commits,
>    chacun avec son message Conventional Commits complet.
> 3. **Ne jamais regrouper** deux responsabilités dans un seul commit.
> 4. **Identifier la branche** sur laquelle les commits seront appliqués.
> 5. **Vérifier** que chaque commit laisse le projet dans un état cohérent.
> 6. **Signaler explicitement** si une modification impacte plusieurs scopes
>    (la découper en commits séparés, un par scope).
>
> Exemple de format de réponse attendu d'un LLM :
>
> ```
> Branche : feat/backend/transfer-schema
>
> Commit 1 : chore(backend): scaffold transfers.schema.ts file
> Commit 2 : feat(backend): add CreateTransferDto Zod schema
> Commit 3 : feat(backend): add whitelist check validation in schema
> Commit 4 : test(backend): add unit tests for transfer schema
> ```
