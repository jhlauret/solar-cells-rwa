---
spec: backend-rules
version: 1.0.0
status: active
applies-to: [backend-node]
parent: constitution.md
stack: [Node.js 20+, TypeScript strict, Express, Zod, JSON-RPC]
---

# Backend Rules — SolarCells RWA

> Ces règles s'appliquent à tout fichier sous `backend-node/`.
> Le backend est un **orchestrateur sans état métier**.
> Il traduit, valide, agrège et relaie. Il n'invente rien.

---

## 1. Structure de fichiers

```
backend-node/src/
├── server.ts                # Bootstrap Express, middlewares globaux, démarrage
├── routes/                  # Déclarations de routes par domaine
│   ├── index.ts             # Agrégation des routers
│   ├── auth.routes.ts
│   ├── assets.routes.ts
│   ├── portfolio.routes.ts
│   ├── transfers.routes.ts
│   └── revenues.routes.ts
├── services/                # Logique applicative (orchestration)
│   ├── auth.service.ts
│   ├── assets.service.ts
│   ├── portfolio.service.ts
│   ├── transfers.service.ts
│   └── revenues.service.ts
├── odoo/                    # Tout ce qui touche à Odoo
│   ├── client.ts            # Client JSON-RPC encapsulé
│   ├── session.ts           # Gestion de la session Odoo technique
│   └── models/              # Interfaces TypeScript des modèles Odoo
│       ├── partner.ts
│       ├── asset.ts
│       ├── holding.ts
│       ├── transfer.ts
│       └── revenue.ts
├── middlewares/
│   ├── auth.middleware.ts   # Vérification token/session frontend
│   ├── kyc.middleware.ts    # Vérification statut KYC dans Odoo
│   ├── validate.middleware.ts # Validation Zod des requêtes entrantes
│   └── error.middleware.ts  # Handler d'erreur centralisé
├── schemas/                 # Schémas Zod des requêtes/réponses
│   ├── auth.schema.ts
│   ├── transfer.schema.ts
│   └── …
└── lib/
    ├── logger.ts            # Logger structuré (pino recommandé)
    ├── env.ts               # Validation des variables d'environnement au démarrage
    └── errors.ts            # Classes d'erreur métier typées
```

> **RULE-BE-01.** Cette structure MUST être respectée pour tout nouveau fichier.
> Aucun accès Odoo MUST NOT apparaître hors du dossier `odoo/`.

---

## 2. Interdictions absolues

> **RULE-BE-02.** MUST NOT : toute dépendance à `pg`, `prisma`, `sequelize`,
> `typeorm`, `mongoose`, `sqlite3`, `better-sqlite3` ou tout ORM/client de BDD.
> Le backend n'a pas de base de données.

> **RULE-BE-03.** MUST NOT : `fetch` ou `axios` appelé directement dans
> une route, un service, ou un middleware pour joindre Odoo.
> Utiliser exclusivement `odoo/client.ts`.

> **RULE-BE-04.** MUST NOT : logique métier dans les handlers de routes.
> Un handler de route MUST contenir : validation → appel service → réponse.
> La logique vit dans `services/`.

> **RULE-BE-05.** MUST NOT : données sensibles loggées (mots de passe,
> tokens, UIDs Odoo bruts, données KYC). Les masquer avec `[REDACTED]`.

---

## 3. Client JSON-RPC Odoo

> **RULE-BE-06.** Le client JSON-RPC MUST être le seul point d'entrée
> vers Odoo depuis le backend.
> Il MUST exposer des méthodes typées :
>
> ```typescript
> // odoo/client.ts — interface minimale attendue
> interface OdooClient {
>   searchRead<T>(model: string, domain: Domain, fields: string[], opts?: SearchOpts): Promise<T[]>;
>   create<T>(model: string, values: Partial<T>): Promise<number>;
>   write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean>;
>   unlink(model: string, ids: number[]): Promise<boolean>;
>   callMethod<T>(model: string, method: string, args: unknown[], kwargs?: Record<string, unknown>): Promise<T>;
> }
> ```

> **RULE-BE-07.** La session technique Odoo (authentification du compte de service)
> MUST être gérée dans `odoo/session.ts` et renouvelée automatiquement
> en cas d'expiration.

> **RULE-BE-08.** Toute erreur retournée par Odoo (fault JSON-RPC)
> MUST être interceptée, loggée, et transformée en `ApiError` typé
> avant d'être propagée vers le middleware d'erreur Express.
> Le message brut Odoo MUST NOT atteindre le frontend.

---

## 4. Modèles Odoo (interfaces TypeScript)

> **RULE-BE-09.** Chaque modèle Odoo utilisé par le backend MUST avoir
> une interface TypeScript dans `odoo/models/<model>.ts`.
> Ces interfaces représentent les champs lus depuis Odoo, pas des entités métier.
>
> ```typescript
> // odoo/models/partner.ts
> export interface OdooPartner {
>   id: number;
>   name: string;
>   email: string;
>   x_kyc_status: 'pending' | 'validated' | 'rejected';
>   x_kyc_validated_at: string | false;
>   active: boolean;
> }
> ```

> **RULE-BE-10.** Les champs custom Odoo (préfixés `x_`) MUST être
> documentés avec un commentaire indiquant leur module Odoo source.

---

## 5. Validation des entrées

> **RULE-BE-11.** Chaque route MUST valider ses entrées (body, params, query)
> via un schéma Zod avant d'atteindre le service.
> Le middleware `validate.middleware.ts` MUST être utilisé pour cela.
>
> ```typescript
> router.post('/transfers',
>   authMiddleware,
>   kycMiddleware,
>   validate(transferSchema),
>   transferController.create
> );
> ```

> **RULE-BE-12.** Les schémas Zod des requêtes entrantes MUST vivre dans `schemas/`.
> Ils MUST NOT être définis inline dans les routes.

---

## 6. Authentification & sessions

> **RULE-BE-13.** L'authentification frontend MUST être gérée par le backend,
> indépendamment de la session Odoo technique.
> Ce sont deux sessions distinctes :
>
> | Session | Usage | Stockage |
> |---------|-------|----------|
> | Session technique Odoo | Backend → Odoo (compte de service) | Mémoire serveur |
> | Session utilisateur frontend | Frontend → Backend | Cookie HttpOnly signé |

> **RULE-BE-14.** Le token/cookie de session utilisateur MUST être vérifié
> par `auth.middleware.ts` sur toutes les routes protégées.

> **RULE-BE-15.** Le middleware KYC (`kyc.middleware.ts`) MUST interroger
> le statut KYC depuis Odoo en temps réel (pas de cache) pour les opérations
> financières (souscription, transfert, distribution).

---

## 7. Structure des réponses

> **RULE-BE-16.** Toutes les réponses MUST respecter l'enveloppe définie
> dans `architecture-principles.md` (RULE-ARCH-06).

> **RULE-BE-17.** Les codes HTTP MUST être sémantiques (RULE-ARCH-07).
> Un service qui retourne `200` avec `{ success: false }` est une violation.

---

## 8. Gestion des erreurs

> **RULE-BE-18.** Le middleware `error.middleware.ts` MUST être le seul endroit
> où les erreurs sont transformées en réponses HTTP.
> Aucun `res.status(500).json(…)` MUST NOT apparaître dans les routes ou services.

> **RULE-BE-19.** Les classes d'erreur MUST être définies dans `lib/errors.ts` :
>
> ```typescript
> export class KycNotValidatedError extends AppError {
>   constructor() {
>     super('KYC_NOT_VALIDATED', 403, 'Votre conformité n\'est pas encore validée.');
>   }
> }
> export class TransferNotWhitelistedError extends AppError { … }
> ```

---

## 9. Variables d'environnement

> **RULE-BE-20.** Toutes les variables d'environnement MUST être validées
> au démarrage du serveur via un schéma Zod dans `lib/env.ts`.
> Si une variable obligatoire est absente, le serveur MUST refuser de démarrer
> avec un message d'erreur explicite.
>
> ```typescript
> // lib/env.ts
> const envSchema = z.object({
>   NODE_ENV: z.enum(['development', 'production', 'test']),
>   ODOO_JSONRPC_URL: z.string().url(),
>   ODOO_API_USER: z.string().min(1),
>   ODOO_API_PASSWORD: z.string().min(1),
>   SESSION_SECRET: z.string().min(32),
>   BACKEND_PORT: z.coerce.number().default(3001),
> });
> export const env = envSchema.parse(process.env);
> ```

---

## 10. TypeScript

> **RULE-BE-21.** `tsconfig.json` MUST activer `"strict": true`.

> **RULE-BE-22.** `any` MUST NOT être utilisé.
> `unknown` est autorisé avec narrowing explicite via `zod.safeParse` ou `instanceof`.

> **RULE-BE-23.** Les types de retour des fonctions publiques MUST être
> déclarés explicitement (pas d'inférence seule sur les signatures publiques).
