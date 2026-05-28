# backend-node

API d'orchestration entre le frontend et Odoo V18.

## Rôle
- Exposer une API REST/JSON consommée par le frontend.
- Parler à Odoo V18 **uniquement via JSON-RPC**.
- Gérer l'authentification frontend, les sessions, la validation des entrées.
- Orchestrer les workflows multi-étapes (KYC, transferts whitelistés, distribution de revenus).

## Stack imposée
- Node.js 20+
- TypeScript (strict)
- Express
- Validation entrée/sortie : Zod

## Règles absolues
- **Aucune base métier locale.** Pas de Postgres, pas de SQLite, pas de table métier.
- **Aucune persistance métier** côté Node : tout ce qui est métier vit dans Odoo.
- Caches techniques (mémoire, session) autorisés, mais **jamais** comme source de vérité.
- Toutes les écritures métier transitent par un appel JSON-RPC à Odoo.

## Organisation cible (à créer commit par commit)
```
src/
├── routes/       # endpoints HTTP par domaine
├── services/     # logique applicative (orchestration)
├── odoo/         # client JSON-RPC, mappers, types des modèles Odoo
├── middlewares/  # auth, validation, error handler
├── schemas/      # schémas Zod partagés
├── lib/          # helpers techniques
└── server.ts     # bootstrap Express
```

## Statut
🚧 Non initialisé. Aucun `package.json` à ce stade.
