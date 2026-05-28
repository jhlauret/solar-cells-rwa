---
spec: architecture-principles
version: 1.0.0
status: active
applies-to: [all]
parent: constitution.md
---

# Architecture Principles — SolarCells RWA

> Ce fichier décrit les principes techniques structurants.
> Il est destiné à être lu par un LLM avant toute génération de code.
> Les règles sont numérotées et préfixées `RULE-ARCH-` pour référencement croisé.

---

## 1. Topologie des services

```
Browser
  │  HTTPS
  ▼
frontend-react          (Vite dev server :5173 | static build en prod)
  │  HTTPS / JSON REST
  ▼
backend-node            (Express :3001)
  │  HTTP JSON-RPC
  ▼
odoo                    (Odoo V18 Community :8069)
  │  SQL
  ▼
postgres                (PostgreSQL 16 — usage exclusif Odoo)
```

> **RULE-ARCH-01.** Cette topologie est immuable au MVP.
> Aucun service ne MUST court-circuiter un niveau.

> **RULE-ARCH-02.** Le frontend MUST communiquer uniquement avec le backend Node.
> Il MUST NOT appeler `/jsonrpc` sur Odoo, ni PostgreSQL directement.

> **RULE-ARCH-03.** Le backend Node MUST communiquer avec Odoo exclusivement
> via le protocole JSON-RPC sur `/jsonrpc`.
> Il MUST NOT accéder à PostgreSQL directement (pas de `pg`, `sequelize`,
> `prisma` sur des modèles métier).

---

## 2. Séparation des responsabilités

| Service | Ce qu'il fait | Ce qu'il ne fait JAMAIS |
|---------|--------------|------------------------|
| `frontend-react` | Afficher, collecter, valider les formulaires | Logique métier, appels Odoo directs, stockage de données sensibles |
| `backend-node` | Authentifier, orchestrer, transformer, relayer | Persistance métier, contournement d'Odoo, SQL direct |
| `odoo` | Détenir, valider, persister toutes les données métier | Servir directement le frontend |
| `postgres` | Stocker les données Odoo | Servir quoi que ce soit hors Odoo |

> **RULE-ARCH-04.** Le backend Node est un orchestrateur sans état métier.
> Toute donnée métier lue ou écrite transite via Odoo.
> La session utilisateur (token/cookie) n'est pas un état métier.

---

## 3. Contrat d'API backend ↔ frontend

> **RULE-ARCH-05.** Toutes les routes backend MUST suivre la convention :
> `GET|POST|PUT|PATCH|DELETE /api/v1/<resource>[/<id>][/<action>]`

> **RULE-ARCH-06.** Les payloads JSON MUST respecter le format d'enveloppe :
>
> **Succès :**
> ```json
> { "data": { … }, "meta": { … } }
> ```
> **Erreur :**
> ```json
> { "error": { "code": "RULE_VIOLATION", "message": "…", "field": "…" } }
> ```

> **RULE-ARCH-07.** Les codes HTTP MUST être sémantiques :
> `200` succès lecture, `201` création, `400` validation, `401` non authentifié,
> `403` non autorisé (ex. KYC invalide), `404` non trouvé, `422` règle métier,
> `500` erreur interne.

---

## 4. Contrat JSON-RPC backend ↔ Odoo

> **RULE-ARCH-08.** Le client JSON-RPC MUST être encapsulé dans un module dédié
> `backend-node/src/odoo/client.ts`.
> Aucun appel `fetch`/`axios` vers Odoo MUST NOT apparaître hors de ce module.

> **RULE-ARCH-09.** Chaque modèle Odoo exposé via JSON-RPC MUST avoir
> une interface TypeScript correspondante dans
> `backend-node/src/odoo/models/<model>.ts`.
> Ces interfaces sont déduites des champs Odoo — elles ne définissent pas le métier.

> **RULE-ARCH-10.** Les appels JSON-RPC MUST utiliser la méthode `call_kw`
> (ou `execute_kw` selon la version du client).
> Les méthodes custom sur des contrôleurs Odoo MUST passer par `/web/dataset/call_kw`.

---

## 5. Infrastructure Docker

> **RULE-ARCH-11.** L'environnement local MUST démarrer intégralement
> via `docker compose up -d`.
> Aucune dépendance système hors Docker MUST être requise pour démarrer le projet.

> **RULE-ARCH-12.** Les variables d'environnement MUST être lues depuis `.env`.
> Le fichier `.env.example` MUST rester synchronisé avec toutes les variables utilisées.

> **RULE-ARCH-13.** `docker-compose.override.yml` (ignoré par `.gitignore`)
> SHOULD être utilisé pour les surcharges locales.
> Il MUST NOT être commité.

> **RULE-ARCH-14.** Chaque service MUST avoir un `healthcheck` déclaré
> dans `docker-compose.yml` avant d'être considéré production-ready.

---

## 6. Nommage des ressources métier

> **RULE-ARCH-15.** Les ressources métier dans l'API backend MUST utiliser
> le vocabulaire du glossaire utilisateur (`docs/GLOSSARY.md`),
> pas le vocabulaire technique crypto.
>
> ✅ `/api/v1/assets` (actifs solaires)
> ❌ `/api/v1/tokens`
>
> ✅ `/api/v1/accounts` (comptes investisseur)
> ❌ `/api/v1/wallets`

---

## 7. Gestion des erreurs

> **RULE-ARCH-16.** Toutes les erreurs Odoo (JSON-RPC fault) MUST être
> interceptées et transformées en erreurs HTTP structurées côté backend.
> Les messages d'erreur Odoo bruts MUST NOT être renvoyés au frontend.

> **RULE-ARCH-17.** Le frontend MUST afficher des messages d'erreur
> en langage utilisateur final.
> Les codes d'erreur techniques MUST être loggés côté client (console.error)
> mais jamais affichés dans l'UI.

---

## 8. Logging & observabilité

> **RULE-ARCH-18.** Le backend MUST logger chaque appel JSON-RPC
> avec : méthode, modèle Odoo, durée, statut (succès/échec).
> Les données sensibles (mots de passe, tokens) MUST être masquées dans les logs.

> **RULE-ARCH-19.** Le niveau de log MUST être contrôlé par `LOG_LEVEL`
> dans `.env` (`debug` | `info` | `warn` | `error`).
