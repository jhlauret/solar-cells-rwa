---
spec: frontend-rules
version: 1.0.0
status: active
applies-to: [frontend-react]
parent: constitution.md
stack: [React 18+, TypeScript strict, Vite, Tailwind CSS, React Hook Form, Zod, React Router]
---

# Frontend Rules — SolarCells RWA

> Ces règles s'appliquent à tout fichier sous `frontend-react/`.
> Elles sont destinées à être lues par un LLM avant toute génération de code frontend.

---

## 1. Structure de fichiers

```
frontend-react/src/
├── components/          # Composants UI réutilisables (atomes, molécules)
│   ├── ui/              # Primitives : Button, Input, Select, Modal, Badge…
│   └── shared/          # Composants métier réutilisables : InvestorCard, AssetBadge…
├── features/            # Logique par domaine fonctionnel
│   ├── auth/            # Authentification, session
│   ├── kyc/             # Parcours KYC
│   ├── portfolio/       # Détention d'actifs
│   ├── transfers/       # Cessions whitelistées
│   └── revenues/        # Distribution de revenus
├── pages/               # Écrans (assemblent des features)
├── routes/              # Configuration React Router
├── hooks/               # Hooks transverses (useAuth, useToast…)
├── lib/
│   ├── api/             # Client HTTP vers le backend (fetch wrapper)
│   ├── validators/      # Schémas Zod partagés
│   └── formatters/      # Formatage date, montant, statuts
└── types/               # Types TypeScript partagés
```

> **RULE-FE-01.** Cette structure MUST être respectée pour tout nouveau fichier.
> Un fichier placé au mauvais niveau est un défaut de structure.

> **RULE-FE-02.** Un fichier = un composant ou une fonction exportée principale.
> Les fichiers multi-exports sont interdits sauf pour les fichiers `index.ts` de barrel.

---

## 2. Composants

> **RULE-FE-03.** Tous les composants MUST être des fonctions React (pas de classes).

> **RULE-FE-04.** Tous les composants MUST être typés avec TypeScript strict.
> `any` MUST NOT être utilisé. `unknown` est autorisé avec narrowing explicite.

> **RULE-FE-05.** Tous les composants `src/components/` MUST être réutilisables.
> Un composant qui importe un store ou un hook de feature spécifique
> MUST être déplacé dans `src/features/<feature>/`.

> **RULE-FE-06.** Les composants MUST utiliser des exports nommés.
> `export default` est interdit sauf pour les pages (`src/pages/`).
>
> ✅ `export function Button({ … }: ButtonProps) { … }`
> ❌ `export default function Button() { … }`  (hors pages)

> **RULE-FE-07.** Les props MUST être typées avec une interface nommée
> `<ComponentName>Props`, déclarée dans le même fichier.
>
> ```typescript
> interface ButtonProps {
>   label: string;
>   variant?: 'primary' | 'secondary' | 'ghost';
>   disabled?: boolean;
>   onClick?: () => void;
> }
> export function Button({ label, variant = 'primary', … }: ButtonProps) { … }
> ```

---

## 3. Formulaires — React Hook Form + Zod

> **RULE-FE-08.** TOUS les formulaires MUST utiliser React Hook Form + Zod.
> Aucun formulaire ne MUST utiliser `useState` pour gérer les champs.
> `useForm` est obligatoire. Le resolver MUST être `zodResolver`.

> **RULE-FE-09.** Chaque formulaire MUST avoir un schéma Zod colocalisé
> ou importé depuis `src/lib/validators/`.
>
> ```typescript
> const transferSchema = z.object({
>   recipientId: z.string().min(1, 'Bénéficiaire requis'),
>   amount:      z.number().positive('Montant invalide'),
>   assetId:     z.string().uuid('Actif invalide'),
> });
> type TransferFormValues = z.infer<typeof transferSchema>;
> ```

> **RULE-FE-10.** La soumission de formulaire MUST gérer trois états distincts :
> `idle`, `loading`, `error`. Le bouton de soumission MUST être désactivé
> pendant `loading`.

> **RULE-FE-11.** Les messages d'erreur de validation MUST provenir du schéma Zod,
> jamais d'une string hardcodée dans le composant.

---

## 4. Appels API

> **RULE-FE-12.** Tous les appels HTTP MUST passer par le client centralisé
> `src/lib/api/client.ts`.
> `fetch` et `axios` MUST NOT être appelés directement dans les composants ou hooks.

> **RULE-FE-13.** Les appels API MUST retourner un type discriminé :
>
> ```typescript
> type ApiResult<T> =
>   | { ok: true;  data: T }
>   | { ok: false; error: ApiError };
> ```
>
> Le consommateur MUST vérifier `ok` avant d'accéder à `data`.

> **RULE-FE-14.** L'état serveur (données issues de l'API) MUST être géré
> par un hook dédié par ressource (`usePortfolio`, `useTransfers`…),
> jamais directement dans les composants de page.

---

## 5. Style — Tailwind CSS

> **RULE-FE-15.** Le style MUST être appliqué via des classes Tailwind.
> Les fichiers `.css` custom MUST NOT exister sauf pour les animations complexes
> non disponibles dans Tailwind, documentées avec un commentaire.

> **RULE-FE-16.** Les classes Tailwind conditionnelles MUST utiliser `clsx` ou `cn`
> (wrapper de `clsx` + `tailwind-merge`).
> Les ternaires inline sur `className` avec plus de 2 conditions sont interdits.
>
> ✅ `className={cn('btn', isActive && 'btn-active', variant === 'ghost' && 'btn-ghost')}`
> ❌ `className={'btn' + (isActive ? ' btn-active' : '') + (variant === 'ghost' ? ' btn-ghost' : '')}`

> **RULE-FE-17.** Les tokens de design (couleurs, spacing) MUST être définis
> dans `tailwind.config.ts`, jamais en valeur arbitraire `[]` dans les composants.

---

## 6. Vocabulaire UI

> **RULE-FE-18.** Le vocabulaire de surface MUST respecter la charte éditoriale
> définie dans `docs/GLOSSARY.md`. SolarCells est une plateforme **RWA pédagogique**
> qui assume ses termes métier pour éduquer ses investisseurs.
>
> | Contexte | Terme autorisé | Terme interdit |
> |----------|---------------|----------------|
> | Nom des parts | Solar Cell, Solar Cells | token, crypto |
> | Compte de détention | Coffre numérique, Compte sécurisé | wallet (à éviter sauf contexte technique B2B) |
> | Technologie sous-jacente | Registre sécurisé, technologie blockchain | DeFi, smart contract, gas, mint, burn |
> | Stablecoins | Euros numériques, EURC, USDC | crypto-monnaie |
> | Transferts | Cession, Transfert sécurisé | on-chain, off-chain |
> | UI grand public | Vocabulaire ci-dessus | Aucun jargon DeFi |
> | Documentation interne / B2B | Terminologie technique complète autorisée | — |
>
> **Amendement v1.1 (2025-05) :** La règle précédente (interdiction totale de
> "wallet", "token", "blockchain") est remplacée par cette charte nuancée,
> suite à l'analyse des 14 écrans validés par le design (cinématique PDF v1)
> qui utilisent délibérément "Solar Cell Token", "coffre numérique" et
> "tokenisés" comme leviers pédagogiques, pas comme jargon technique.

---

## 7. Routing

> **RULE-FE-19.** Toutes les routes MUST être déclarées dans `src/routes/`.
> Aucune route MUST NOT être déclarée directement dans un composant de page.

> **RULE-FE-20.** Les routes protégées (utilisateur authentifié + KYC validé)
> MUST être encapsulées dans un composant `ProtectedRoute`
> vérifiant les deux conditions.

---

## 8. TypeScript

> **RULE-FE-21.** `tsconfig.json` MUST activer :
> `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`.

> **RULE-FE-22.** Les types métier (investisseur, actif, transfert, revenu)
> MUST être définis dans `src/types/` et importés, jamais re-déclarés inline.

> **RULE-FE-23.** Les enums TypeScript MUST NOT être utilisés.
> Préférer les `const` objects avec `as const` ou les union types littéraux.
>
> ✅ `type KycStatus = 'pending' | 'validated' | 'rejected';`
> ❌ `enum KycStatus { Pending, Validated, Rejected }`

---

## 9. Interdictions absolues

> **RULE-FE-24.** MUST NOT : `localStorage` ou `sessionStorage` pour des données
> sensibles (token, données KYC, soldes). Les tokens d'authentification
> MUST résider dans un cookie HttpOnly géré par le backend.

> **RULE-FE-25.** MUST NOT : inline styles (`style={{ … }}`), sauf pour des valeurs
> dynamiques impossibles via Tailwind (ex. hauteur calculée en JS).

> **RULE-FE-26.** MUST NOT : `console.log` dans le code commité.
> Utiliser un logger conditionnel (`import.meta.env.DEV`).
