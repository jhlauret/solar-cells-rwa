---
document: frontend-spec
version: 1.0.0
status: draft
classification: interne — confidentiel
applies-to: frontend-react
based-on:
  - product-spec.md v2.0
  - .specify/frontend-rules.md v1.0
  - cinematique-pdf-v1 (14 écrans, mai 2025)
last-updated: 2025-05
compatible-with: [claude-code, codex, github-spec-kit]
---

# SolarCells RWA — Frontend Specification

> Document de référence pour l'implémentation du frontend.
> Conçu pour être consommé par Claude Code / Codex et permettre
> des micro-commits très petits (1 composant = 1 commit).

---

## ⚠️ Note de réconciliation préalable — Vocabulaire UI

Avant toute implémentation, un point doit être tranché au niveau de la constitution.

### Constat

`.specify/frontend-rules.md` RULE-FE-18 interdit ces termes dans l'UI :
`wallet`, `blockchain`, `token`, `crypto`, `mint`, `burn`, `gas`, `smart contract`,
`whitelist`, `on-chain`, `off-chain`.

La cinématique fournie (PDF, 14 écrans) utilise massivement :
`tokenisés`, `wallet`, `Solar Cell Token (SCT)`, `blockchain`, `custodial`,
`Stablecoins (USDC)`, `Réseau Tempo`.

### Trois options possibles

| Option | Description | Conséquence |
|--------|-------------|------------|
| **A — Amender RULE-FE-18** | Acter que SolarCells est une **fintech RWA explicite**, pas blockchain-invisible | Pédagogie sur les termes, vocabulaire hybride assumé |
| **B — Refaire le design** | Aligner les écrans sur RULE-FE-18 stricte | Re-design complet des 14 écrans |
| **C — Hybride par segment** | Vocabulaire complet pour investisseurs qualifiés, simplifié pour retail | Deux versions par écran |

### Position de ce document

**Le présent frontend-spec part de l'hypothèse de l'option A** (vocabulaire RWA assumé),
car c'est ce que montre la cinématique. Si A est retenue, RULE-FE-18 doit être
amendée par un commit `docs(.specify): amend RULE-FE-18 — accept RWA vocabulary`
incrémentant la version de `frontend-rules.md`.

Tant que cette décision n'est pas actée, ce document reste **draft**.

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Arborescence complète](#2-arborescence-complète)
3. [Catalogue des écrans](#3-catalogue-des-écrans)
4. [Routes & navigation](#4-routes--navigation)
5. [Design system](#5-design-system)
6. [Composants UI — primitives](#6-composants-ui--primitives)
7. [Composants métier](#7-composants-métier)
8. [Structure feature-based](#8-structure-feature-based)
9. [Conventions de nommage](#9-conventions-de-nommage)
10. [Règles responsive](#10-règles-responsive)
11. [Loading, error, empty states](#11-loading-error-empty-states)
12. [Règles UX transverses](#12-règles-ux-transverses)
13. [TanStack Query — patterns](#13-tanstack-query--patterns)
14. [React Hook Form + Zod — patterns](#14-react-hook-form--zod--patterns)
15. [React Router — patterns](#15-react-router--patterns)
16. [Stratégie de micro-commits](#16-stratégie-de-micro-commits)

---

## 1. Stack technique

| Outil | Version | Rôle |
|-------|---------|------|
| React | 18+ | Framework UI |
| TypeScript | 5.x strict | Typage |
| Vite | 5.x | Build, dev server, HMR |
| Tailwind CSS | 3.x | Styling utility-first |
| React Router | 6.x | Routing client-side |
| TanStack Query | 5.x | État serveur (cache, sync, mutations) |
| React Hook Form | 7.x | Gestion formulaires |
| Zod | 3.x | Validation + inférence de types |
| `clsx` + `tailwind-merge` (wrapper `cn`) | dernière | Classes conditionnelles |
| `lucide-react` | dernière | Icônes (vu sur les écrans) |

### Bibliothèques optionnelles attendues

| Outil | Usage |
|-------|-------|
| `react-dropzone` | Upload de documents KYC (page 5) |
| `recharts` | Bar charts performance estimée (page 9) |
| `react-day-picker` | Date pickers (date de naissance KYC) |
| `libphonenumber-js` | Validation numéros internationaux |
| `@tanstack/react-table` | Tables (transactions, distributions) |
| `react-i18next` | i18n (FR + EN minimum, vu le sélecteur FR sur les écrans) |
| `sonner` ou `react-hot-toast` | Toast notifications |

> Tout ajout de dépendance MUST être justifié dans le commit qui l'introduit
> et listé dans `frontend-react/README.md`.

---

## 2. Arborescence complète

```
frontend-react/
├── public/
│   ├── favicon.svg
│   └── logo.svg
├── src/
│   ├── main.tsx                          # Bootstrap React, providers
│   ├── App.tsx                           # Composant racine, routes
│   ├── index.css                         # Tailwind base + variables CSS
│   │
│   ├── components/                       # Composants UI réutilisables
│   │   ├── ui/                           # Primitives
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── PasswordInput/
│   │   │   ├── Select/
│   │   │   ├── Checkbox/
│   │   │   ├── Radio/
│   │   │   ├── RadioCard/                # Vu pages 5, 8, 10 (cartes radio)
│   │   │   ├── Slider/                   # Vu page 2 (filtre rendement)
│   │   │   ├── Switch/
│   │   │   ├── Badge/                    # "En production", "Recommandé"
│   │   │   ├── Tag/                      # "Énergie solaire", "Actif réel"
│   │   │   ├── Card/
│   │   │   ├── Avatar/                   # AB en haut à droite
│   │   │   ├── Modal/
│   │   │   ├── Drawer/
│   │   │   ├── Tooltip/
│   │   │   ├── Tabs/                     # Vu page 9 (Aperçu, Détails, etc.)
│   │   │   ├── Stepper/                  # Vu pages 3, 6, 10–13
│   │   │   ├── StepperVertical/          # Vu pages 4, 5, 7, 8
│   │   │   ├── ProgressBar/              # Vu page 2 (financement)
│   │   │   ├── ProgressDots/             # Vu page 1 (1 → 2 → 3)
│   │   │   ├── Skeleton/
│   │   │   ├── Spinner/
│   │   │   ├── Alert/                    # Bannières "succès / info"
│   │   │   ├── Toast/                    # Wrapper sonner
│   │   │   ├── EmptyState/
│   │   │   ├── ErrorState/
│   │   │   ├── PageHeader/
│   │   │   ├── SectionHeader/
│   │   │   ├── Container/
│   │   │   ├── Stack/                    # VStack, HStack helpers
│   │   │   ├── Divider/
│   │   │   ├── IconBox/                  # Carrés verts arrondis avec icône
│   │   │   ├── CopyButton/               # Vu page 6 (copier adresse wallet)
│   │   │   ├── FileDropzone/             # Vu page 5
│   │   │   ├── CountryFlag/              # Drapeaux pages 2, 4, 9
│   │   │   ├── CountrySelect/
│   │   │   ├── PhoneInput/
│   │   │   ├── AmountInput/              # Vu pages 9, 10 (input € spécial)
│   │   │   ├── AmountPresetGrid/         # 10€/50€/100€/Autre (pages 9, 10)
│   │   │   ├── Logo/
│   │   │   ├── LanguageSwitcher/         # Sélecteur FR (header)
│   │   │   ├── NotificationBell/         # Icône cloche en haut à droite
│   │   │   ├── DonutChart/               # Vu page 9 (rendement cible 8.5%)
│   │   │   ├── BarChart/                 # Vu page 9 (performance estimée)
│   │   │   ├── StatCard/                 # 12,450 / 28.7 GWh / 8.42 % / 3,245
│   │   │   ├── TrustBadge/               # SSL chiffré / RGPD / KYC/AML
│   │   │   └── FeatureCard/              # 3 cartes bas de page récurrentes
│   │   │
│   │   ├── layout/
│   │   │   ├── PublicLayout/             # Sans auth (landing, signup, login)
│   │   │   ├── AuthLayout/               # Avec header authentifié
│   │   │   ├── OnboardingLayout/         # Stepper top + sidebar gauche (KYC)
│   │   │   ├── DashboardLayout/          # Header + main content
│   │   │   ├── SplitLayout/              # 2 colonnes (signup, wallet-created)
│   │   │   ├── Header/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── HeaderPublic.tsx
│   │   │   │   ├── HeaderAuth.tsx
│   │   │   │   ├── HeaderNav.tsx
│   │   │   │   └── HeaderUserMenu.tsx
│   │   │   ├── Footer/
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── FooterPartners.tsx    # Bridge, Tempo, Swiss Banking
│   │   │   │   └── FooterTrustBar.tsx    # Compte suisse / FINMA / RGPD
│   │   │   └── Sidebar/
│   │   │       ├── SidebarOnboarding.tsx # KYC steps
│   │   │       └── SidebarHelp.tsx       # "Besoin d'aide ?"
│   │   │
│   │   └── shared/                       # Composants métier réutilisables
│   │       ├── KycStatusBadge/           # En cours / Validé / Rejeté
│   │       ├── KycProgressTimeline/      # 6 ou 7 steps verticaux
│   │       ├── KycProgressDots/          # 6 icons horizontaux (page 4)
│   │       ├── AssetCard/                # Carte actif (page 2)
│   │       ├── AssetCardMini/            # Version mini (sidebar tunnel invest)
│   │       ├── AssetStatusBadge/         # En production / Financement en cours / À venir
│   │       ├── AssetGalleryCarousel/     # Galerie photo (page 9)
│   │       ├── AssetQuickStats/          # Puissance / Production / Mise en service
│   │       ├── AssetFinancingProgress/   # Barre + "X/Y Solar Cells restants"
│   │       ├── PortfolioSummary/         # Synthèse portefeuille
│   │       ├── WalletAddressBox/         # 0x7f3A... + copier (page 6)
│   │       ├── WalletNetworkBadge/       # "Tempo (Stripe)"
│   │       ├── PaymentMethodRadio/       # SEPA / Carte / USDC (pages 10–11)
│   │       ├── InvestmentSummaryCard/    # Sidebar récap (pages 10–14)
│   │       ├── InvestmentSuccessHero/    # Pages 13–14
│   │       ├── YieldChart/               # Distribution historique
│   │       ├── TrustFooterBar/           # Compte suisse / FINMA / RGPD / KYC
│   │       └── HelpSidebarBlock/         # "Besoin d'aide ? Contacter le support"
│   │
│   ├── features/                         # Logique métier par domaine
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   ├── login.api.ts
│   │   │   │   ├── signup.api.ts
│   │   │   │   ├── logout.api.ts
│   │   │   │   └── refresh.api.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts           # useMutation
│   │   │   │   ├── useSignup.ts
│   │   │   │   ├── useLogout.ts
│   │   │   │   ├── useCurrentUser.ts     # useQuery
│   │   │   │   └── useRequireAuth.ts
│   │   │   ├── schemas/
│   │   │   │   ├── login.schema.ts
│   │   │   │   └── signup.schema.ts
│   │   │   ├── components/
│   │   │   │   ├── LoginForm/
│   │   │   │   ├── SignupForm/           # Page 3
│   │   │   │   ├── SignupHeroAside/      # Aside gauche page 3
│   │   │   │   ├── GoogleOAuthButton/
│   │   │   │   └── TermsAcceptCheckbox/
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── kyc/
│   │   │   ├── api/
│   │   │   │   ├── getKycStatus.api.ts
│   │   │   │   ├── submitPersonalInfo.api.ts
│   │   │   │   ├── uploadIdentity.api.ts
│   │   │   │   ├── submitLiveness.api.ts
│   │   │   │   ├── uploadProofOfAddress.api.ts
│   │   │   │   └── submitSourceOfFunds.api.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useKycStatus.ts
│   │   │   │   ├── useKycSteps.ts
│   │   │   │   ├── useSubmitPersonalInfo.ts
│   │   │   │   ├── useUploadIdentity.ts
│   │   │   │   └── useSubmitLiveness.ts
│   │   │   ├── schemas/
│   │   │   │   ├── personalInfo.schema.ts
│   │   │   │   ├── identityUpload.schema.ts
│   │   │   │   └── sourceOfFunds.schema.ts
│   │   │   ├── components/
│   │   │   │   ├── KycLayoutWithSidebar/
│   │   │   │   ├── KycStepHeader/
│   │   │   │   ├── PersonalInfoForm/     # Page 4
│   │   │   │   ├── IdentityUploadStep/
│   │   │   │   ├── SelfieLivenessStep/   # Page 7
│   │   │   │   ├── SelfieCaptureBox/
│   │   │   │   ├── SelfieTipsCard/
│   │   │   │   ├── ProofOfAddressStep/   # Page 5
│   │   │   │   ├── DocumentExamplesPanel/# Bon/mauvais exemples
│   │   │   │   ├── SourceOfFundsStep/
│   │   │   │   ├── KycReviewStep/
│   │   │   │   ├── KycSecurityAside/     # "Vos données sont sécurisées"
│   │   │   │   └── KycStatusCard/        # Sidebar droite "Statut actuel"
│   │   │   └── types/
│   │   │
│   │   ├── wallet/
│   │   │   ├── api/
│   │   │   │   ├── createWallet.api.ts
│   │   │   │   ├── getWallet.api.ts
│   │   │   │   └── getBalance.api.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useWallet.ts
│   │   │   │   ├── useCreateWallet.ts
│   │   │   │   └── useWalletBalance.ts
│   │   │   ├── schemas/
│   │   │   │   └── walletTypeSelection.schema.ts
│   │   │   ├── components/
│   │   │   │   ├── WalletTypeChoiceStep/ # Page 8 (custodial vs non-custodial)
│   │   │   │   ├── WalletCreationLoading/
│   │   │   │   ├── WalletCreatedSuccess/ # Page 6
│   │   │   │   ├── WalletActionsGrid/    # 4 actions sur page 6
│   │   │   │   └── WalletSecurityAside/
│   │   │   └── types/
│   │   │
│   │   ├── marketplace/                  # Catalogue des actifs (page 2)
│   │   │   ├── api/
│   │   │   │   ├── listAssets.api.ts
│   │   │   │   └── getAssetDetail.api.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useAssetList.ts       # useInfiniteQuery
│   │   │   │   ├── useAssetDetail.ts
│   │   │   │   └── useAssetFilters.ts
│   │   │   ├── schemas/
│   │   │   │   └── assetFilters.schema.ts
│   │   │   ├── components/
│   │   │   │   ├── MarketplaceFiltersPanel/  # Sidebar filtres page 2
│   │   │   │   ├── MarketplaceCountryFilter/
│   │   │   │   ├── MarketplaceTypeFilter/    # Checkboxes
│   │   │   │   ├── MarketplaceStatusFilter/  # Radios
│   │   │   │   ├── MarketplaceYieldRangeFilter/  # Slider
│   │   │   │   ├── MarketplaceSortDropdown/
│   │   │   │   ├── MarketplaceGrid/
│   │   │   │   ├── MarketplaceListView/      # Toggle vue grille/liste
│   │   │   │   ├── MarketplaceViewToggle/
│   │   │   │   └── MarketplaceResultCount/   # "42 actifs disponibles"
│   │   │   └── types/
│   │   │       └── asset.types.ts
│   │   │
│   │   ├── asset/                        # Détail actif (page 9)
│   │   │   ├── components/
│   │   │   │   ├── AssetDetailHeader/    # Image + titre + drapeau + tags
│   │   │   │   ├── AssetDetailTabs/      # Aperçu/Détails/Documents/...
│   │   │   │   ├── AssetOverviewPanel/
│   │   │   │   ├── AssetFinancialDetailsPanel/
│   │   │   │   ├── AssetTechnicalDetailsPanel/
│   │   │   │   ├── AssetDocumentsPanel/
│   │   │   │   ├── AssetPerformancePanel/
│   │   │   │   ├── AssetRisksPanel/
│   │   │   │   ├── AssetKeyInfoCard/     # Propriétaire/Exploitant/...
│   │   │   │   ├── AssetInvestBox/       # Sidebar droite "Investir dans cet actif"
│   │   │   │   ├── AssetReturnDonut/     # Donut 8.5%
│   │   │   │   └── AssetEstimatedPerformanceChart/  # Bar chart
│   │   │   └── types/
│   │   │
│   │   ├── invest/                       # Tunnel d'investissement (pages 10–14)
│   │   │   ├── api/
│   │   │   │   ├── simulateInvestment.api.ts
│   │   │   │   ├── createInvestment.api.ts
│   │   │   │   └── getInvestmentReceipt.api.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useSimulation.ts
│   │   │   │   ├── useCreateInvestment.ts
│   │   │   │   └── useInvestmentReceipt.ts
│   │   │   ├── schemas/
│   │   │   │   ├── investAmount.schema.ts
│   │   │   │   ├── investPayment.schema.ts
│   │   │   │   └── investFull.schema.ts  # Schéma cumulé multi-step
│   │   │   ├── components/
│   │   │   │   ├── InvestStepper/        # 4 étapes (Montant/Paiement/Résumé/Confirm.)
│   │   │   │   ├── InvestAmountStep/     # Page 10
│   │   │   │   ├── InvestPaymentStep/    # Page 11
│   │   │   │   ├── InvestSummaryStep/    # Page 12
│   │   │   │   ├── InvestConfirmationStep/  # Page 13
│   │   │   │   ├── InvestSuccessHero/    # Page 14
│   │   │   │   ├── PaymentMethodSepaCard/
│   │   │   │   ├── PaymentMethodCardCard/
│   │   │   │   ├── PaymentMethodStablecoinCard/
│   │   │   │   ├── InvestmentRecapAside/
│   │   │   │   ├── WhatYouReceiveBox/
│   │   │   │   ├── NextStepsList/        # "Prochaines étapes" page 13
│   │   │   │   └── WhatNextCards/        # "Et maintenant ?" page 14
│   │   │   ├── machines/                 # Optionnel : machine d'état du tunnel
│   │   │   │   └── investWizard.state.ts
│   │   │   └── types/
│   │   │
│   │   ├── portfolio/
│   │   │   ├── api/
│   │   │   │   ├── getPortfolio.api.ts
│   │   │   │   ├── getHoldings.api.ts
│   │   │   │   └── getValuation.api.ts
│   │   │   ├── hooks/
│   │   │   │   ├── usePortfolio.ts
│   │   │   │   ├── useHoldings.ts
│   │   │   │   └── useValuation.ts
│   │   │   ├── components/
│   │   │   │   ├── PortfolioOverview/
│   │   │   │   ├── PortfolioValuationCard/
│   │   │   │   ├── HoldingsTable/
│   │   │   │   ├── HoldingRow/
│   │   │   │   └── PortfolioAllocationChart/
│   │   │   └── types/
│   │   │
│   │   ├── yield/                        # Rendements / distributions
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── components/
│   │   │   │   ├── YieldHistoryTable/
│   │   │   │   ├── YieldProjectionChart/
│   │   │   │   ├── DistributionRow/
│   │   │   │   ├── NextDistributionCard/
│   │   │   │   └── ReinvestToggle/
│   │   │   └── types/
│   │   │
│   │   ├── transfers/                    # Marketplace secondaire
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── components/
│   │   │   │   ├── TransferOfferList/
│   │   │   │   ├── TransferOfferCard/
│   │   │   │   ├── CreateTransferOfferForm/
│   │   │   │   ├── TransferConfirmModal/
│   │   │   │   └── TransferHistoryTable/
│   │   │   └── types/
│   │   │
│   │   ├── profile/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── components/
│   │   │   │   ├── ProfilePersonalSection/
│   │   │   │   ├── ProfileBankAccountSection/
│   │   │   │   ├── ProfileDocumentsSection/
│   │   │   │   ├── ProfileSecuritySection/  # 2FA
│   │   │   │   └── ProfileNotificationsSection/
│   │   │   └── types/
│   │   │
│   │   └── notifications/
│   │       ├── api/
│   │       ├── hooks/
│   │       └── components/
│   │           ├── NotificationDropdown/
│   │           └── NotificationItem/
│   │
│   ├── pages/                            # Écrans assemblant des features
│   │   ├── LandingPage.tsx               # Page 1
│   │   ├── auth/
│   │   │   ├── SignupPage.tsx            # Page 3
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   ├── kyc/
│   │   │   ├── KycEntryPage.tsx
│   │   │   ├── KycPersonalInfoPage.tsx   # Page 4
│   │   │   ├── KycIdentityPage.tsx
│   │   │   ├── KycSelfiePage.tsx         # Page 7
│   │   │   ├── KycProofOfAddressPage.tsx # Page 5
│   │   │   ├── KycSourceOfFundsPage.tsx
│   │   │   └── KycReviewPage.tsx
│   │   ├── wallet/
│   │   │   ├── WalletTypeChoicePage.tsx  # Page 8
│   │   │   └── WalletCreatedPage.tsx     # Page 6
│   │   ├── DashboardPage.tsx
│   │   ├── MarketplacePage.tsx           # Page 2
│   │   ├── AssetDetailPage.tsx           # Page 9
│   │   ├── invest/
│   │   │   ├── InvestAmountPage.tsx      # Page 10
│   │   │   ├── InvestPaymentPage.tsx     # Page 11
│   │   │   ├── InvestSummaryPage.tsx     # Page 12
│   │   │   ├── InvestConfirmationPage.tsx# Page 13
│   │   │   └── InvestSuccessPage.tsx     # Page 14
│   │   ├── PortfolioPage.tsx
│   │   ├── YieldPage.tsx
│   │   ├── TransfersPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── ErrorBoundaryPage.tsx
│   │
│   ├── routes/
│   │   ├── index.tsx                     # Configuration React Router
│   │   ├── ProtectedRoute.tsx            # Garde : authentifié
│   │   ├── KycRequiredRoute.tsx          # Garde : KYC validé
│   │   └── PublicOnlyRoute.tsx           # Pour /signup, /login (redirige si connecté)
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                 # Wrapper fetch typé
│   │   │   ├── errors.ts                 # Classes ApiError
│   │   │   └── queryClient.ts            # Config TanStack Query
│   │   ├── auth/
│   │   │   └── session.ts                # Helpers session
│   │   ├── env.ts                        # import.meta.env validé Zod
│   │   ├── formatters/
│   │   │   ├── currency.ts               # 50,00 €
│   │   │   ├── date.ts                   # 15 mai 2024 à 10:42
│   │   │   ├── number.ts                 # 12 450
│   │   │   ├── percentage.ts             # 8,42 %
│   │   │   └── address.ts                # 0x7f3A...E1F2 (tronquage)
│   │   ├── validators/
│   │   │   ├── common.schemas.ts         # email, password, phone, IBAN
│   │   │   └── kyc.schemas.ts
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   └── locales/
│   │   │       ├── fr.json
│   │   │       └── en.json
│   │   └── utils/
│   │       ├── cn.ts                     # clsx + tailwind-merge
│   │       ├── debounce.ts
│   │       └── retry.ts
│   │
│   ├── hooks/                            # Hooks transverses
│   │   ├── useToast.ts
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useClipboard.ts               # Pour CopyButton
│   │   ├── usePagination.ts
│   │   └── useScrollLock.ts
│   │
│   ├── providers/
│   │   ├── QueryProvider.tsx             # TanStack Query Provider
│   │   ├── ToastProvider.tsx
│   │   ├── AuthProvider.tsx              # Contexte session
│   │   └── I18nProvider.tsx
│   │
│   └── types/
│       ├── api.types.ts
│       ├── domain.types.ts
│       └── env.d.ts                      # import.meta.env types
│
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
├── Dockerfile
└── README.md
```

---

## 3. Catalogue des écrans

Les **14 écrans du PDF** sont catalogués ci-dessous avec leurs dépendances.
Cinq écrans supplémentaires (dérivés du header authentifié) complètent le périmètre MVP.

### 3.1 Écrans documentés dans la cinématique

| ID | Écran | Page PDF | Route | Layout | Features impliquées |
|----|-------|----------|-------|--------|--------------------|
| **S01** | Landing | 1 | `/` | `PublicLayout` | marketing |
| **S02** | Marketplace | 2 | `/actifs` | `AuthLayout` | marketplace |
| **S03** | Inscription | 3 | `/inscription` | `SplitLayout` | auth |
| **S04** | KYC — Informations | 4 | `/kyc/informations` | `OnboardingLayout` | kyc |
| **S05** | KYC — Justificatif domicile | 5 | `/kyc/justificatif-domicile` | `OnboardingLayout` | kyc |
| **S06** | Wallet créé (succès) | 6 | `/wallet/cree` | `SplitLayout` | wallet |
| **S07** | KYC — Vérification faciale | 7 | `/kyc/selfie` | `OnboardingLayout` | kyc |
| **S08** | Création wallet (choix type) | 8 | `/wallet/creation` | `OnboardingLayout` | wallet |
| **S09** | Détail actif | 9 | `/actifs/:assetId` | `AuthLayout` | asset, invest |
| **S10** | Investir — Montant | 10 | `/investir/:assetId/montant` | `AuthLayout` | invest |
| **S11** | Investir — Paiement | 11 | `/investir/:assetId/paiement` | `AuthLayout` | invest |
| **S12** | Investir — Résumé | 12 | `/investir/:assetId/resume` | `AuthLayout` | invest |
| **S13** | Investir — Confirmation | 13 | `/investir/:assetId/confirmation` | `AuthLayout` | invest |
| **S14** | Investir — Félicitations | 14 | `/investir/:assetId/succes` | `AuthLayout` | invest |

> **Note S13 vs S14 :** les pages 13 et 14 du PDF sont deux variantes de l'écran
> post-investissement. **S13 est retenu comme état canonique** (plus dense en information).
> S14 servira d'écran de transition optionnel (1–2 sec) en cas de succès,
> avant redirection automatique vers `/portefeuille`.

### 3.2 Écrans dérivés (non illustrés dans le PDF mais évoqués dans le header)

| ID | Écran | Route | Layout | Priorité |
|----|-------|-------|--------|----------|
| **S15** | Tableau de bord | `/tableau-de-bord` | `AuthLayout` | P0 |
| **S16** | Portefeuille | `/portefeuille` | `AuthLayout` | P0 |
| **S17** | Rendement | `/rendement` | `AuthLayout` | P0 |
| **S18** | Transferts | `/transferts` | `AuthLayout` | P1 |
| **S19** | Profil & paramètres | `/profil` | `AuthLayout` | P1 |
| **S20** | Connexion | `/connexion` | `SplitLayout` | P0 |
| **S21** | Mot de passe oublié | `/mot-de-passe-oublie` | `SplitLayout` | P0 |
| **S22** | Page 404 | `*` | `PublicLayout` | P0 |
| **S23** | KYC — Pièce d'identité | `/kyc/identite` | `OnboardingLayout` | P0 |
| **S24** | KYC — Source des fonds | `/kyc/source-des-fonds` | `OnboardingLayout` | P0 |
| **S25** | KYC — Revue finale | `/kyc/revue` | `OnboardingLayout` | P0 |

> **Total périmètre MVP : 25 écrans.**

### 3.3 Fiche par écran — modèle

Chaque écran sera documenté dans un fichier spec dédié `specs/screens/<ID>-<slug>.md`
avec la structure suivante :

```
# S0X — <Titre de l'écran>

## Route
## Layout
## Features impliquées
## Composants (liste)
## Données chargées (queries)
## Mutations
## États
  - loading
  - error
  - empty
  - success
## Validations (schémas Zod)
## Navigation entrante / sortante
## Critères d'acceptation
```

> La rédaction des fiches individuelles est **hors périmètre** de ce frontend-spec
> et fera l'objet d'une PR dédiée (`docs(specs): add screen specs`).

---

## 4. Routes & navigation

### 4.1 Carte des routes

```
PUBLIC
/                              → S01 Landing
/inscription                   → S03 Signup
/connexion                     → S20 Login
/mot-de-passe-oublie           → S21 ForgotPassword
/reinitialiser-mot-de-passe    → ResetPassword

AUTHENTICATED — KYC pending
/kyc                           → S15 Dashboard limité (redirige vers next KYC step)
/kyc/informations              → S04
/kyc/identite                  → S23
/kyc/selfie                    → S07
/kyc/justificatif-domicile     → S05
/kyc/source-des-fonds          → S24
/kyc/revue                     → S25
/wallet/creation               → S08
/wallet/cree                   → S06

AUTHENTICATED — KYC validated
/tableau-de-bord               → S15
/actifs                        → S02 Marketplace
/actifs/:assetId               → S09 Asset detail
/investir/:assetId/montant     → S10
/investir/:assetId/paiement    → S11
/investir/:assetId/resume      → S12
/investir/:assetId/confirmation → S13
/investir/:assetId/succes      → S14 (transition optionnelle)
/portefeuille                  → S16
/rendement                     → S17
/transferts                    → S18
/profil                        → S19
/notifications                 → Dropdown header, pas de route dédiée

ERRORS
/*                             → S22 NotFound
ErrorBoundary global           → ErrorBoundaryPage
```

### 4.2 Règles de routing

> **RULE-FE-ROUTE-01.** Les routes sont en français (URL slugs en français)
> car la cible primaire est EU/FR/CH francophone.

> **RULE-FE-ROUTE-02.** Toutes les routes authentifiées MUST être encapsulées
> dans `<ProtectedRoute>`.

> **RULE-FE-ROUTE-03.** Toutes les routes nécessitant un KYC validé MUST être
> encapsulées dans `<KycRequiredRoute>`. Un utilisateur en `pending` est
> redirigé vers la prochaine étape KYC à compléter.

> **RULE-FE-ROUTE-04.** Les routes publiques `/inscription`, `/connexion`
> MUST être encapsulées dans `<PublicOnlyRoute>` : un utilisateur déjà
> authentifié est redirigé vers `/tableau-de-bord`.

> **RULE-FE-ROUTE-05.** Les tunnels multi-étapes (KYC, Investir) MUST utiliser
> des routes physiques distinctes (pas d'état local d'étape).
> Cela permet le partage de lien, le rafraîchissement de page, et le retour navigateur.

### 4.3 Navigation header — par contexte

| Contexte utilisateur | Liens header visibles |
|---------------------|----------------------|
| Public (non auth) | Investir · Actifs · Comment ça marche · Rendement · À propos · Ressources |
| Auth, KYC pending | Tableau de bord · KYC en cours (mis en avant) |
| Auth, KYC validé | Tableau de bord · Investir · Actifs · Portefeuille · Rendement · Transferts · Ressources |

---

## 5. Design system

### 5.1 Tokens de couleur

Extraits du design PDF. À matérialiser dans `tailwind.config.ts`.

```ts
// tailwind.config.ts — extrait
theme: {
  extend: {
    colors: {
      // Vert primaire (signature SolarCells)
      primary: {
        50:  '#F0F9F4',
        100: '#DCF2E5',
        200: '#B8E5CB',
        300: '#8FD4AC',
        400: '#5FBE87',
        500: '#2E8C5A',   // ← couleur principale
        600: '#236F47',
        700: '#1A5638',
        800: '#143F2A',
        900: '#0D2A1C',
      },
      // Statuts
      success: '#16A34A',
      warning: '#F59E0B',
      danger:  '#DC2626',
      info:    '#0EA5E9',
      // Neutres
      ink: {
        900: '#0F172A',   // titres
        700: '#334155',   // body
        500: '#64748B',   // secondaire
        300: '#CBD5E1',   // bordures
        100: '#F1F5F9',   // backgrounds
        50:  '#F8FAFC',   // page background
      },
    },
  },
}
```

### 5.2 Typographie

Extraite du PDF (suggestion à confirmer avec l'équipe design) :

| Token Tailwind | Usage | Taille / poids |
|---------------|-------|----------------|
| `text-display` | H1 hero landing | 48px / 700 |
| `text-h1` | Titres de page | 32px / 700 |
| `text-h2` | Titres de section | 24px / 600 |
| `text-h3` | Sous-titres | 18px / 600 |
| `text-body-lg` | Texte principal large | 16px / 400 |
| `text-body` | Texte courant | 14px / 400 |
| `text-caption` | Légendes, helpers | 12px / 400 |
| `text-overline` | "ACTIFS RÉELS • TRANSPARENCE" | 11px / 600 / uppercase |

**Police suggérée :** `Inter` (à confirmer — le PDF ne précise pas).

### 5.3 Spacing & layout

```ts
// Espacement utilisé fréquemment dans les écrans
'gap-2'  → 8px   (icône ↔ texte)
'gap-4'  → 16px  (champs de formulaire)
'gap-6'  → 24px  (sections)
'gap-8'  → 32px  (gros blocs)
'gap-12' → 48px  (entre sections de page)

// Container max-width
maxWidth: { content: '1280px' }
```

### 5.4 Radius & ombres

```ts
borderRadius: {
  sm: '6px',
  DEFAULT: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',  // utilisé pour les grandes cartes
},
boxShadow: {
  card: '0 1px 2px rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.06)',
  cardHover: '0 4px 16px rgba(15,23,42,0.10)',
  modal: '0 24px 48px rgba(15,23,42,0.20)',
}
```

### 5.5 Iconographie

- **Bibliothèque :** `lucide-react` (style line, cohérent avec les écrans).
- **Tailles standard :** `16px` (inline), `20px` (boutons), `24px` (sections), `48px+` (hero).
- **Couleur :** héritée par `currentColor` (icônes contextuelles).

### 5.6 Composition récurrente — anatomie observée

| Bloc | Composition |
|------|-------------|
| **Carte d'actif** (page 2) | Image 16:9 + badge statut + favoris + titre + drapeau + 3 métriques + barre de progression + bouton |
| **Stat card** (page 1) | Icône carrée verte 48px + valeur grande + label + variation |
| **Trust badge** (récurrent) | Icône `Shield` ou `Check` + titre + sous-titre court |
| **Étape KYC sidebar** | Numéro circulaire (vert si actif, gris si pending, check si done) + titre + statut |
| **Carte radio** (page 8, 10, 11) | Icône + titre + description + badge optionnel "Recommandé" + radio à droite |

---

## 6. Composants UI — primitives

Chaque primitive suit la convention de structure :
```
ComponentName/
├── ComponentName.tsx           # Composant
├── ComponentName.types.ts      # Props interface
└── index.ts                    # Re-export
```

> **Un primitive = un commit.** Chaque création de primitive doit être
> un commit indépendant `feat(frontend): add <ComponentName> primitive`.

### 6.1 Inventaire détaillé

#### `Button`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'link'` | `'primary'` | `primary` = vert plein, `secondary` = vert outline, `ghost` = transparent |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | |
| `loading` | `boolean` | `false` | Affiche un spinner + désactive le bouton |
| `disabled` | `boolean` | `false` | |
| `iconLeft` | `LucideIcon` | — | |
| `iconRight` | `LucideIcon` | — | Ex. `ArrowRight` pour les CTA |
| `fullWidth` | `boolean` | `false` | Pour les formulaires |
| `as` | `'button' \| 'a' \| 'Link'` | `'button'` | Polymorphisme |

**Variantes observées dans le PDF :**
- Primary vert plein (`Créer un compte`, `Continuer`, `Investir maintenant`)
- Secondary vert outline (`Voir la vidéo`, `Retour au tableau de bord`)
- Ghost (`Ajouter aux favoris`, `← Précédent`)
- Avec icône droite (`Continuer →`, `Confirmer et continuer →`)

#### `Input`

| Prop | Type | Default |
|------|------|---------|
| `label` | `string` | — |
| `hint` | `string` | — |
| `error` | `string` | — |
| `iconLeft` | `LucideIcon` | — |
| `iconRight` | `LucideIcon` | — |
| `required` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

Le composant gère `aria-invalid`, `aria-describedby` automatiquement.

#### `PasswordInput`
Spécialisation `Input` avec toggle eye / eye-off (vu page 3).

#### `Select`
Wrapper accessible autour de `<select>` natif OU implémentation custom Radix-like.
**Décision :** démarrer avec `<select>` natif + styling Tailwind (suffisant pour le MVP).

#### `RadioCard` (composant clé)
Vu pages 5, 8, 10, 11. Une carte cliquable avec radio à droite.
| Prop | Type |
|------|------|
| `name` | `string` |
| `value` | `string` |
| `selected` | `boolean` |
| `icon` | `LucideIcon \| ReactNode` |
| `title` | `string` |
| `description` | `string` |
| `badge` | `{ label: string; tone: 'primary' \| 'neutral' }` |
| `meta` | `ReactNode` (zone libre droite, ex. logos VISA Mastercard) |

#### `AmountInput`
Vu pages 9, 10. Champ numérique avec suffixe `€`, formatage live.
| Prop | Type |
|------|------|
| `currency` | `'EUR' \| 'USDC'` |
| `min` / `max` | `number` |
| `step` | `number` |

#### `AmountPresetGrid`
Vu pages 9, 10. Grille de 4–5 boutons preset + option "Autre montant".

#### `Stepper` (horizontal)
Vu pages 3, 6, 10–13.
| Prop | Type |
|------|------|
| `steps` | `{ label: string; status: 'done' \| 'active' \| 'pending' }[]` |
| `currentIndex` | `number` |

#### `StepperVertical`
Vu pages 4, 5, 7, 8. Sidebar gauche KYC.

#### `ProgressDots`
Vu page 4 (6 icônes horizontales 1 → 2 → 3 → 4 → 5 → 6).

#### `ProgressBar`
Vu page 2 (barre de financement d'un actif).
| Prop | Type |
|------|------|
| `value` | `number` (0–100) |
| `tone` | `'success' \| 'warning' \| 'danger'` |
| `showLabel` | `boolean` |

#### `Tabs`
Vu page 9 (Aperçu / Détails financiers / Détails techniques / ...).

#### `Badge`
Petites étiquettes textuelles. Variantes : `success`, `warning`, `info`, `neutral`.
Vu : `En production` (vert), `Financement en cours` (orange), `À venir` (gris), `Recommandé` (vert clair).

#### `Tag`
Tags rectangulaires avec icône. Vu page 9 (`Énergie solaire`, `Actif réel`, `Assuré`).

#### `IconBox`
Carré arrondi 48–64px avec icône. Vu partout (stat cards, feature cards).
| Prop | Type |
|------|------|
| `icon` | `LucideIcon` |
| `tone` | `'primary' \| 'neutral'` |
| `size` | `'sm' \| 'md' \| 'lg'` |

#### `FileDropzone`
Vu page 5. Zone de drag-and-drop avec icône, instructions, formats acceptés.

#### `CopyButton`
Vu page 6 (copier l'adresse wallet). Toast de confirmation au clic.

#### `CountryFlag` + `CountrySelect`
Drapeaux ISO 3166-1 alpha-2. Bibliothèque suggérée : `country-flag-icons` ou SVG inline.

#### `Stack` / `VStack` / `HStack`
Helpers de layout (sucre syntaxique autour de `flex flex-col gap-X`).

> **RULE-FE-UI-01.** Toute primitive MUST avoir une story Storybook OU
> une démo dans `pages/_storybook` (route dev-only).
> _(décision à acter : Storybook installé ou non — pour MVP, page de démo suffit)_

---

## 7. Composants métier

### 7.1 Catalogue par feature

#### Feature `marketplace`

- `AssetCard` — carte d'un actif dans la grille (page 2).
- `AssetCardMini` — version horizontale compacte (sidebar invest, pages 10–14).
- `AssetStatusBadge` — `En production` / `Financement en cours` / `À venir`.
- `AssetFinancingProgress` — barre + texte `8000/8700` + `Solar Cells restants`.
- `MarketplaceFiltersPanel` — wrapper de tous les filtres.
- `MarketplaceCountryFilter` — dropdown pays.
- `MarketplaceTypeFilter` — checkboxes type d'actif.
- `MarketplaceStatusFilter` — radios statut.
- `MarketplaceYieldRangeFilter` — slider 0 % → 15 %+.
- `MarketplaceSortDropdown` — tri par rendement / financement / etc.
- `MarketplaceResultCount` — `42 actifs disponibles`.
- `MarketplaceViewToggle` — toggle grille / liste.

#### Feature `asset` (détail)

- `AssetDetailHeader` — image principale + badge + favoris + titre + tags.
- `AssetGalleryCarousel` — galerie photo.
- `AssetQuickStats` — 4 stats (Puissance, Production, Mise en service, Durée).
- `AssetDetailTabs` — Aperçu / Détails financiers / Détails techniques / Documents / Performance / Risques.
- `AssetOverviewPanel` — donut + métriques rapides.
- `AssetReturnDonut` — donut chart "8.5 % par an".
- `AssetEstimatedPerformanceChart` — bar chart annuel (2024–2033+).
- `AssetKeyInfoCard` — table clé/valeur (Propriétaire, Exploitant, ...).
- `AssetInvestBox` — sidebar droite "Investir dans cet actif".

#### Feature `invest`

- `InvestStepper` — stepper 4 étapes (Montant / Paiement / Résumé / Confirmation).
- `InvestAmountStep` — page 10 (presets + Autre).
- `InvestPaymentStep` — page 11.
- `PaymentMethodSepaCard` — radio card SEPA avec "Comment ça marche".
- `PaymentMethodCardCard` — radio card carte (logos VISA / Mastercard).
- `PaymentMethodStablecoinCard` — radio card USDC.
- `InvestSummaryStep` — page 12.
- `InvestConfirmationStep` — page 13 (récap dense).
- `InvestSuccessHero` — page 14 (mode transition / confetti).
- `InvestmentRecapAside` — sidebar droite récurrente pages 10–14.
- `WhatYouReceiveBox` — encart vert "Vous recevrez 50 SCT".
- `NextStepsList` — liste 3 items "Prochaines étapes" (page 13).
- `WhatNextCards` — 3 cartes "Et maintenant ?" (page 14).

#### Feature `kyc`

- `KycLayoutWithSidebar` — layout récurrent pages 4, 5, 7, 8.
- `KycProgressTimeline` — sidebar gauche avec 6–7 étapes verticales.
- `KycProgressDots` — barre horizontale 6 icônes (page 4 haut).
- `KycStepHeader` — titre + sous-titre + statut.
- `PersonalInfoForm` — formulaire page 4.
- `IdentityUploadStep` — upload pièce d'identité.
- `SelfieLivenessStep` — page 7 capture vidéo/photo.
- `SelfieCaptureBox` — cadre circulaire de capture.
- `SelfieTipsCard` — sidebar droite "Conseils pour une vérification réussie".
- `ProofOfAddressStep` — page 5 dropzone.
- `DocumentExamplesPanel` — preview "bon" (✓) / "mauvais" (✗) exemple.
- `KycSecurityAside` — sidebar droite "Vos données sont sécurisées".
- `KycStatusCard` — sidebar droite "Statut actuel".
- `HelpSidebarBlock` — "Besoin d'aide ? Contacter le support".

#### Feature `wallet`

- `WalletTypeChoiceStep` — page 8 (custodial vs non-custodial).
- `WalletCreationLoading` — état intermédiaire pendant la création.
- `WalletCreatedSuccess` — page 6 (succès, adresse, actions).
- `WalletAddressBox` — adresse `0x7f3A...E1F2` + bouton copier.
- `WalletNetworkBadge` — "Réseau Tempo (Stripe)".
- `WalletActionsGrid` — 4 cartes (Acheter / Recevoir / Transférer / Suivre performance).
- `WalletSecurityAside` — sidebar droite "Sécurité & confiance".

#### Feature `auth`

- `SignupForm` — page 3 formulaire complet.
- `SignupHeroAside` — aside gauche page 3 (4 bullets + image).
- `LoginForm`
- `GoogleOAuthButton`
- `TermsAcceptCheckbox` — checkbox avec liens vers CGU / politique confidentialité.

#### Feature `portfolio`

- `PortfolioValuationCard` — résumé valorisation totale.
- `HoldingsTable` — table des positions.
- `HoldingRow` — ligne avec actif, parts, valeur.
- `PortfolioAllocationChart` — donut de répartition.

#### Feature `yield`

- `YieldHistoryTable` — distributions passées.
- `YieldProjectionChart` — projections.
- `NextDistributionCard` — prochaine échéance.
- `ReinvestToggle` — opt-in réinvestissement automatique.

#### Feature `transfers`

- `TransferOfferList` — offres marketplace secondaire actives.
- `TransferOfferCard` — offre individuelle.
- `CreateTransferOfferForm` — formulaire de mise en vente.
- `TransferConfirmModal` — confirmation avant exécution.
- `TransferHistoryTable` — historique des cessions.

---

## 8. Structure feature-based

### 8.1 Anatomie d'une feature

Chaque feature suit la même structure :

```
features/<feature-name>/
├── api/             # Fonctions d'appel HTTP (fetch wrappers)
├── hooks/           # Hooks TanStack Query (useXxx)
├── schemas/         # Schémas Zod (validations)
├── components/      # Composants spécifiques à la feature
├── types/           # Types TypeScript du domaine
└── index.ts         # Barrel export (public API de la feature)
```

### 8.2 Règles inter-features

> **RULE-FE-FEAT-01.** Une feature MUST NOT importer directement les composants
> internes d'une autre feature. L'import passe par le barrel `index.ts`.

> **RULE-FE-FEAT-02.** Les composants vraiment partagés entre features
> MUST être déplacés dans `components/shared/`.

> **RULE-FE-FEAT-03.** Les types métier transverses (`User`, `Asset`, `Holding`)
> MUST vivre dans `types/domain.types.ts`, pas dans une feature.

### 8.3 Public API d'une feature (exemple)

```typescript
// features/kyc/index.ts
export { useKycStatus } from './hooks/useKycStatus';
export { useSubmitPersonalInfo } from './hooks/useSubmitPersonalInfo';
export { PersonalInfoForm } from './components/PersonalInfoForm';
export { KycLayoutWithSidebar } from './components/KycLayoutWithSidebar';
export type { KycStatus, KycLevel } from './types';
// Hooks et composants internes (non exportés) restent inaccessibles
```

---

## 9. Conventions de nommage

### 9.1 Fichiers

| Type | Convention | Exemple |
|------|------------|---------|
| Composant React | PascalCase + dossier | `AssetCard/AssetCard.tsx` |
| Hook | camelCase, préfixe `use` | `useKycStatus.ts` |
| Schéma Zod | camelCase + suffixe `.schema` | `signup.schema.ts` |
| Types | camelCase + suffixe `.types` | `auth.types.ts` |
| API call | camelCase + suffixe `.api` | `createInvestment.api.ts` |
| Page | PascalCase + suffixe `Page` | `MarketplacePage.tsx` |
| Helpers | camelCase | `formatCurrency.ts` |
| Constantes | camelCase ou SCREAMING | `apiRoutes.ts` |

### 9.2 Variables et fonctions

```typescript
// Booléens : préfixe is/has/should/can
const isLoading = true;
const hasKycValidated = false;
const shouldRedirect = true;

// Handlers : préfixe handle / on (préférer handle dans le composant, on dans les props)
const handleSubmit = () => {…};
<Form onSubmit={handleSubmit} />

// Hooks : préfixe use
function useKycStatus() { … }

// Mutations TanStack : préfixe use + verbe + ressource
useCreateInvestment, useSubmitPersonalInfo, useUploadDocument

// Queries TanStack : préfixe use + ressource (singulier ou pluriel selon données)
useAsset, useAssetList, usePortfolio, useKycStatus
```

### 9.3 Props

```typescript
// Interface : <ComponentName>Props
interface ButtonProps { … }

// Évènements : on<Action>
onClick, onSubmit, onChange, onFavorite

// Données : value, defaultValue, items, options
```

### 9.4 Query keys TanStack

> **RULE-FE-QK-01.** Toutes les query keys MUST être centralisées par feature
> dans un fichier `queryKeys.ts` pour éviter les fautes de frappe.

```typescript
// features/marketplace/queryKeys.ts
export const marketplaceKeys = {
  all: ['marketplace'] as const,
  list: (filters: AssetFilters) => [...marketplaceKeys.all, 'list', filters] as const,
  detail: (id: string) => [...marketplaceKeys.all, 'detail', id] as const,
};
```

---

## 10. Règles responsive

### 10.1 Breakpoints

```ts
// tailwind.config.ts
screens: {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
```

### 10.2 Principe mobile-first

> **RULE-FE-RWD-01.** Les classes Tailwind sont écrites mobile d'abord,
> puis surchargées aux breakpoints supérieurs.
>
> ✅ `className="text-base md:text-lg lg:text-xl"`
> ❌ `className="text-xl md:text-lg sm:text-base"` (inversé)

### 10.3 Layouts par viewport

| Élément | Mobile (< 768px) | Tablette (768–1024) | Desktop (≥ 1024) |
|---------|------------------|--------------------|--------------------|
| **Header** | Logo + burger menu | Logo + menu réduit | Logo + nav complète + avatar |
| **Marketplace** | 1 colonne stack | 2 colonnes | 4 colonnes + filtres latéraux |
| **KYC Layout** | Sidebar = drawer | Sidebar visible 240px | Sidebar 280px + aside droite 320px |
| **Asset detail** | 1 colonne, sidebar invest = sticky bottom | 2 colonnes 60/40 | 2 colonnes 70/30 |
| **Invest tunnel** | Stepper compact, sidebar masquée | Sidebar visible | Sidebar fixe |
| **SplitLayout** (signup, wallet succès) | Aside masquée | Aside masquée | Split 50/50 |

### 10.4 Composants tactiles

> **RULE-FE-RWD-02.** Toute zone tactile MUST avoir une taille minimale
> de 44 × 44 px (recommandation Apple/Material).

> **RULE-FE-RWD-03.** Les filtres latéraux (page 2) MUST devenir un drawer
> ou une modale en mobile, avec un bouton "Filtrer" visible en haut de la grille.

> **RULE-FE-RWD-04.** Les sidebars droites (KYC tips, security) MUST être
> repliées sous le contenu principal en mobile (pas masquées).

### 10.5 Sticky elements

| Élément | Sticky où |
|---------|----------|
| Header | Toujours sticky top |
| `InvestmentRecapAside` (mobile) | Sticky bottom avec total + bouton "Continuer" |
| `AssetInvestBox` (mobile) | Sticky bottom avec prix + "Investir maintenant" |
| Stepper KYC top (S04–S07) | Sticky top sous le header |

---

## 11. Loading, error, empty states

### 11.1 Principe

> **RULE-FE-STATE-01.** Tout composant qui consomme une query TanStack MUST gérer
> les 4 états : `loading`, `error`, `empty`, `success`.
> L'absence d'un état est un défaut de qualité.

### 11.2 Loading states

| Type | Composant à utiliser | Quand |
|------|---------------------|-------|
| **Skeleton** | `<Skeleton />` | Au premier chargement d'une page ou d'une section |
| **Spinner** | `<Spinner />` | À l'intérieur d'un bouton pendant une mutation |
| **Indéterminé (top bar)** | Bandeau `TanStack Query` `isFetching` | Mise à jour silencieuse en arrière-plan |

**Skeletons attendus pour chaque grand écran :**
- `AssetCardSkeleton` (marketplace)
- `AssetDetailSkeleton`
- `PortfolioSummarySkeleton`
- `YieldHistoryTableSkeleton`
- `KycStatusCardSkeleton`

### 11.3 Error states

| Niveau | Composant | Quand |
|--------|-----------|-------|
| **Form field** | `<Input error="..." />` | Erreur de validation Zod |
| **Form global** | `<Alert variant="danger" />` au-dessus du formulaire | Mutation échouée |
| **Section** | `<ErrorState />` à la place du contenu | Query échouée sur une section |
| **Page** | `<ErrorBoundaryPage />` | Erreur React non interceptée |

> **RULE-FE-STATE-02.** Les messages d'erreur affichés à l'utilisateur MUST
> être en langage naturel, pas des codes techniques.
>
> ✅ "Impossible de charger vos investissements. Réessayer ?"
> ❌ "Error 500: Internal Server Error / TypeError: cannot read property 'data' of undefined"

> **RULE-FE-STATE-03.** Toute erreur affichée MUST proposer une action :
> `Réessayer`, `Recharger la page`, `Contacter le support`.

### 11.4 Empty states

| Cas | Composant | Message + action |
|-----|-----------|------------------|
| Portefeuille vide | `<EmptyState />` | "Vous n'avez pas encore d'investissement" + CTA "Découvrir les actifs" |
| Aucun actif filtré | `<EmptyState />` | "Aucun actif ne correspond à ces critères" + CTA "Réinitialiser les filtres" |
| Pas de notifications | `<EmptyState />` | "Aucune notification pour le moment" |
| Pas de transferts | `<EmptyState />` | "Vous n'avez pas encore reçu ni envoyé de Solar Cells" |

### 11.5 Optimistic updates

> **RULE-FE-STATE-04.** Pour les mutations à fort impact visuel (favoris,
> réinvestissement toggle, lecture de notification), un update optimiste
> SHOULD être appliqué via `onMutate` TanStack Query, avec rollback en cas d'erreur.

---

## 12. Règles UX transverses

### 12.1 Feedback utilisateur

> **RULE-FE-UX-01.** Toute action utilisateur (clic, soumission) MUST avoir
> un feedback visible dans les 100 ms : changement d'état, spinner, toast.

> **RULE-FE-UX-02.** Les succès importants MUST être confirmés par un toast
> ET un changement d'état dans l'UI (ex. carte mise à jour, redirection).

> **RULE-FE-UX-03.** Les confirmations destructives (annulation d'investissement,
> retrait important) MUST passer par une modale avec saisie d'une confirmation
> explicite ("Tapez CONFIRMER").

### 12.2 Transitions et animations

| Transition | Durée | Easing |
|------------|-------|--------|
| Hover sur carte | 150 ms | `ease-out` |
| Apparition modal | 200 ms | `ease-out` |
| Fermeture modal | 150 ms | `ease-in` |
| Page transition | Aucune (navigation instantanée) | — |
| Toast | 4 s par défaut, dismissable | — |
| Confetti / célébration (S14) | 2 s | — |

> **RULE-FE-UX-04.** MUST NOT : animations qui retardent la lecture d'information critique.

### 12.3 Accessibilité (a11y)

> **RULE-FE-A11Y-01.** Tous les éléments interactifs MUST être atteignables au clavier.

> **RULE-FE-A11Y-02.** Tous les inputs MUST avoir un `<label>` associé
> (via `htmlFor` + `id`).

> **RULE-FE-A11Y-03.** Les erreurs de formulaire MUST utiliser
> `aria-invalid` et `aria-describedby`.

> **RULE-FE-A11Y-04.** Les icônes décoratives MUST être marquées `aria-hidden="true"`.
> Les icônes porteuses de sens MUST avoir un `aria-label`.

> **RULE-FE-A11Y-05.** Le contraste de texte MUST respecter WCAG AA (4.5:1 minimum).

> **RULE-FE-A11Y-06.** Les modales MUST piéger le focus (`focus-trap`) et
> être fermables par `Escape`.

### 12.4 Internationalisation

> **RULE-FE-I18N-01.** Toute string utilisateur MUST passer par `i18n.t('key')`.
> Aucune string codée en dur dans les composants.

> **RULE-FE-I18N-02.** Les formats (date, monnaie, nombre) MUST utiliser
> `Intl.DateTimeFormat`, `Intl.NumberFormat` avec la locale active.

> **RULE-FE-I18N-03.** Le sélecteur de langue (header, vu sur tous les écrans)
> persiste la préférence dans un cookie/localStorage.

### 12.5 Préservation de l'état

> **RULE-FE-UX-05.** Les tunnels multi-étapes (KYC, Invest) MUST préserver
> les données saisies en cas de rafraîchissement de page (sessionStorage
> ou serveur via l'API si l'étape est validée).

> **RULE-FE-UX-06.** Le retour navigateur (bouton ←) dans un tunnel MUST
> revenir à l'étape précédente sans perte de données.

---

## 13. TanStack Query — patterns

### 13.1 Configuration globale

```typescript
// lib/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,              // 30 s avant de considérer stale
      gcTime: 5 * 60_000,             // 5 min en cache après dernier usage
      retry: 2,                       // 2 retries avant d'échouer
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false,    // À évaluer
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,                       // Pas de retry automatique sur mutation
    },
  },
});
```

### 13.2 Pattern : query hook

```typescript
// features/portfolio/hooks/usePortfolio.ts
import { useQuery } from '@tanstack/react-query';
import { fetchPortfolio } from '../api/getPortfolio.api';
import { portfolioKeys } from '../queryKeys';

export function usePortfolio() {
  return useQuery({
    queryKey: portfolioKeys.detail(),
    queryFn: fetchPortfolio,
    staleTime: 60_000,
  });
}
```

### 13.3 Pattern : mutation hook

```typescript
// features/invest/hooks/useCreateInvestment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvestment } from '../api/createInvestment.api';
import { portfolioKeys } from '@/features/portfolio/queryKeys';
import { marketplaceKeys } from '@/features/marketplace/queryKeys';

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInvestment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.all });
      qc.invalidateQueries({ queryKey: marketplaceKeys.all });
    },
  });
}
```

### 13.4 Règles

> **RULE-FE-TSQ-01.** Aucun composant ne MUST appeler `useQueryClient()` pour
> faire un `setQueryData` ou un `invalidateQueries` directement.
> Ces opérations vivent dans les hooks de mutation.

> **RULE-FE-TSQ-02.** Les query keys MUST être centralisées dans un fichier
> `queryKeys.ts` par feature.

> **RULE-FE-TSQ-03.** Les fonctions API (`*.api.ts`) MUST être pures :
> elles prennent des paramètres typés et retournent des Promesses typées,
> sans dépendance à TanStack Query.

> **RULE-FE-TSQ-04.** Les hooks `useXxx` MUST retourner les données du hook
> TanStack telles quelles (pas de remapping), sauf cas justifié.

### 13.5 Invalidations attendues

| Mutation | Invalide |
|----------|----------|
| `useCreateInvestment` | `portfolio.*`, `marketplace.detail(assetId)`, `yield.projections` |
| `useSubmitPersonalInfo` | `kyc.status` |
| `useCreateWallet` | `wallet.detail`, `currentUser` |
| `useCreateTransferOffer` | `transfers.list`, `portfolio.holdings` |
| `useToggleReinvest` | `portfolio.settings` |

---

## 14. React Hook Form + Zod — patterns

### 14.1 Pattern de base

```typescript
// features/auth/components/SignupForm/SignupForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormValues } from '../../schemas/signup.schema';

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { mutate, isPending, error } = useSignup();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      countryOfResidence: '',
      accountType: 'individual',
      acceptedTerms: false,
      acceptedMarketing: false,
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    mutate(values, { onSuccess });
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ...champs... */}
    </form>
  );
}
```

### 14.2 Schémas Zod

```typescript
// features/auth/schemas/signup.schema.ts
import { z } from 'zod';

export const signupSchema = z
  .object({
    email: z.string().email('Adresse e-mail invalide'),
    password: z
      .string()
      .min(8, 'Minimum 8 caractères')
      .regex(/[A-Z]/, 'Au moins une majuscule')
      .regex(/[0-9]/, 'Au moins un chiffre'),
    confirmPassword: z.string(),
    countryOfResidence: z.string().min(1, 'Pays requis'),
    accountType: z.enum(['individual', 'professional', 'institutional']),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'Vous devez accepter les conditions' }),
    }),
    acceptedMarketing: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
```

### 14.3 Règles

> **RULE-FE-RHF-01.** Le mode de validation MUST être `onBlur` ou `onChange` —
> jamais `onSubmit` seul (mauvaise UX).

> **RULE-FE-RHF-02.** Les schémas Zod MUST exporter aussi le type inféré
> via `z.infer`.

> **RULE-FE-RHF-03.** Les messages d'erreur MUST être en français, contextuels,
> et actionnables (dire quoi corriger).

> **RULE-FE-RHF-04.** Les formulaires multi-étapes (KYC, Invest) MUST utiliser
> des sous-schémas Zod par étape, plus un schéma cumulé pour la soumission finale.

### 14.4 Schémas attendus (liste minimale MVP)

| Schéma | Feature | Écran |
|--------|---------|-------|
| `login.schema.ts` | auth | S20 |
| `signup.schema.ts` | auth | S03 |
| `forgotPassword.schema.ts` | auth | S21 |
| `personalInfo.schema.ts` | kyc | S04 |
| `identityUpload.schema.ts` | kyc | S23 |
| `proofOfAddress.schema.ts` | kyc | S05 |
| `sourceOfFunds.schema.ts` | kyc | S24 |
| `walletTypeSelection.schema.ts` | wallet | S08 |
| `assetFilters.schema.ts` | marketplace | S02 |
| `investAmount.schema.ts` | invest | S10 |
| `investPayment.schema.ts` | invest | S11 |
| `investFull.schema.ts` | invest | S12 (cumul) |
| `transferOffer.schema.ts` | transfers | S18 |
| `profileEdit.schema.ts` | profile | S19 |
| `bankAccount.schema.ts` | profile | S19 |

---

## 15. React Router — patterns

### 15.1 Configuration

```typescript
// routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { OnboardingLayout } from '@/components/layout/OnboardingLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { KycRequiredRoute } from './KycRequiredRoute';
// imports des pages...

export const router = createBrowserRouter([
  // Public
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/inscription', element: <PublicOnlyRoute><SignupPage /></PublicOnlyRoute> },
      { path: '/connexion', element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute> },
      // ...
    ],
  },
  // Onboarding (auth mais KYC pending)
  {
    element: <ProtectedRoute><OnboardingLayout /></ProtectedRoute>,
    children: [
      { path: '/kyc/informations', element: <KycPersonalInfoPage /> },
      { path: '/kyc/identite', element: <KycIdentityPage /> },
      { path: '/kyc/selfie', element: <KycSelfiePage /> },
      // ...
      { path: '/wallet/creation', element: <WalletTypeChoicePage /> },
      { path: '/wallet/cree', element: <WalletCreatedPage /> },
    ],
  },
  // Authenticated + KYC validé
  {
    element: <ProtectedRoute><KycRequiredRoute><AuthLayout /></KycRequiredRoute></ProtectedRoute>,
    children: [
      { path: '/tableau-de-bord', element: <DashboardPage /> },
      { path: '/actifs', element: <MarketplacePage /> },
      { path: '/actifs/:assetId', element: <AssetDetailPage /> },
      { path: '/investir/:assetId/montant', element: <InvestAmountPage /> },
      // ...
    ],
  },
  // 404
  { path: '*', element: <NotFoundPage /> },
]);
```

### 15.2 Garde `ProtectedRoute`

```typescript
// routes/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/connexion" state={{ from: location }} replace />;

  return <>{children}</>;
}
```

### 15.3 Garde `KycRequiredRoute`

```typescript
// routes/KycRequiredRoute.tsx
export function KycRequiredRoute({ children }: { children: React.ReactNode }) {
  const { data: kyc } = useKycStatus();

  if (!kyc) return <FullPageSpinner />;
  if (kyc.status !== 'validated') {
    const nextStep = getNextKycStep(kyc);
    return <Navigate to={nextStep} replace />;
  }
  return <>{children}</>;
}
```

### 15.4 Règles

> **RULE-FE-ROUTER-01.** Aucune redirection MUST utiliser `window.location.href`.
> Utiliser `<Navigate>` ou `useNavigate()`.

> **RULE-FE-ROUTER-02.** Les paramètres d'URL MUST être validés par Zod dans la page
> (cas du `:assetId`). Un paramètre invalide redirige vers `/actifs` avec un toast d'erreur.

> **RULE-FE-ROUTER-03.** Le scroll MUST être remis en haut à chaque navigation
> sauf navigation arrière (préserver la position dans la marketplace par exemple).

---

## 16. Stratégie de micro-commits

Cette section est le **guide opérationnel** pour Claude Code / Codex.
Chaque ligne ci-dessous correspond à **un commit**.

### 16.1 Initialisation (séquence 1)

```
chore(frontend): scaffold Vite + React + TypeScript project
chore(frontend): add Tailwind config and base css
chore(frontend): add ESLint and Prettier configs
chore(frontend): add TypeScript strict tsconfig
chore(frontend): add path alias @/* in tsconfig
chore(frontend): add cn util (clsx + tailwind-merge)
chore(frontend): add lib/env validated by Zod
chore(frontend): add api client wrapper
chore(frontend): add queryClient config
chore(frontend): add QueryProvider
chore(frontend): add I18nProvider with FR/EN scaffolding
chore(frontend): add ToastProvider with sonner
```

### 16.2 Primitives UI (séquence 2)

Une primitive = un commit. Ordre suggéré (du plus simple au plus complexe) :

```
feat(frontend): add Button primitive
feat(frontend): add Input primitive
feat(frontend): add PasswordInput primitive
feat(frontend): add Select primitive
feat(frontend): add Checkbox primitive
feat(frontend): add Radio primitive
feat(frontend): add Badge primitive
feat(frontend): add Tag primitive
feat(frontend): add IconBox primitive
feat(frontend): add Card primitive
feat(frontend): add Avatar primitive
feat(frontend): add Spinner primitive
feat(frontend): add Skeleton primitive
feat(frontend): add Alert primitive
feat(frontend): add Divider primitive
feat(frontend): add Stack helpers (VStack, HStack)
feat(frontend): add Container primitive
feat(frontend): add ProgressBar primitive
feat(frontend): add ProgressDots primitive
feat(frontend): add Stepper primitive
feat(frontend): add StepperVertical primitive
feat(frontend): add Tabs primitive
feat(frontend): add Modal primitive
feat(frontend): add Drawer primitive
feat(frontend): add Tooltip primitive
feat(frontend): add EmptyState primitive
feat(frontend): add ErrorState primitive
feat(frontend): add CopyButton primitive
feat(frontend): add FileDropzone primitive
feat(frontend): add RadioCard primitive
feat(frontend): add AmountInput primitive
feat(frontend): add AmountPresetGrid primitive
feat(frontend): add CountryFlag primitive
feat(frontend): add CountrySelect primitive
feat(frontend): add PhoneInput primitive
feat(frontend): add Slider primitive
feat(frontend): add Switch primitive
feat(frontend): add LanguageSwitcher primitive
feat(frontend): add NotificationBell primitive
feat(frontend): add StatCard primitive
feat(frontend): add TrustBadge primitive
feat(frontend): add FeatureCard primitive
```

### 16.3 Layouts (séquence 3)

```
feat(frontend): add PublicLayout
feat(frontend): add AuthLayout
feat(frontend): add OnboardingLayout
feat(frontend): add SplitLayout
feat(frontend): add HeaderPublic
feat(frontend): add HeaderAuth
feat(frontend): add HeaderUserMenu
feat(frontend): add Footer with partner logos
feat(frontend): add FooterTrustBar
feat(frontend): add SidebarOnboarding
feat(frontend): add SidebarHelp block
```

### 16.4 Feature par feature (séquence 4)

Pour chaque feature, suivre la séquence :

```
1. chore(frontend): scaffold features/<feature> folder structure
2. feat(frontend): add <feature> types
3. feat(frontend): add <feature> query keys
4. feat(frontend): add <api function> in <feature>
5. feat(frontend): add <use* hook> in <feature>
6. feat(frontend): add <schema> Zod for <form>
7. feat(frontend): add <Component> in <feature>
8. test(frontend): add tests for <Component>
9. feat(frontend): add <Page> assembling <feature> components
10. test(frontend): add integration test for <Page>
```

### 16.5 Ordre suggéré des features (par dépendances)

```
1. auth         → signup, login (S03, S20)
2. kyc          → S04, S05, S07, S23, S24, S25
3. wallet       → S06, S08
4. marketplace  → S02
5. asset        → S09
6. invest       → S10, S11, S12, S13, S14
7. portfolio    → S16
8. yield        → S17
9. transfers    → S18
10. profile     → S19
```

### 16.6 Exemple détaillé : feature `auth`

```
chore(frontend): scaffold features/auth folder structure
feat(frontend): add auth types
feat(frontend): add auth query keys
feat(frontend): add login api function
feat(frontend): add signup api function
feat(frontend): add logout api function
feat(frontend): add refresh api function
feat(frontend): add useCurrentUser query hook
feat(frontend): add useLogin mutation hook
feat(frontend): add useSignup mutation hook
feat(frontend): add useLogout mutation hook
feat(frontend): add login Zod schema
feat(frontend): add signup Zod schema
feat(frontend): add forgotPassword Zod schema
feat(frontend): add LoginForm component
feat(frontend): add SignupForm component
feat(frontend): add SignupHeroAside component
feat(frontend): add GoogleOAuthButton component
feat(frontend): add TermsAcceptCheckbox component
feat(frontend): add LoginPage assembling auth feature
feat(frontend): add SignupPage assembling auth feature
feat(frontend): add ForgotPasswordPage
chore(frontend): wire auth routes in router
test(frontend): add tests for LoginForm
test(frontend): add tests for SignupForm
```

---

## Annexe A — Mapping écran → composants

> Cette annexe est destinée à Claude Code / Codex pour générer un écran complet
> en connaissant exactement ses dépendances.

### S01 — Landing

```
LandingPage
├── HeaderPublic
├── HeroSection
│   ├── TagOverline ("ACTIFS RÉELS • TRANSPARENCE • IMPACT")
│   ├── HeroTitle (h1)
│   ├── HeroSubtitle
│   ├── HeroCtaGroup (Button primary + Button ghost)
│   └── HeroTrustBadges (3 × TrustBadge)
├── HowItWorksDiagram (1 → 2 → 3)
├── StatsBar (4 × StatCard)
├── FeatureCardsSection (3 × FeatureCard)
├── FooterPartners (Bridge / Tempo / Swiss Banking / Certified)
└── Footer
```

### S02 — Marketplace

```
MarketplacePage
├── HeaderAuth
├── PageHeader (titre + sous-titre + StatsBar inline)
├── MarketplaceFiltersPanel
│   ├── MarketplaceCountryFilter
│   ├── MarketplaceTypeFilter
│   ├── MarketplaceStatusFilter
│   ├── MarketplaceYieldRangeFilter
│   └── MarketplaceSortDropdown
├── MarketplaceTopBar (ResultCount + ViewToggle + SortDropdown)
├── MarketplaceGrid
│   └── AssetCard × N
└── TrustFooterBar
```

### S03 — Signup

```
SignupPage
└── SplitLayout
    ├── aside: SignupHeroAside (4 bullets + image)
    └── main:
        ├── HeaderPublic (réduit)
        ├── Stepper horizontal (3 étapes)
        ├── SignupForm
        │   ├── Input (email)
        │   ├── PasswordInput (password)
        │   ├── PasswordInput (confirmPassword)
        │   ├── CountrySelect
        │   ├── Select (accountType)
        │   ├── TermsAcceptCheckbox
        │   ├── Checkbox (marketing opt-in)
        │   └── Button (Créer mon compte)
        ├── Divider ("OU")
        ├── GoogleOAuthButton
        └── Alert (RGPD/KYC info)
```

### S04 — KYC Informations

```
KycPersonalInfoPage
└── OnboardingLayout
    ├── sidebar: KycProgressTimeline + HelpSidebarBlock
    ├── main:
    │   ├── KycStepHeader (titre + sous-titre + KycStatusCard inline)
    │   ├── KycProgressDots (6 icônes horizontales)
    │   └── PersonalInfoForm
    │       ├── Input (firstName)
    │       ├── Input (lastName)
    │       ├── DatePicker (dateOfBirth)
    │       ├── CountrySelect (nationality)
    │       ├── CountrySelect (countryOfResidence)
    │       ├── PhoneInput
    │       ├── Input (email, readonly)
    │       └── Button (Continuer →)
    └── aside: KycSecurityAside + "Pourquoi cette vérification ?"
```

### S05 — KYC Justificatif de domicile

```
KycProofOfAddressPage
└── OnboardingLayout
    ├── sidebar: KycProgressTimeline (étape 4 active) + HelpSidebarBlock
    ├── main:
    │   ├── KycStepHeader
    │   ├── FileDropzone
    │   ├── Alert (sécurité chiffrement)
    │   ├── Alert (info délai 1–24h)
    │   └── ButtonGroup (← Précédent | Continuer →)
    └── aside: DocumentExamplesPanel (Documents acceptés + Exemples ✓/✗)
```

### S06 — Wallet créé (succès)

```
WalletCreatedPage
└── SplitLayout
    ├── aside: hero illustration + 4 bullets (Sécurisé / Simple / Conforme / Contrôlé)
    └── main:
        ├── Stepper horizontal (4 étapes, étape 3 active)
        ├── WalletCreatedSuccess
        │   ├── Alert (success "Wallet créé avec succès")
        │   ├── WalletAddressBox (adresse + CopyButton)
        │   ├── WalletNetworkBadge ("Tempo (Stripe)")
        │   ├── Badge "Custodial (sécurisé)"
        │   └── WalletActionsGrid (4 cartes)
        └── aside: WalletSecurityAside
```

### S07 — KYC Selfie

```
KycSelfiePage
└── OnboardingLayout
    ├── sidebar: KycProgressTimeline (étape 3 active) + HelpSidebarBlock
    ├── main:
    │   ├── KycStepHeader
    │   ├── SelfieCaptureBox (avec instructions positionnement)
    │   ├── ChecklistRow (Visage / Luminosité / Lunettes / Regard)
    │   ├── Button primary (Démarrer la capture)
    │   └── ButtonGroup (← Précédent | Continuer disabled)
    └── aside: SelfieTipsCard + "Confidentialité & sécurité"
```

### S08 — Wallet — Choix du type

```
WalletTypeChoicePage
└── OnboardingLayout
    ├── sidebar: KycProgressTimeline (étape 5 active) + HelpSidebarBlock
    ├── main:
    │   ├── KycStepHeader
    │   ├── Heading "Type de wallet"
    │   ├── RadioCard × 2 (Custodial recommandé / Non-custodial)
    │   ├── Alert (info clés sécurisées)
    │   └── ButtonGroup (← Précédent | Créer mon wallet →)
    └── aside: "Sécurité garantie" + "Ce que vous pourrez faire"
```

### S09 — Détail actif

```
AssetDetailPage
└── AuthLayout
    ├── BackLink "← Retour à la marketplace"
    ├── grid 2 colonnes:
    │   ├── main (70%):
    │   │   ├── AssetGalleryCarousel + AssetStatusBadge + FavoriteButton
    │   │   ├── AssetDetailHeader (titre + drapeau + description + Tags)
    │   │   ├── AssetQuickStats (4 stats)
    │   │   ├── AssetDetailTabs
    │   │   │   ├── Aperçu      → AssetOverviewPanel (Donut + métriques + chart)
    │   │   │   ├── Financiers
    │   │   │   ├── Techniques
    │   │   │   ├── Documents
    │   │   │   ├── Performance → AssetEstimatedPerformanceChart
    │   │   │   └── Risques
    │   │   └── AssetKeyInfoCard (Informations clés)
    │   └── aside (30%):
    │       └── AssetInvestBox (sticky)
    │           ├── Prix
    │           ├── ProgressBar tokens disponibles
    │           ├── Rendement cible
    │           ├── AmountPresetGrid
    │           ├── Helper "Vous recevrez ≈ N SCT"
    │           ├── Button primary (Investir maintenant →)
    │           └── Button ghost (Ajouter aux favoris)
    └── TrustFooterBar
```

### S10–S12 — Tunnel d'investissement

```
InvestAmountPage / InvestPaymentPage / InvestSummaryPage
└── AuthLayout
    ├── BackLink "← Retour à l'actif"
    ├── InvestStepper (4 étapes)
    ├── grid 2 colonnes:
    │   ├── main: <InvestAmountStep | InvestPaymentStep | InvestSummaryStep>
    │   └── aside: InvestmentRecapAside (AssetCardMini + récap chiffrée + WhatYouReceiveBox + HelpSidebarBlock)
    └── TrustFooterBar
```

### S13 / S14 — Confirmation et félicitations

```
InvestConfirmationPage (S13)
└── AuthLayout
    ├── BackLink
    ├── InvestStepper (étape 4 active)
    ├── grid 2 colonnes:
    │   ├── main:
    │   │   ├── SuccessHeader (icon check + titre + sous-titre)
    │   │   ├── Alert success (email envoyé + Button "Télécharger le reçu")
    │   │   ├── Section "Détails de votre investissement" (table clé/valeur)
    │   │   ├── WhatYouReceiveBox (50 SCT + lien vers portefeuille)
    │   │   ├── NextStepsList (3 items)
    │   │   └── ButtonGroup (Voir mon portefeuille | Retour au tableau de bord)
    │   └── aside: InvestmentRecapAside
    └── TrustFooterBar

InvestSuccessPage (S14)  — transition optionnelle, autodismiss 2s
└── AuthLayout
    └── InvestSuccessHero (confetti + checkmark animé + Heading + ButtonGroup + WhatNextCards)
```

---

## Annexe B — Checklist d'acceptation par écran

> Chaque écran sera considéré "done" lorsque tous les critères ci-dessous sont remplis.
> À utiliser comme template dans `specs/screens/<ID>.md`.

```
- [ ] Composants UI primitives utilisés sont tous documentés
- [ ] Composants métier sont dans la bonne feature
- [ ] Schémas Zod validés
- [ ] Hooks TanStack Query implémentés avec queryKeys centralisées
- [ ] États loading, error, empty, success couverts
- [ ] Responsive mobile / tablette / desktop testé
- [ ] Accessibilité clavier vérifiée
- [ ] Labels ARIA présents
- [ ] i18n : aucune string codée en dur
- [ ] Validations Zod en français, contextuelles
- [ ] Tests unitaires pour les composants métier critiques
- [ ] Tests d'intégration pour le flux principal
```

---

*Document vivant. Toute modification : commit `docs: update frontend-spec vX.Y.Z`.*
