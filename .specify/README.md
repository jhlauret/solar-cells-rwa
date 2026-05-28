---
spec: index
version: 2.0.0
status: active
---

# .specify — SolarCells RWA

Dossier de gouvernance spec-driven du projet.
Compatible **GitHub Spec Kit**, **Claude Code**, **Codex**.

> Tout LLM ou développeur intervenant sur ce projet MUST lire
> les fichiers pertinents de ce dossier avant de générer ou de modifier du code.

---

## Hiérarchie des fichiers

| Fichier | Rôle | Lire en priorité si… |
|---------|------|----------------------|
| [`constitution.md`](./constitution.md) | Règles suprêmes, non dérogeables | Toujours, en premier |
| [`architecture-principles.md`](./architecture-principles.md) | Topologie, contrats d'API, flux de données | Toute modification structurelle |
| [`frontend-rules.md`](./frontend-rules.md) | React, RHF+Zod, Tailwind, vocabulaire UI | Tout code sous `frontend-react/` |
| [`backend-rules.md`](./backend-rules.md) | Express, JSON-RPC Odoo, validation, erreurs | Tout code sous `backend-node/` |
| [`odoo-rules.md`](./odoo-rules.md) | Modules, modèles, sécurité, migrations | Tout code sous `odoo-addons/` |
| [`security-rules.md`](./security-rules.md) | KYC, whitelist, custody, secrets, audit | Tout code touchant à l'auth ou aux transactions |
| [`commit-rules.md`](./commit-rules.md) | Micro-commits, branches, PR, formats | Avant de proposer tout commit |

---

## Référencement des règles

Chaque règle est préfixée par un identifiant unique :
- `RULE-C-XX` → constitution
- `RULE-ARCH-XX` → architecture-principles
- `RULE-FE-XX` → frontend-rules
- `RULE-BE-XX` → backend-rules
- `RULE-OO-XX` → odoo-rules
- `RULE-SEC-XX` → security-rules
- `RULE-CM-XX` → commit-rules

Ces identifiants peuvent être référencés dans les PRs, issues et commentaires de code.

---

## Processus d'amendement

Toute modification de ce dossier MUST :
1. Passer par une branche `spec/amend-<fichier>-vX-Y`.
2. Incrémenter le champ `version` dans le frontmatter du fichier modifié.
3. Faire l'objet d'un commit dédié `docs(.specify): …`.
4. Être revue avant merge sur `main`.
