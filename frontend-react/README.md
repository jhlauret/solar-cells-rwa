# frontend-react

Application web destinée aux investisseurs.

## Stack imposée
- React 18+
- TypeScript (strict)
- Vite
- Tailwind CSS
- React Hook Form + Zod pour **tous** les formulaires
- React Router

## Règles de structuration
- **Ultra-segmenté.** Petits composants à responsabilité unique.
- **Tous les composants UI doivent être réutilisables.** Pas de composant couplé à un écran.
- **Un écran = une branche Git** ou une série de petits commits.
- **Aucun jargon crypto visible.** Pas de "wallet", "blockchain", "token" dans l'UI utilisateur final ; préférer "compte", "actif solaire", "part".
- L'état serveur passe **uniquement par le backend Node**, jamais directement par Odoo depuis le navigateur.

## Organisation cible (à créer commit par commit)
```
src/
├── components/   # composants UI réutilisables (Button, Input, Card…)
├── features/     # logique par domaine (auth, kyc, portfolio, transferts…)
├── pages/        # écrans assemblant des features
├── lib/          # helpers (api client, formatters, validators Zod)
├── hooks/        # hooks transverses
├── routes/       # configuration du routeur
└── types/        # types partagés
```

**New !  From JHL Extraction  du ZIP complet du projet la partie Front End uniquement**
https://github.com/jhlauret/solar-cells-rwa/issues/21

**Est ce que tu peux me lister les 25 pages ? ├── src/pages/ 25 pages**
https://github.com/jhlauret/solar-cells-rwa/issues/21#issuecomment-4564095386

## Statut
🚧 Non initialisé. Aucun `package.json` à ce stade.
