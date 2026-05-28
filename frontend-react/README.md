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

**NEw ! Extraction  du ZIP complet du projet la partie Front End uniquement**
Ce que contient cette archive
frontend-react/
│
├── Configuration               package.json · vite.config.ts
│                               tsconfig.json · tailwind.config.ts
│                               Dockerfile · .env.development · .env.production
│
├── src/components/
│   ├── ui/                     14 composants atomiques
│   │                           Button Badge Spinner Input PasswordInput
│   │                           Select Checkbox FileDropzone RadioCard
│   │                           Stepper StepperVertical Tabs Tag ProgressBar
│   └── layout/                 5 layouts
│                               SplitLayout OnboardingLayout InvestLayout
│                               AuthLayout PublicLayout + Headers
│
├── src/contexts/               AuthContext.tsx
├── src/hooks/                  7 hooks API (useAssets useKyc useDashboard
│                               useInvestment usePayment useProfile
│                               useEmailVerification)
├── src/lib/                    api-client.ts · query-client.ts · cn.ts
│
├── src/features/               Composants métier + schemas Zod
│                               auth · kyc · asset · investment · marketplace
│
├── src/pages/                  25 pages
│   ├── auth/                   Login Signup VerifyEmail ForgotPassword
│   ├── kyc/                    PersonalInfo Identity Selfie
│   │                           ProofOfAddress SourceOfFunds Review
│   ├── wallet/                 WalletTypeChoice WalletCreated
│   ├── marketplace/            Marketplace AssetDetail
│   ├── invest/                 Amount Summary Payment Confirmation Success
│   ├── dashboard/              Dashboard Portfolio Yield Transfers
│   └── profile/                Profile
│
└── src/routes/                 index.tsx (AppRouter complet)

Pour démarrer après extraction

cd frontend-react
npm install
cp .env.development .env.local
# Renseigner VITE_API_URL et VITE_STRIPE_PUBLIC_KEY
npm run dev

Source fichier : Google folder under 
https://drive.google.com/drive/folders/1DwTdSEWMZeUsJZ08nuE1HY-vNKyHCNsP

**est ce que tu peux me lister les 25 pages ? ├── src/pages/ 25 pages**
Pages générales (2)
Auth (4)
KYC (6)
Wallet (2)
Marketplace (2)
Tunnel d'investissement (5)
> InvestAmountPage.tsx
> InvestSummaryPage.tsx
> InvestPaymentPage.tsx
> InvestConfirmationPage.tsx
> InvestSuccessPage.tsx
Dashboard (4)
> DashboardPage.tsx
> PortfolioPage.tsx
> YieldPage.tsx
> TransfersPage.tsx
Profil (1)
> ProfilePage.tsx

## Statut
🚧 Non initialisé. Aucun `package.json` à ce stade.
