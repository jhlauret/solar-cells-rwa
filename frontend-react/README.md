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

26 fichiers au compteur (LandingPage + NotFoundPage incluses). Voici la liste complète :

Pages générales (2)
#FichierRouteDescription1LandingPage.tsx/Page d'accueil publique — présentation SolarCells, CTA inscription2NotFoundPage.tsx*Page 404 — lien retour vers l'accueil

Auth (4)
#FichierRouteDescription3LoginPage.tsx/connexionFormulaire email + mot de passe, lien mot de passe oublié4SignupPage.tsx/inscriptionCréation de compte, CGU, marketing optin5VerifyEmailPage.tsx/verifier-emailSaisie OTP 6 cases, auto-submit, renvoi avec cooldown 60s6ForgotPasswordPage.tsx/mot-de-passe-oublie3 étapes : email → OTP → nouveau mot de passe

KYC (6)
#FichierRouteDescription7KycPersonalInfoPage.tsx/kyc/informationsNom, date de naissance, adresse, nationalité8KycIdentityPage.tsx/kyc/identiteUpload pièce d'identité recto + verso via FileDropzone9KycSelfiePage.tsx/kyc/selfieCapture webcam ou upload photo selfie10KycProofOfAddressPage.tsx/kyc/justificatif-domicileUpload justificatif de domicile (facture, relevé bancaire)11KycSourceOfFundsPage.tsx/kyc/source-des-fondsDéclaration origine des fonds + tranches de revenus12KycReviewPage.tsx/kyc/revueRécapitulatif dossier + checkbox déclaration + soumission

Wallet (2)
#FichierRouteDescription13WalletTypeChoicePage.tsx/wallet/creationChoix custodial / self-custodial + création du wallet14WalletCreatedPage.tsx/wallet/creeConfirmation création, affichage adresse on-chain, bouton copier

Marketplace (2)
#FichierRouteDescription15MarketplacePage.tsx/actifsCatalogue des actifs solaires, filtres et tri côté client16AssetDetailPage.tsx/actifs/:assetIdDétail d'un actif, simulateur rendement, CTA investir

Tunnel d'investissement (5)
#FichierRouteDescription17InvestAmountPage.tsx/investir/:assetId/montantSaisie montant, presets, calcul cells en temps réel18InvestSummaryPage.tsx/investir/:assetId/resumeRécapitulatif avant paiement (frais, net, rendement projeté)19InvestPaymentPage.tsx/investir/:assetId/paiementStripe Elements (carte), SEPA coords virement, stablecoin20InvestConfirmationPage.tsx/investir/:assetId/confirmationPolling statut ordre toutes les 3s, 4 étapes animées21InvestSuccessPage.tsx/investir/:assetId/succesConfirmation finale, résumé Solar Cells acquises

Dashboard (4)
#FichierRouteDescription22DashboardPage.tsx/tableau-de-bordKPIs portefeuille, répartition actifs, dernières transactions23PortfolioPage.tsx/portefeuilleHoldings par actif, rendement par ligne, filtres par état24YieldPage.tsx/rendementsHistorique des distributions de revenus par trimestre25TransfersPage.tsx/transferts3 onglets : marketplace secondaire, mes offres, historique

Profil (1)
#FichierRouteDescription26ProfilePage.tsx/profil4 sections : infos personnelles, sécurité KYC, notifications, bancaire

Total réel : 26 pages — le chiffre de 25 annoncé précédemment ne comptait pas LandingPage.tsx. Les 26 sont dans l'archive.


## Statut
🚧 Non initialisé. Aucun `package.json` à ce stade.
