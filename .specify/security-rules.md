---
spec: security-rules
version: 1.0.0
status: active
applies-to: [all]
parent: constitution.md
---

# Security Rules — SolarCells RWA

> Ces règles s'appliquent à l'ensemble du projet.
> Elles concernent la protection des données, la conformité KYC,
> la gestion des secrets, et le modèle de custody.
> Un LLM MUST lire ce fichier avant de générer tout code
> touchant à l'authentification, aux sessions, aux transferts, ou aux secrets.

---

## 1. Gestion des secrets

> **RULE-SEC-01.** Aucun secret (clé API, mot de passe, JWT secret,
> credentials Odoo, seed phrase) MUST NOT apparaître dans le code source.
> Les secrets vivent dans `.env`, jamais versionné.

> **RULE-SEC-02.** `.env` MUST être listé dans `.gitignore`.
> `.env.example` MUST être maintenu avec des valeurs placeholder
> et MUST être commité.

> **RULE-SEC-03.** Les variables d'environnement sensibles MUST être
> validées au démarrage (voir `backend-rules.md` RULE-BE-20).
> Le serveur MUST refuser de démarrer si une variable critique est absente.

> **RULE-SEC-04.** MUST NOT : secrets en variables d'environnement Docker
> dans `docker-compose.yml` commité. Utiliser l'interpolation `${VAR}`
> depuis le fichier `.env` non versionné.

---

## 2. Authentification frontend ↔ backend

> **RULE-SEC-05.** L'authentification des utilisateurs (investisseurs)
> MUST être gérée par le backend Node.
> Le frontend MUST recevoir un cookie de session HttpOnly signé,
> jamais un JWT stocké dans `localStorage`.

> **RULE-SEC-06.** Les cookies de session MUST avoir les attributs :
> `HttpOnly`, `Secure` (production), `SameSite=Strict`.

> **RULE-SEC-07.** La durée de vie de la session MUST être configurée
> dans `.env` (`SESSION_MAX_AGE`).
> Une session inactive MUST expirer après la durée configurée.

> **RULE-SEC-08.** Les endpoints de l'API backend MUST être protégés
> par `auth.middleware.ts` par défaut.
> Les routes publiques (login, health check) MUST être explicitement marquées
> comme exemptées et documentées dans le code.

---

## 3. KYC — Validation obligatoire

> **RULE-SEC-09.** Aucune opération financière (souscription, transfert,
> réception de revenus) MUST NOT être exécutée pour un investisseur
> dont le statut KYC dans Odoo n'est pas `validated`.

> **RULE-SEC-10.** Le statut KYC MUST être vérifié en temps réel
> dans Odoo via JSON-RPC avant chaque opération financière.
> Un cache KYC côté backend MUST NOT être utilisé pour des décisions
> d'autorisation financière.

> **RULE-SEC-11.** `kyc.middleware.ts` MUST être appliqué sur toutes
> les routes d'opérations financières :
>
> ```
> POST /api/v1/subscriptions
> POST /api/v1/transfers
> GET  /api/v1/revenues          (pour déclencher la distribution)
> ```

> **RULE-SEC-12.** Lorsque le KYC est refusé (`rejected`), le backend
> MUST retourner `403` avec le code `KYC_REJECTED`.
> Lorsqu'il est en attente (`pending`), `403` avec `KYC_PENDING`.
> Le frontend MUST afficher un message utilisateur en langage non-technique.

---

## 4. Wallets custodial (MVP)

> **RULE-SEC-13.** Les wallets sont custodial au MVP.
> Aucune clé privée MUST NOT être générée côté client,
> stockée dans le navigateur, ou transmise via l'API.

> **RULE-SEC-14.** La référence du compte custodial d'un investisseur
> MUST être stockée dans Odoo (champ `x_wallet_ref` sur `res.partner`).
> Elle identifie le compte dans le système custodian tiers, pas une clé privée.

> **RULE-SEC-15.** Toute opération sur le compte custodial MUST transiter
> par le backend Node → service custodian.
> Le frontend MUST NOT connaître l'implémentation custodian.

---

## 5. Transferts — Whitelist obligatoire

> **RULE-SEC-16.** Aucun transfert entre investisseurs MUST NOT être exécuté
> sans vérification préalable que le destinataire est dans la whitelist
> de l'expéditeur (ou la whitelist globale selon le modèle choisi).

> **RULE-SEC-17.** La whitelist MUST être gérée dans Odoo
> (modèle `solarcells_transfer`).
> Le backend MUST interroger Odoo pour valider la whitelist
> avant toute exécution de transfert.

> **RULE-SEC-18.** Un transfert vers un destinataire non-whitelisté
> MUST retourner `422` avec le code `TRANSFER_NOT_WHITELISTED`.
> Ce message MUST utiliser le vocabulaire du glossaire utilisateur.

---

## 6. Authentification backend ↔ Odoo

> **RULE-SEC-19.** Le backend Node utilise un compte technique Odoo dédié
> (`ODOO_API_USER` / `ODOO_API_PASSWORD`).
> Ce compte MUST appartenir au groupe `solarcells.group_api`
> avec les droits minimaux nécessaires.

> **RULE-SEC-20.** Les credentials du compte technique Odoo
> MUST être stockés dans `.env` uniquement.
> Ils MUST NOT apparaître dans les logs.

> **RULE-SEC-21.** La session JSON-RPC du compte technique MUST être
> renouvelée côté backend en cas d'expiration,
> sans intervention manuelle.

---

## 7. Protection des données personnelles

> **RULE-SEC-22.** Les données KYC (pièces d'identité, justificatifs)
> MUST être stockées dans le système KYC tiers ou dans Odoo,
> jamais dans le backend Node ni dans le frontend.

> **RULE-SEC-23.** Les réponses API MUST ne retourner que les champs
> strictement nécessaires à l'affichage.
> Un endpoint de liste MUST NOT retourner des données KYC sensibles.

> **RULE-SEC-24.** Les logs MUST masquer :
> - adresses email complètes (remplacer par `j***@domain.com`)
> - tout identifiant national
> - soldes et montants financiers au niveau `debug` uniquement

---

## 8. Sécurité des entrées

> **RULE-SEC-25.** Toute entrée utilisateur (body, query, params)
> MUST être validée par un schéma Zod côté backend
> avant tout traitement.
> Voir `backend-rules.md` RULE-BE-11.

> **RULE-SEC-26.** Les paramètres passés aux appels Odoo JSON-RPC
> MUST être typés et validés avant l'appel.
> Aucune interpolation de string utilisateur dans un domain Odoo.

---

## 9. Headers de sécurité HTTP

> **RULE-SEC-27.** Le backend Express MUST configurer les headers de sécurité
> via `helmet` (ou équivalent) :
> `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
> `Strict-Transport-Security` (production), `Referrer-Policy`.

> **RULE-SEC-28.** CORS MUST être configuré explicitement :
> seules les origines autorisées (frontend URL) MUST être acceptées.
> `origin: '*'` est interdit en production.

---

## 10. Audit

> **RULE-SEC-29.** Odoo MUST enregistrer un historique d'audit (`tracking=True`)
> sur tous les champs métier sensibles :
> statut KYC, montant de détention, statut de transfert, distribution de revenus.

> **RULE-SEC-30.** Le backend MUST logger chaque tentative d'opération
> financière (souscription, transfert) avec :
> horodatage ISO, identifiant investisseur (hashé), action, résultat (succès/refus), motif.
