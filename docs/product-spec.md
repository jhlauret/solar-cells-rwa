---
document: product-spec
version: 2.1.0
status: draft
classification: interne — confidentiel
jurisdiction: EU / CH
last-updated: 2025-05
supersedes: 2.0.0
authors: [product, architecture, compliance]
compatible-with: [claude-code, codex, github-spec-kit]
changelog-v2-1:
  - aligned with specs/mdd/00-overview.md v2.1 and docs/odoo-mdd.md v1.0
  - naming: sc.* → solar.*, solarcells_* → solar_*
  - models: solar.wallet extracted as dedicated model
  - models: solar.investment.order added
  - models: payment/payout unified into solar.payment.transaction
  - models: KYC restructured (case + document + decision)
---

# SolarCells RWA — Product Specification v2.1

> **Positionnement :** Plateforme institutionnelle européenne de tokenisation
> d'actifs solaires réels (Real World Assets), permissionnée, conforme MiCA et FINMA,
> orientée investisseurs qualifiés et retail onboardés.

> **Principe directeur :** La blockchain est une infrastructure.
> L'investisseur ne la voit jamais.

---

## Table des matières

| # | Section |
|---|---------|
| 1 | [Vision produit](#1-vision-produit) |
| 2 | [Proposition de valeur](#2-proposition-de-valeur) |
| 3 | [Personas](#3-personas) |
| 4 | [Juridictions & Régulation](#4-juridictions--régulation) |
| 5 | [Modèle économique](#5-modèle-économique) |
| 6 | [Architecture générale](#6-architecture-générale) |
| 7 | [Frontend & UX](#7-frontend--ux) |
| 8 | [Parcours utilisateur](#8-parcours-utilisateur) |
| 9 | [Onboarding & Compliance](#9-onboarding--compliance) |
| 10 | [Wallet & Custody Strategy](#10-wallet--custody-strategy) |
| 11 | [Blockchain & Tokenization](#11-blockchain--tokenization) |
| 12 | [Stripe / Bridge / Tempo Strategy](#12-stripe--bridge--tempo-strategy) |
| 13 | [Marketplace secondaire](#13-marketplace-secondaire) |
| 14 | [Yield & Revenue Distribution](#14-yield--revenue-distribution) |
| 15 | [Architecture événementielle](#15-architecture-événementielle) |
| 16 | [Services backend](#16-services-backend) |
| 17 | [Odoo Community V18](#17-odoo-community-v18) |
| 18 | [Audit & Observability](#18-audit--observability) |
| 19 | [Providers & Adapters](#19-providers--adapters) |
| 20 | [Data & Storage](#20-data--storage) |
| 21 | [AI Future Layer](#21-ai-future-layer) |
| 22 | [Scalabilité future](#22-scalabilité-future) |

---

## 1. Vision produit

### 1.1 Contexte macroéconomique

La transition énergétique européenne requiert 800 Mds € d'investissements
dans les énergies renouvelables d'ici 2030 (source : Commission européenne, REPowerEU).
Les infrastructures solaires présentent un profil de risque/rendement attractif :
revenus prévisibles via PPA, durée de vie de 25–30 ans, corrélation faible
avec les marchés financiers traditionnels.

Ces actifs restent néanmoins inaccessibles aux investisseurs individuels :
tickets minimaux élevés, friction administrative, absence de liquidité secondaire,
opacité du registre de propriété.

### 1.2 Thèse d'investissement

**SolarCells RWA tokenise des infrastructures solaires réelles**
pour les rendre accessibles, liquides et auditables via une plateforme
permissionnée conforme aux réglementations européennes et suisses.

La tokenisation apporte :
- **Fractionnement** : ticket d'entrée à partir de 1 000 €.
- **Propriété infalsifiable** : registre on-chain auditable par des tiers régulateurs.
- **Liquidité secondaire** : cession de parts entre investisseurs whitelistés.
- **Automatisation** : distribution de rendements par smart contracts, sans traitement manuel.
- **Transparence** : production, revenus et répartition vérifiables en temps réel.

### 1.3 Positionnement RWA Infrastructure

SolarCells appartient à la catégorie **RWA Infrastructure** :
actifs physiques à revenus récurrents, contraste avec les RWA de dette
(obligations tokenisées) ou les RWA immobiliers.

Caractéristiques différenciantes :
- Sous-jacent physique vérifiable (panneaux solaires géolocalisés).
- Revenu indexé sur production réelle (kWh mesurés).
- Contrats PPA sécurisant le revenu sur 10–25 ans.
- Dimension ESG intrinsèque (impact carbone mesurable).

### 1.4 Plateforme permissionnée

SolarCells opère une **plateforme permissionnée** :
chaque participant (investisseur, opérateur, gestionnaire) est identifié,
vérifié (KYC/AML), et whitelisté avant tout accès aux fonctionnalités financières.

Cette architecture permissionnée est un choix réglementaire et de risque,
pas une limitation technique. Elle permet :
- La conformité MiCA (EU) et FINMA (CH).
- Le respect des restrictions de transfert par juridiction.
- L'auditabilité complète par les régulateurs.
- La prévention du blanchiment et du financement du terrorisme.

### 1.5 Approche Europe + Suisse

| Marché | Réglementation | Particularités |
|--------|---------------|----------------|
| Union européenne | MiCA, MiFID II, AMLD6 | Passeport européen, euro/EURC |
| Suisse | FINMA DLT Act, AMLA | Cadre DLT avancé, CHF/stablecoin CHF |

La Suisse est ciblée en priorité MVP pour sa clarté réglementaire DLT
et la maturité de son écosystème fintech institutionnel.
L'expansion UE interviendra en V2 avec adaptation au passeport MiCA.

### 1.6 Finance programmable & stablecoins

Les flux financiers (souscription, distribution, cession) sont exécutés
en stablecoins (EURC, USDC, EURCV selon prestataire) sur la couche blockchain Tempo.
La conversion fiat ↔ stablecoin est orchestrée par Bridge (couche Stripe).

Cela permet :
- Settlement automatique et instantané (vs T+2 bancaire).
- Distribution de rendements sans intervention humaine.
- Réconciliation bancaire automatisée.
- Audit cryptographiquement vérifiable de chaque flux.

### 1.7 Architecture compatible IA future

L'architecture événementielle (Redis Streams, domain events, projections)
est conçue pour être consommée par des agents IA en V3 :
copilotes conformité, agents de reporting, générateurs documentaires,
modèles de projection énergétique. Voir section 21.

---

## 2. Proposition de valeur

### 2.1 Piliers de valeur

| Pilier | Description | Bénéficiaire principal |
|--------|-------------|----------------------|
| **Investissement fractionné** | Parts dès 1 000 € sur des actifs > 1 M€ | Retail, HNWI |
| **Rendement énergétique réel** | Revenu indexé sur la production solaire via PPA | Tous investisseurs |
| **Liquidité secondaire** | Cession entre investisseurs whitelistés via marketplace | HNWI, Family Office |
| **Transparence on-chain** | Registre de propriété public et auditable | Compliance, Régulateurs |
| **Auditabilité complète** | Chaque événement horodaté, immuable, vérifiable | Compliance, Audit |
| **Automatisation** | Distribution de rendements sans intervention manuelle | Tous investisseurs |
| **Conformité intégrée** | KYC/AML/whitelist embarqués dans le protocole | Compliance Officer |
| **Expérience simplifiée** | Interface fintech, blockchain invisible | Retail, HNWI |

### 2.2 Matrice de valeur par persona

| Persona | Valeur primaire | Valeur secondaire |
|---------|----------------|------------------|
| Investisseur particulier | Accès à un actif réel à faible ticket | Rendement prévisible, ESG |
| Investisseur qualifié | Liquidité secondaire + rendement optimisé | Diversification décorrélée |
| Opérateur solaire | Financement de ses projets | Accès à une base d'investisseurs qualifiés |
| Administrateur plateforme | Visibilité opérationnelle complète | Audit trail exhaustif |
| Compliance officer | Conformité intégrée + audit automatique | Réduction du risque réglementaire |
| Gestionnaire portefeuille | Reporting structuré + projections | Cession secondaire pour ses clients |
| Opérateur KYC | Workflows guidés + intégration prestataire | Gestion documentaire centralisée |
| Opérateur finance | Réconciliation automatisée | Reporting fiscal prêt |

---

## 3. Personas

### 3.1 Investisseur particulier — Thomas, 31 ans

**Profil :** Ingénieur, revenus 65 k€/an, patrimoniau naissant (ETF, livret A).
Premier investissement en actifs alternatifs. Sensible au changement climatique.
Pas de connaissance blockchain.

**Motivations :** Rendement > inflation, impact ESG mesurable, ticket accessible.

**Contraintes :** Ne veut pas gérer un wallet. Peur de la complexité crypto.
Attend une expérience mobile-first aussi fluide que Revolut ou Boursorama.

**Besoins produit :**
- Onboarding < 10 minutes.
- Tableau de bord clair : combien j'ai investi, combien je gagne.
- Notifications push à chaque distribution.
- Document fiscal prêt pour sa déclaration.

---

### 3.2 Investisseur qualifié / HNWI — Marc, 54 ans

**Profil :** Dirigeant de PME industrielle. Patrimoine > 3 M€.
Habitué : SCPI, club deals, private equity. Géré par un CGP.
Cherche de la décorrélation et du rendement stable.

**Motivations :** 5–8 % net annuel, actif tangible, liquidité intermédiaire.
Délègue la gestion opérationnelle.

**Contraintes :** Exige de la transparence sur les actifs sous-jacents.
Son CGP doit pouvoir accéder à ses positions.

**Besoins produit :**
- Accès délégué pour son CGP.
- Export PDF/CSV de son portefeuille.
- Historique complet des distributions.
- Simulation de cession secondaire avec estimation de prix.

---

### 3.3 Opérateur solaire — Jean-Baptiste, 44 ans

**Profil :** Développeur de projets ENR (éolien, solaire).
Société de projet (SPV) avec 3–5 actifs en portefeuille.
Cherche des sources de financement alternatives aux banques.

**Motivations :** Financer l'extension de ses parcs solaires sans dilution capitalistique.
Accéder à une base d'investisseurs qualifiés directement.

**Contraintes :** Doit fournir une documentation technique précise sur chaque actif.
Ne veut pas gérer la relation investisseur directement.

**Besoins produit :**
- Interface d'enregistrement d'actif avec upload de documents techniques.
- Dashboard de production et de revenus par actif.
- Reporting automatisé vers les investisseurs.
- Accès aux statistiques de souscription (anonymisées).

---

### 3.4 Administrateur plateforme — Isabelle, 39 ans

**Profil :** Ops manager fintech, 10 ans d'expérience.
Supervise les opérations quotidiennes : onboarding, KYC, actifs, paiements.

**Motivations :** Avoir une vue opérationnelle complète en temps réel.
Pouvoir intervenir sur n'importe quel dossier sans développement.

**Besoins produit (Odoo back-office) :**
- Vue globale des investisseurs et de leurs statuts.
- Gestion manuelle des escalades KYC.
- Tableau de bord des paiements entrants/sortants.
- Configuration des actifs et des paramètres de distribution.
- Gestion des alertes AML.

---

### 3.5 Compliance Officer — Fatima, 46 ans

**Profil :** Ancienne banquier, spécialiste AML/KYC.
Responsable de la conformité réglementaire de la plateforme.
Rapporte au Conseil d'administration.

**Motivations :** Zéro risque réglementaire. Audit trail complet.
Traçabilité de chaque décision de conformité.

**Besoins produit :**
- Accès à l'audit trail complet (qui a fait quoi, quand, pourquoi).
- Tableau de bord des alertes AML et sanctions.
- Gestion des cas manuels (escalade, gel de compte).
- Rapports réglementaires prêts à soumettre (FINMA, AMF).
- Export des journaux d'audit pour les inspections.

---

### 3.6 Gestionnaire de portefeuille — Sophie, 47 ans (CGP)

**Profil :** Conseillère en gestion de patrimoine indépendante.
Gère 120 clients, AUM ~40 M€. Cherche des supports alternatifs ESG.

**Motivations :** Proposer un produit différenciant à ses clients.
Accéder aux positions de ses clients mandants. Facturer du conseil.

**Besoins produit :**
- Espace "conseiller" avec vue multi-clients.
- Possibilité d'initier des souscriptions pour ses clients.
- Rapports consolidés par client.
- Accès aux documents réglementaires (DICI, reporting annuel).

---

### 3.7 Opérateur KYC — Mehdi, 28 ans

**Profil :** Analyste KYC back-office. Traite les dossiers de vérification
en escalade (cas complexes, PPE, structures opaques).

**Motivations :** Workflows clairs, dossiers complets, décisions traçables.

**Besoins produit (Odoo back-office) :**
- File de traitement des dossiers KYC en attente.
- Accès aux documents uploadés (pièce d'identité, justificatifs).
- Formulaire de décision avec motif documenté.
- Historique de toutes les actions sur un dossier.
- Escalade vers Compliance Officer en 1 clic.

---

### 3.8 Opérateur finance — Claire, 35 ans

**Profil :** Responsable finance & trésorerie. Gère les flux entrants/sortants,
la réconciliation bancaire, le reporting fiscal.

**Motivations :** Réconciliation automatisée. Reporting fiscal prêt.
Visibilité sur la trésorerie en temps réel.

**Besoins produit (Odoo back-office) :**
- Tableau de bord des flux fiat (Stripe) et stablecoins (Bridge).
- Réconciliation automatique paiement ↔ souscription ↔ distribution.
- Export comptable (FEC pour la France, standard CH).
- Reporting des distributions avec détail par investisseur.
- Alertes sur les anomalies de réconciliation.

---

## 4. Juridictions & Régulation

### 4.1 Cadre réglementaire EU — Règlement MiCA

Le Règlement MiCA (Markets in Crypto-Assets, UE 2023/1114) s'applique aux
Asset-Referenced Tokens (ART) et aux e-money tokens.
Les security tokens (représentant des droits sur des actifs réels) restent
sous MiFID II, mais MiCA impose des obligations spécifiques aux prestataires.

| Obligation MiCA | Impact SolarCells |
|----------------|------------------|
| Enregistrement CASP | Prestataire de services sur actifs numériques agréé |
| White Paper token | Document d'information obligatoire par actif tokenisé |
| Ségrégation des actifs clients | Custody ségrégée chez prestataire agréé |
| Obligation de publication | Transparence sur les prix et la liquidité |
| Prévention des abus de marché | Surveillance des transactions secondaires |

### 4.2 Cadre réglementaire CH — FINMA / Loi DLT

La Suisse dispose depuis 2021 du cadre **Loi DLT** (Loi fédérale sur
l'adaptation du droit fédéral aux développements de la technologie DLT).
Elle introduit les **droits-valeurs inscrits** (registerwertrechte) :
titres émis sur registre DLT, ayant valeur légale équivalente aux titres papier.

| Obligation FINMA | Impact SolarCells |
|----------------|------------------|
| Loi sur le blanchiment (LBA) | KYC/AML obligatoire, affiliation à un OAR |
| Loi DLT (droits-valeurs inscrits) | Base légale pour la tokenisation des parts |
| Surveillance prudentielle | Si activité de banque / gestion de fortune |
| Ordonnance FINMA OBA | Obligations de diligence renforcées |

### 4.3 KYC obligatoire — Niveaux

| Niveau | Seuil | Vérifications |
|--------|-------|---------------|
| KYC L1 — Basique | < 5 000 € / an | Email, téléphone, OTP |
| KYC L2 — Standard | 5 000 – 50 000 € / an | CNI/Passeport, selfie liveness, domicile |
| KYC L3 — Renforcé | > 50 000 € / an ou profil à risque | L2 + origine des fonds + entretien |
| KYC L4 — Institutionnel | Personne morale | Statuts, K-bis/extrait RC, UBO (≥ 25 %) |

### 4.4 AML & Screening sanctions

- **Screening initial** à l'inscription : OFAC, listes EU, ONU, FATF.
- **Screening continu** : trimestriel + événement déclencheur (transaction > seuil).
- **Monitoring transactionnel** : détection de patterns suspects (structuring,
  layering, transactions atypiques par rapport au profil déclaré).
- **Déclaration STR** (Suspicious Transaction Report) : processus documenté
  dans Odoo, escalade vers Compliance Officer.

### 4.5 Whitelist & Restrictions géographiques

| Restriction | Périmètre |
|-------------|-----------|
| Whitelist KYC | Seuls les investisseurs KYC validés peuvent opérer |
| Whitelist transfert | Seules les paires d'adresses autorisées peuvent s'échanger des tokens |
| Blacklist pays | Liste des pays exclus (Iran, Corée du Nord, Russie, Cuba…) |
| Restrictions géographiques secondaires | Certains actifs réservés aux résidents CH ou EU |

### 4.6 Conservation documentaire

| Type de document | Durée de conservation | Support |
|-----------------|----------------------|---------|
| Documents KYC | 5 ans post-relation | MinIO chiffré |
| Journaux d'audit | 10 ans | PostgreSQL + archivage cold |
| Contrats d'investissement | Durée de l'actif + 10 ans | MinIO chiffré |
| Rapports réglementaires | 5 ans | MinIO + backup |
| Journaux blockchain | Permanent (immuable) | On-chain |

### 4.7 Auditabilité réglementaire

Chaque action financière génère un **domain event** immuable (Redis Streams)
et une écriture on-chain. Les régulateurs peuvent demander l'export
de l'intégralité des événements d'un investisseur, d'un actif, ou d'une période.

---

## 5. Modèle économique

### 5.1 Flux de revenus SolarCells

| Source | Base | Taux indicatif | Fréquence |
|--------|------|---------------|-----------|
| Frais d'onboarding | Par investisseur | 0 – 50 € | À l'inscription |
| Frais de souscription | Sur montant investi | 1,5 % | À chaque investissement |
| Frais de gestion annuels | Sur AUM (encours géré) | 0,8 % / an | Mensuel proratisé |
| Commission de performance | Sur surperformance vs hurdle | 10 % au-delà du seuil | Annuel |
| Frais marketplace secondaire | Sur montant de cession | 0,5 % (vendeur) | Par transaction |
| Frais de conversion fiat/stablecoin | Sur montant converti | 0,3 % | Par flux |
| Frais de custody | Sur AUC (assets under custody) | 0,2 % / an | Mensuel |
| Frais administratifs | Par document émis | 5 – 25 € | À la demande |
| Commissions opérateur solaire | Sur capital levé par actif | 2,0 % | À la clôture |
| Frais de sortie anticipée | Sur montant retiré avant maturité | 0,5 – 1,0 % | Par événement |

### 5.2 Modèle de revenus d'un actif type

```
Parc solaire — 2 MWc — PPA 15 ans — Production : 2 600 MWh/an
Prix PPA : 65 €/MWh

Revenu brut annuel           = 169 000 €
Charges d'exploitation       =  42 000 € (maintenance, assurance, gestion locale)
                               ─────────
Revenu net de l'actif        = 127 000 €

Frais de gestion SolarCells  =   8 000 € (0,8 % × 1 000 000 € AUM)
                               ─────────
Revenu distribuable          = 119 000 € → 11,9 % brut sur 1 000 000 € levés
```

### 5.3 Seuils de rentabilité

| Métrique | Seuil breakeven | Cible Y3 |
|----------|----------------|----------|
| AUM total | 5 M€ | 50 M€ |
| Nombre d'actifs | 3 | 20 |
| Investisseurs actifs | 200 | 2 000 |
| Transactions secondaires / mois | 20 | 500 |

---

## 6. Architecture générale

### 6.1 Vue de haut niveau

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         INVESTISSEUR / OPÉRATEUR                             │
│                    React + TypeScript + Vite + Tailwind                       │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │ HTTPS / REST JSON
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY — Node.js Express                        │
│  Auth · KYC Guard · Rate Limit · Validation Zod · Routing · Transformation   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                        DOMAIN SERVICES                               │    │
│  │  Auth · User · Compliance · Wallet Orchestrator · Payment · Portfolio│    │
│  │  Marketplace · Yield · Notification · Audit · Reporting              │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Odoo Adapter │  │Stripe Adapter│  │Bridge Adapter│  │Tempo Adapter │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │ JSON-RPC        │ HTTPS           │ HTTPS           │ HTTPS / RPC
          ▼                 ▼                 ▼                 ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐
│   ODOO V18      │ │    STRIPE    │ │    BRIDGE    │ │  BLOCKCHAIN TEMPO/EVM │
│  (vérité métier)│ │ (fiat layer) │ │(stablecoin)  │ │  (exécution + audit)  │
│                 │ └──────────────┘ └──────────────┘ └───────────────────────┘
│  PostgreSQL     │
└─────────────────┘
          ▲
          │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE TRANSVERSE                            │
│   Redis Streams (events) · MinIO (documents) · Projections · Audit Trail    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Responsabilités par couche

| Couche | Rôle | Ce qu'elle ne fait pas |
|--------|------|----------------------|
| **Frontend React** | Afficher, collecter, valider côté client | Logique métier, appels Odoo directs |
| **API Gateway Node** | Orchestrer, sécuriser, transformer | Stocker des données métier, contourner Odoo |
| **Odoo V18** | Détenir toute la vérité métier | Servir le frontend, parler à la blockchain |
| **Blockchain Tempo** | Exécuter, enregistrer, auditer les transactions | Connaître les investisseurs, gérer le fiat |
| **Stripe** | Collecte et distribution fiat | Gérer les tokens, connaître la blockchain |
| **Bridge** | Conversion fiat ↔ stablecoin | Logique métier, conformité |
| **Redis Streams** | Propager les domain events | Persister durablement la vérité métier |
| **MinIO** | Stocker les documents et fichiers | Contenir des données structurées métier |

### 6.3 Principe d'architecture événementielle

Chaque action métier génère un **domain event** publié dans Redis Streams.
Les services consomment ces événements de façon indépendante et idempotente.
Odoo reste la source de vérité : les événements sont des notifications, pas des oracles.

---

## 7. Frontend & UX

### 7.1 Principes de design

| Principe | Application |
|----------|-------------|
| **Fintech premium** | Design system sobre, typo sérieuse, couleurs institutionnelles |
| **Mobile first** | Breakpoints : 375px → 768px → 1280px. Composants tactiles en priorité |
| **Blockchain invisible** | Zéro mention de wallet, token, blockchain, gas dans l'UI utilisateur |
| **Progressive disclosure** | Onboarding par étapes. Fonctionnalités débloquées après validation |
| **État transparent** | L'investisseur sait toujours où en est son dossier (KYC, paiement, distribution) |
| **Zéro jargon** | Vocabulaire du glossaire (`docs/GLOSSARY.md`) obligatoire |

### 7.2 Structure des écrans

```
Public (non authentifié)
├── Landing page           — valeur, actifs, rendements, social proof
├── Catalogue actifs       — lecture seule, sans prix réel
└── Connexion / Inscription

Authenticated — KYC pending
├── Tableau de bord (lecture) — statut KYC, prochaines étapes
├── Profil KYC             — upload documents, progression
└── Catalogue actifs (preview)

Authenticated — KYC validé
├── Tableau de bord        — portefeuille, revenus, prochains versements
├── Catalogue actifs       — prix, disponibilité, souscription
├── Détail actif           — fiche, documents, performance
├── Souscription           — tunnel de paiement
├── Mon portefeuille       — détentions, valorisation, historique
├── Distributions          — historique des versements, projections
├── Marketplace            — offres actives, vendre/acheter
├── Profil & documents     — KYC, fiscalité, communications
└── Paramètres             — sécurité, notifications, délégation

Back-office (Odoo natif)
├── Investisseurs          — CRM, KYC, compliance
├── Actifs solaires        — référentiel, configuration, reporting
├── Paiements              — flux Stripe et Bridge, réconciliation
├── Distributions          — calcul et émission des rendements
├── Marketplace            — supervision des cessions
├── Audit                  — logs, alertes, conformité
└── Finance                — comptabilité, trésorerie
```

### 7.3 Composants UI clés

- **AssetCard** : carte d'actif avec rendement, localisation, disponibilité.
- **PortfolioWidget** : synthèse valorisation + revenus projetés.
- **KycStatusBanner** : état du KYC avec call-to-action contextuel.
- **YieldChart** : visualisation des distributions historiques et projetées.
- **TransactionHistory** : table paginée des mouvements.
- **MarketplaceOrder** : formulaire de mise en vente avec estimation de prix.
- **OnboardingSteps** : progression visuelle du tunnel d'activation.

---

## 8. Parcours utilisateur

### 8.1 Vue séquentielle complète

```
DÉCOUVERTE
    ├── Landing page publique
    └── Catalogue actifs en lecture seule (rendements cachés)
            │
            ▼
INSCRIPTION (2 min)
    ├── Email + mot de passe + téléphone
    ├── OTP SMS
    └── Acceptation CGU / politique de confidentialité
            │
            ▼
KYC — NIVEAU L2 STANDARD (5–10 min, asynchrone)
    ├── Informations personnelles (nom, prénom, date de naissance, nationalité)
    ├── Questionnaire MiFID II (profil de risque, expérience, horizon)
    ├── Upload pièce d'identité (CNI, passeport)
    ├── Selfie liveness check (prestataire KYC externe)
    ├── Upload justificatif de domicile
    ├── Traitement automatique → résultat en < 5 minutes pour 80 % des cas
    └── Notification : validé / en cours / rejeté
            │ KYC validé (Odoo : x_kyc_status = 'validated')
            ▼
CRÉATION DU COMPTE DE DÉTENTION (automatique, invisible)
    ├── Wallet custodial créé par le backend via Custody Adapter
    ├── Adresse blockchain générée via solar.wallet, référencée depuis res.partner (x_primary_wallet_id)
    ├── Adresse whitelistée sur le smart contract de whitelist
    └── L'investisseur ne voit rien de cela
            │
            ▼
DÉPÔT FIAT (3 min)
    ├── Virement SEPA vers IBAN SolarCells (Stripe)
    │   ou paiement carte Visa/Mastercard (Stripe)
    ├── Détection automatique du virement et association au compte
    └── Notification : "Votre dépôt de X € est confirmé"
            │
            ▼
CONVERSION STABLECOIN (automatique, invisible)
    ├── Fiat reçu sur compte Stripe → Bridge conversion
    ├── EURC ou USDC crédités sur le vault custodial de l'investisseur
    └── L'investisseur voit uniquement son solde disponible en €
            │
            ▼
EXPLORATION & SÉLECTION D'ACTIF
    ├── Catalogue des actifs disponibles (localisation, puissance, rendement cible, durée)
    ├── Fiche actif détaillée (documents techniques, PPA, performances passées)
    └── Simulateur de rendement (montant → projection trimestrielle)
            │
            ▼
SOUSCRIPTION (< 5 min)
    ├── Choix de l'actif + saisie du montant
    ├── Récapitulatif : frais, rendement estimé, part attendue
    ├── Signature électronique du bulletin de souscription
    ├── Confirmation du paiement (depuis solde disponible)
    ├── Validation backend : KYC ✓, whitelist ✓, solde ✓, limites ✓
    └── Émission : smart contract transfère les parts vers le vault investisseur
            │
            ▼
RÉCEPTION DES PARTS (automatique)
    ├── Parts créditées on-chain sur le wallet custodial
    ├── Odoo mis à jour : enregistrement solar.holding
    ├── Notification : "Vous détenez X parts de [Actif Solaire Lyon 01]"
    └── Tableau de bord mis à jour
            │
            ▼
VIE DU PORTEFEUILLE (en continu)
    ├── Tableau de bord : valorisation temps réel, revenu projeté
    ├── Alertes : distributions imminentes, nouvelles offres
    └── Accès aux documents (bulletins, reporting annuel)
            │ Chaque trimestre
            ▼
DISTRIBUTION DE REVENU
    ├── Calcul prorata (Odoo) → émission on-chain (smart contract yield)
    ├── Stablecoins distribués sur vault investisseur → Bridge conversion → fiat
    ├── Virement SEPA sur compte bancaire lié
    │   ou maintien en solde disponible pour réinvestissement
    └── Notification + document de distribution
            │ Optionnel
            ▼
MARKETPLACE SECONDAIRE (cession)
    ├── Initiation de la vente (quantité, prix demandé)
    ├── Validation whitelist acheteur
    ├── Matching avec un acheteur intéressé
    ├── Exécution : transfert on-chain + settlement stablecoin
    └── Confirmation + document de cession
            │ Optionnel
            ▼
RETRAIT FIAT
    ├── Demande de retrait depuis le solde disponible
    ├── Bridge conversion stablecoin → fiat
    ├── Virement SEPA sur IBAN déclaré (vérifié KYC)
    └── Notification + document
```

---

## 9. Onboarding & Compliance

### 9.1 Onboarding progressif

L'onboarding est structuré en paliers fonctionnels.
L'investisseur accède progressivement aux fonctionnalités à mesure
que sa conformité est validée.

| Étape | Fonctionnalités débloquées |
|-------|--------------------------|
| Email confirmé | Lecture catalogue (anonymisé) |
| Profil renseigné | Simulation de rendement |
| KYC L2 validé | Dépôt, souscription, portefeuille |
| Compte bancaire lié | Retrait fiat, réception de distributions |
| KYC L3 validé | Souscriptions > 50 000 €, marketplace illimité |

### 9.2 Vérification d'identité

Prestataire KYC externe (Onfido, Sumsub, Veriff — abstrait via KYC Adapter).
Flux :
1. Investisseur uploade ses documents via le frontend.
2. Backend transmet au prestataire KYC via API.
3. Webhook de résultat → Backend → Odoo (`x_kyc_status` mis à jour).
4. Domain event `kyc.status.updated` publié dans Redis Streams.
5. Tous les services abonnés réagissent : Wallet Orchestrator crée le vault,
   Notification Service envoie l'email, Audit Service journalise.

### 9.3 AML & Monitoring

- **Scoring initial** : à l'inscription, chaque investisseur reçoit un score AML
  calculé par le prestataire (pays, PEP, sanctions, médias adverses).
- **Monitoring continu** : réévaluation trimestrielle et à chaque transaction > seuil.
- **Règles de détection** : seuils paramétrés dans Odoo (montant, fréquence, pattern).
- **Escalade** : alerte → Opérateur KYC → Compliance Officer → gel du compte si nécessaire.
- **STR** : rapport de transaction suspecte documenté, exportable vers la cellule de renseignement.

### 9.4 Gestion documentaire

Tous les documents KYC sont stockés dans MinIO (chiffré AES-256),
avec référence dans Odoo (chemin, hash SHA-256, date, version).
Audit trail de chaque accès aux documents.

### 9.5 Audit Trail conformité

Chaque décision de conformité (validation, rejet, escalade, gel)
est enregistrée dans Odoo avec : horodatage ISO, opérateur, motif,
pièce jointe éventuelle. Export possible pour inspection réglementaire.

---

## 10. Wallet & Custody Strategy

### 10.1 MVP — Wallets custodial

Au MVP, tous les wallets sont custodial :
SolarCells gère les clés privées via un prestataire de custody agréé.
L'investisseur ne signe jamais de transaction blockchain directement.

**Ce que voit l'investisseur :** un "compte de détention" avec un solde en euros.
**Ce qui existe en coulisses :** une adresse blockchain dans un vault MPC chez le custodian.

### 10.2 Architecture custody

```
Investisseur (frontend)
        │
        ▼
Wallet Orchestrator (backend service)
        │
        ▼
Custody Adapter (interface abstraite)
        │
        ├── Fireblocks Adapter (défaut MVP)
        ├── Copper Adapter
        └── BitGo Adapter
```

Le Custody Adapter expose une interface stable :
`createVault(userId)`, `sign(tx)`, `getAddress(vaultId)`, `getBalance(vaultId)`.
Le remplacement du custodian ne nécessite que le remplacement de l'adapter.

### 10.3 Séparation custody / business logic

| Responsabilité | Couche |
|---------------|--------|
| Clé privée, signature | Custodian (Fireblocks) |
| Adresse wallet, référence vault | Odoo (`solar.wallet` lié via `x_primary_wallet_id`) |
| Solde et positions | Blockchain (source primaire) + Odoo (projection) |
| Whitelist des adresses | Smart contract on-chain |
| Décision d'autorisation | Backend (KYC + whitelist Odoo) |

### 10.4 Surveillance des wallets

- Chaque transaction on-chain impliquant un wallet SolarCells génère
  un événement capturé par le Tempo Indexer.
- L'Audit Service vérifie la cohérence : transaction on-chain = opération Odoo.
- Alertes automatiques sur toute transaction non initiée par le backend.

### 10.5 Whitelist on-chain

Chaque wallet custodial est inscrit dans le **smart contract whitelist**
après validation KYC (action déclenchée automatiquement via domain event).
Un transfert de tokens entre deux adresses non-whitelistées est rejeté
par le smart contract (niveau protocole, pas uniquement applicatif).

### 10.6 Stratégie MPC future (post-MVP)

En V2, les investisseurs avancés pourront opter pour un wallet MPC
(Multi-Party Computation) où SolarCells et l'investisseur co-signent
les transactions, sans que SolarCells détienne seul la clé privée.
En V3, support des wallets self-custodial (ERC-4337, account abstraction).

---

## 11. Blockchain & Tokenization

### 11.1 Réseau Tempo / EVM

**Tempo** est un réseau EVM-compatible positionné pour les cas d'usage
financiers institutionnels : finalité rapide, faibles coûts de transaction,
compatibilité ERC-20/ERC-3643, outillage professionnel.

Critères de sélection du réseau :
- Compatibilité EVM (réutilisation des outils Ethereum).
- Finalité < 5 secondes (expérience utilisateur fluide).
- Coût de transaction < 0,01 € (scalabilité économique).
- Cadre réglementaire compatible MiCA / FINMA.
- Prestataires de custody agréés disponibles sur ce réseau.
- Réseau de testnet stable pour les environnements de dev/staging.

### 11.2 Smart contracts — Architecture minimaliste

Philosophie : **les smart contracts font le moins possible**.
La logique métier reste dans Odoo. Les smart contracts gèrent
l'exécution financière et l'audit immuable.

| Contrat | Rôle | Fonctions clés |
|---------|------|----------------|
| `SolarToken` (ERC-20) | Représente les parts d'un actif solaire | `mint`, `burn`, `transfer` (restreint) |
| `Whitelist` | Registre des adresses autorisées | `add`, `remove`, `isWhitelisted` |
| `YieldDistributor` | Distribution automatique du rendement | `distributeYield`, `claim` |
| `TransferRestriction` | Applique les règles de transfert | Hook sur `transfer` de `SolarToken` |
| `EmergencyPause` | Mécanisme d'arrêt d'urgence | `pause`, `unpause` |

### 11.3 Standard token

SolarToken suit le standard **ERC-3643 (T-REX)** :
standard de security token avec vérification d'identité intégrée.
Le transfert est impossible si l'adresse destination n'est pas
dans le registre d'identité on-chain (lié à la whitelist KYC).

### 11.4 Event indexing

Un **indexer on-chain** (The Graph ou indexer custom) capte
les événements émis par les smart contracts (`Transfer`, `YieldDistributed`,
`WhitelistUpdated`, `Paused`) et les publie dans Redis Streams
pour consommation par les services backend (Portfolio Projection, Audit Service).

### 11.5 Auditabilité des transactions

Chaque transaction on-chain est :
- Référencée dans Odoo (tx hash stocké sur chaque enregistrement financier).
- Indexée par l'indexer et projectable.
- Vérifiable par n'importe quel tiers via l'explorateur de blocs Tempo.
- Immuable : aucune modification possible a posteriori.

### 11.6 Mécanisme de pause d'urgence

Le contrat `EmergencyPause` permet à l'administrateur technique
de suspendre toutes les opérations en cas d'incident de sécurité.
Cette action est elle-même journalisée on-chain et dans l'Audit Service.
La procédure de déclenchement est documentée dans le runbook opérationnel.

---

## 12. Stripe / Bridge / Tempo Strategy

### 12.1 Vue d'ensemble des flux financiers

```
INVESTISSEUR (€ fiat)
    │
    │ Carte ou virement SEPA
    ▼
STRIPE — Collecte fiat
    │ Webhook confirmation paiement
    ▼
BRIDGE — Conversion fiat → stablecoin
    │ EUR → EURC (ou USDC)
    ▼
VAULT CUSTODIAL INVESTISSEUR (stablecoin)
    │ Smart contract : achat de tokens
    ▼
SOLARTOKENS crédités (on-chain)
    │
    │         [à chaque distribution]
    ▼
YIELD DISTRIBUTOR — Distribution stablecoin (on-chain)
    │ Smart contract → vault investisseur
    ▼
BRIDGE — Conversion stablecoin → fiat
    │
    ▼
STRIPE PAYOUTS — Virement SEPA vers IBAN investisseur
```

### 12.2 Stripe — Couche paiement fiat

| Fonctionnalité Stripe | Usage SolarCells |
|----------------------|-----------------|
| Payment Intents | Souscriptions par carte |
| SEPA Direct Debit | Souscriptions récurrentes (réinvestissement) |
| Stripe Payouts | Distribution de revenus vers IBAN |
| Stripe Billing | Prélèvement des frais de gestion annuels |
| Webhook Events | Notification de confirmation de paiement → domain event |
| Stripe Radar | Prévention de la fraude fiat |

L'expérience utilisateur est entièrement SolarCells (Stripe Elements,
pas de redirection, pas de logo Stripe proéminent).

### 12.3 Bridge — Couche stablecoin

Bridge (infrastructure acquise par Stripe) opère la conversion
fiat ↔ stablecoin de façon transparente pour l'investisseur.

| Flux Bridge | Direction | Stablecoin |
|-------------|-----------|-----------|
| Souscription | EUR → EURC | EURC (Circle) |
| Distribution | EURC → EUR | EURC → fiat |
| Alternative | EUR → USDC | USDC (marché CH) |

Bridge expose une API REST. Le **Bridge Adapter** dans le backend
abstrait cette API et permettra de substituer un autre prestataire
de stablecoin (ex. Société Générale - EURCV, Mt Pelerin) sans refonte.

### 12.4 Tempo — Couche blockchain programmable

Tempo opère comme la **couche d'exécution et d'audit** :
- Émission et transfert des SolarTokens.
- Distribution automatique des rendements.
- Whitelist on-chain des adresses autorisées.
- Journal immuable de toutes les transactions.

### 12.5 Réconciliation & Treasury Management

| Flux | Réconciliation |
|------|---------------|
| Stripe payment → souscription Odoo | Stripe webhook → Payment Service → Odoo |
| Bridge conversion → vault stablecoin | Bridge webhook → Wallet Orchestrator |
| Distribution on-chain → revenue line Odoo | Indexer événement → Yield Service → Odoo |
| Retrait stablecoin → fiat → Stripe Payout | Bridge + Stripe webhooks → Finance Operator |

La réconciliation est automatisée. Les écarts déclenchent une alerte
pour l'Opérateur finance (Isabelle, persona 3.8).

### 12.6 Architecture provider-agnostic

Les trois providers (Stripe, Bridge, Tempo) sont accessibles uniquement
via leurs adapters respectifs. Un remplacement de provider = un remplacement d'adapter.
Le domaine métier ne connaît pas les providers.

---

## 13. Marketplace secondaire

### 13.1 Principes

La marketplace secondaire permet aux investisseurs whitelistés
d'échanger des parts entre eux. Ce n'est pas un exchange ouvert :
c'est un **carnet d'ordres permissionné**, où chaque participant
est identifié et chaque transaction est auditée.

### 13.2 Règles fondamentales

1. **Acheteur et vendeur doivent être KYC validés** (statut `validated` dans Odoo).
2. **Toutes les adresses concernées doivent être whitelistées** on-chain.
3. **Les restrictions géographiques sont appliquées** (ex. un actif réservé EU
   ne peut être cédé à un investisseur CH).
4. **Le prix est libre**, avec affichage d'une valeur indicative calculée
   par le Portfolio Projection Service.
5. **Frais de cession : 0,5 %** à la charge du vendeur, prélevés automatiquement.

### 13.3 Flux d'une cession

```
VENDEUR
    │ Initiation : actif, quantité, prix demandé, durée de l'offre
    ▼
MARKETPLACE SERVICE
    │ Validation : KYC ✓, quantité disponible ✓, actif cessible ✓
    ├── Enregistrement de l'offre dans Odoo (solar.market.order)
    └── Publication de l'offre sur la marketplace frontend

ACHETEUR
    │ Acceptation de l'offre
    ▼
MARKETPLACE SERVICE
    │ Validation : KYC acheteur ✓, solvabilité ✓, whitelist paire ✓, restrictions géo ✓
    ├── Lock du solde acheteur (stablecoin)
    └── Déclenchement de la transaction
            │
            ▼
EXÉCUTION (atomic)
    ├── Smart contract : transfert des SolarTokens (vendeur → acheteur)
    ├── Settlement stablecoin : vault acheteur → vault vendeur (net frais)
    ├── Mise à jour Odoo : solar.holding vendeur (−) / acheteur (+)
    └── Domain event : marketplace.trade.executed
            │
            ▼
POST-TRADE
    ├── Notification vendeur (confirmation + document de cession)
    ├── Notification acheteur (confirmation + mise à jour portefeuille)
    ├── Audit Service : journalisation complète
    └── Finance : réconciliation des frais
```

### 13.4 Conformité secondaire

La réglementation impose un suivi renforcé des transactions secondaires :
- Chaque cession est enregistrée dans Odoo avec tx hash on-chain.
- Le Compliance Officer peut consulter l'historique de toute paire acheteur/vendeur.
- Les transactions > seuil AML déclenchent une revue automatique.
- La marketplace peut être suspendue globalement (EmergencyPause) ou par actif.

---

## 14. Yield & Revenue Distribution

### 14.1 Source des revenus solaires

```
Production solaire (kWh mesuré par compteurs IoT)
    │
    ▼
Contrat PPA : kWh × prix PPA (€/kWh fixé)
    │ ou
    ▼
Marché spot : kWh × prix spot (EPEX, OMIE…)
    │
    ▼
Revenu brut mensuel de l'actif
    │
    ├── Charges d'exploitation (maintenance, assurance, monitoring)
    │
    └── Revenu net distribuable de la période
```

### 14.2 Calcul de la distribution

```
Pour chaque investisseur i détenant N_i parts sur un actif :

Revenu_i = (N_i / N_total) × Revenu_net_distribuable

Revenu_net_i = Revenu_i
               − Frais_gestion_proratisés
               − Retenue_à_la_source (si applicable selon juridiction)
```

Odoo calcule `Revenu_net_i` pour chaque ligne `solar.yield.line`.
Le Yield Service orchestre l'émission on-chain via `YieldDistributor`.

### 14.3 Fréquences de distribution

| Type d'actif | Fréquence | Mécanisme |
|---|---|---|
| PPA long terme sécurisé | Trimestrielle | Batch automatique le 1er du trimestre |
| Actif marché spot | Mensuelle | Batch automatique le 1er du mois |
| Actif en construction | Suspendue | Jusqu'à mise en service attestée |
| Actif en défaut technique | Suspendue | Jusqu'à résolution + communication |

### 14.4 Réinvestissement automatique

Option activable par l'investisseur :
les revenus distribués sont automatiquement réinvestis dans le même actif
ou dans un actif recommandé par le Portfolio Projection Service (règle paramétrable).

### 14.5 Reporting investisseur

À chaque distribution, génération automatique d'un document PDF :
- Période, actif, production en kWh, revenu brut, frais, revenu net.
- Solde cumulé depuis le début de l'investissement.
- Projection des prochaines distributions.
- Attestation fiscale annuelle (compatible déclaration IR France / Suisse).

---

## 15. Architecture événementielle

### 15.1 Principes

L'architecture est **event-driven** : chaque action métier génère un domain event
persisté dans Redis Streams. Les services sont des producteurs ou des consommateurs
de ces événements, découplés par le bus d'événements.

**Avantages :**
- Découplage total entre services.
- Replay possible pour reconstruire un état ou corriger une erreur.
- Auditabilité naturelle (chaque événement est horodaté et immuable).
- Compatible avec des agents IA futurs (consommateurs du stream).

### 15.2 Catalogue des domain events

| Événement | Producteur | Consommateurs |
|-----------|-----------|---------------|
| `user.registered` | Auth Service | Notification, Audit, Compliance |
| `kyc.submitted` | Compliance Service | KYC Operator (Odoo), Audit |
| `kyc.status.updated` | Compliance Service | Wallet Orchestrator, Notification, Audit |
| `wallet.created` | Wallet Orchestrator | Whitelist Service, Audit |
| `payment.received` | Payment Service | Portfolio Projection, Audit, Notification |
| `payment.converted` | Payment Service | Portfolio Projection, Audit |
| `investment.subscribed` | Portfolio Service | Yield Service, Audit, Notification |
| `token.minted` | Tempo Indexer | Portfolio Projection, Audit |
| `token.transferred` | Tempo Indexer | Portfolio Projection, Audit |
| `yield.calculated` | Yield Service | YieldDistributor, Audit, Notification |
| `yield.distributed` | Tempo Indexer | Portfolio Projection, Audit, Reporting |
| `marketplace.offer.created` | Marketplace Service | Audit, Notification |
| `marketplace.trade.executed` | Marketplace Service | Portfolio Projection, Audit, Notification |
| `aml.alert.triggered` | Compliance Service | Compliance Officer (Odoo), Audit |
| `account.suspended` | Compliance Service | Wallet Orchestrator, Notification, Audit |

### 15.3 Infrastructure Redis Streams

- **Streams** : un stream par domaine (`user.*`, `kyc.*`, `payment.*`, `investment.*`, `yield.*`, `marketplace.*`, `audit.*`).
- **Consumer groups** : chaque service est un groupe de consommateurs indépendant.
- **Idempotency** : chaque événement a un `eventId` UUID. Les consumers vérifient
  l'idempotency avant traitement (table `processed_events` ou clé Redis).
- **Retry policy** : 3 tentatives avec backoff exponentiel (1s, 5s, 30s).
- **Dead Letter Queue** : après 3 échecs, l'événement est déplacé dans un stream `DLQ.*`
  et déclenche une alerte opérationnelle.
- **Replay** : le rejeu d'un stream depuis un timestamp donné permet de reconstruire
  l'état d'un service ou de corriger une projection corrompue.

### 15.4 Garanties

| Garantie | Mécanisme |
|----------|-----------|
| **At-least-once delivery** | Consumer acknowledgement explicite |
| **Idempotency** | `eventId` unique, vérification avant traitement |
| **Ordering** | Ordering garanti par stream (FIFO) |
| **Durability** | Redis persistence (AOF + RDB), backup quotidien |
| **Auditabilité** | Chaque événement archivé dans Audit Service (PostgreSQL) |

---

## 16. Services backend

### 16.1 Carte des services

```
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Express Router)                  │
└─────────┬───────────────┬────────────────┬──────────────────────┘
          │               │                │
   ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
   │ Auth Service│  │User Service│  │Compliance  │
   └─────────────┘  └────────────┘  │Service     │
                                    └────────────┘
          │               │                │
   ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
   │  Wallet     │  │  Payment   │  │  Portfolio │
   │Orchestrator │  │  Service   │  │ Projection │
   └─────────────┘  └────────────┘  └────────────┘
          │               │                │
   ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
   │ Marketplace │  │   Yield    │  │Notification│
   │  Service   │  │  Service   │  │  Service   │
   └─────────────┘  └────────────┘  └────────────┘
          │               │                │
   ┌──────▼──────┐  ┌─────▼──────┐
   │   Audit     │  │ Reporting  │
   │  Service   │  │  Service   │
   └─────────────┘  └────────────┘
```

### 16.2 Descriptions des services

**Auth Service**
Gestion des sessions frontend (inscription, connexion, déconnexion, refresh token,
OTP SMS, 2FA). Indépendant de la session technique Odoo.
Produit : `user.registered`, `user.logged_in`, `user.session_expired`.

**User Service**
Profil utilisateur, préférences, compte bancaire lié, délégation CGP.
CRUD via Odoo Adapter (`res.partner`).
Produit : `user.profile.updated`, `user.bank_account.linked`.

**Compliance Service**
Orchestration du KYC (soumission au prestataire, réception du webhook de résultat,
mise à jour Odoo). Monitoring AML, screening sanctions, escalade.
Produit : `kyc.submitted`, `kyc.status.updated`, `aml.alert.triggered`.

**Wallet Orchestrator**
Création et gestion des vaults custodial (via Custody Adapter).
Déclenchement du whitelisting on-chain après validation KYC.
Produit : `wallet.created`, `wallet.whitelisted`.

**Payment Service**
Orchestration des flux fiat (Stripe Adapter) et stablecoin (Bridge Adapter).
Réconciliation des paiements avec les souscriptions Odoo.
Produit : `payment.received`, `payment.converted`, `payout.initiated`.

**Portfolio Projection Service**
Projection temps réel du portefeuille investisseur à partir des événements
blockchain (Tempo Indexer) et Odoo. Vue dénormalisée pour le frontend.
Consomme : `token.minted`, `token.transferred`, `yield.distributed`.

**Marketplace Service**
Gestion du carnet d'ordres permissionné. Validation des offres et des transactions.
Orchestration de l'exécution atomique (smart contract + settlement stablecoin).
Produit : `marketplace.offer.created`, `marketplace.trade.executed`.

**Yield Service**
Calcul des distributions (via Odoo Adapter, modèle `solar.yield.distribution`).
Déclenchement de l'émission on-chain via Tempo Adapter.
Produit : `yield.calculated`, `yield.distributed`.

**Notification Service**
Email, SMS, push notification. Abonné à tous les événements déclenchant
une communication utilisateur. Templates gérés dans Odoo (module `mail`).
Consomme : tout événement avec flag `notify: true`.

**Audit Service**
Persiste chaque domain event dans une table PostgreSQL immuable (append-only).
Expose une API de consultation pour le Compliance Officer.
Source de vérité pour les exports réglementaires.

**Reporting Service**
Génération des documents PDF (bulletins de souscription, relevés de distribution,
attestations fiscales, reporting annuel). Stockage dans MinIO.
Déclenché par : `investment.subscribed`, `yield.distributed`, cron annuel.

---

## 17. Odoo Community V18

### 17.1 Rôle

Odoo V18 Community est la **source de vérité métier unique**.
Aucun service Node.js ne stocke de données métier de façon autonome.
Toutes les lectures et écritures métier transitent par le **client JSON-RPC**
encapsulé dans l'**Odoo Adapter**.

### 17.2 Modules custom SolarCells (alignés MDD v2.1)

| Module | Périmètre | Modèles clés |
|--------|-----------|-------------|
| `solar_audit` | Journal d'audit immuable (base de tous les autres) | `solar.audit.log` |
| `solar_core` | Extension investisseurs, groupes de sécurité | `res.partner` (ext.) + champs `x_kyc_case_id`, `x_wallet_ids` |
| `solar_kyc` | Cas KYC + documents + décisions | `solar.kyc.case`, `solar.kyc.document`, `solar.kyc.decision` |
| `solar_wallet` | Wallets custodial (modèle dédié) | `solar.wallet` |
| `solar_asset` | Référentiel actifs solaires | `solar.asset`, `solar.asset.document` |
| `solar_holding` | Détentions investisseurs | `solar.holding` |
| `solar_investment` | Ordres de souscription | `solar.investment.order` |
| `solar_payment` | Transactions de paiement (inbound + outbound unifiées) | `solar.payment.transaction` |
| `solar_market` | Marketplace secondaire | `solar.market.order`, `solar.market.trade` |
| `solar_yield` | Calcul et distribution revenus | `solar.yield.distribution`, `solar.yield.line` |
| `solar_compliance` | Alertes AML, screening sanctions | `solar.aml.alert`, `solar.sanction.check` |

**Total : 11 addons, 15 entités métier.** Voir `specs/mdd/00-overview.md` v2.1 pour le détail.

### 17.3 Principaux champs custom sur `res.partner` (alignés MDD v2.1)

| Champ | Type | Description |
|-------|------|-------------|
| `x_uuid` | Char | Identifiant externe stable (UUID) exposé via API |
| `x_is_investor` | Boolean | Vrai si ce partner est un investisseur (vs CGP, opérateur, etc.) |
| `x_investor_type` | Selection | `retail / qualified / institutional` |
| `x_kyc_case_id` | Many2one(`solar.kyc.case`) | Cas KYC associé (source de vérité du statut) |
| `x_kyc_status` | Selection (related) | Dénormalisé depuis le cas KYC pour rapidité |
| `x_kyc_level` | Selection (related) | `L1 / L2 / L3 / L4` |
| `x_wallet_ids` | One2many(`solar.wallet`) | Wallets associés à cet investisseur (≥ 0) |
| `x_primary_wallet_id` | Many2one(`solar.wallet`) | Wallet principal actif |
| `x_iban` | Char | IBAN validé pour retraits |
| `x_iban_validated_at` | Datetime | Date de validation IBAN |
| `x_date_of_birth` | Date | Personne physique |
| `x_nationality_id` | Many2one(`res.country`) | Nationalité |
| `x_cgp_id` | Many2one(`res.partner`) | CGP délégué |
| `x_account_state` | Selection | `pending / active / suspended / closed` |
| `x_terms_accepted_at` | Datetime | Date d'acceptation CGU |

### 17.4 Règles absolues

> **Odoo est interrogé uniquement via JSON-RPC.**
> L'accès direct à PostgreSQL depuis Node.js est interdit.
>
> **L'ORM Odoo est la seule façon de modifier les données.**
> Pas de SQL raw. Pas de migration manuelle.
>
> **Aucun ERP parallèle dans Node.js.**
> Pas de Prisma, pas de Sequelize, pas de SQLite.
> Node.js n'a pas de base de données métier.

---

## 18. Audit & Observability

### 18.1 Logs structurés

Tous les services produisent des logs JSON structurés (Pino recommandé) :

```json
{
  "timestamp": "2025-05-01T10:23:45.123Z",
  "level": "info",
  "service": "compliance-service",
  "traceId": "abc-123",
  "userId": "[HASHED]",
  "action": "kyc.status.updated",
  "result": "success",
  "durationMs": 245
}
```

Les champs sensibles (email, IBAN, montants) sont masqués ou hashés en production.

### 18.2 Audit trail

| Niveau | Stockage | Rétention |
|--------|---------|-----------|
| Domain events | Redis Streams | 30 jours actifs |
| Audit table (Odoo `solar.audit.log`) | PostgreSQL | 10 ans |
| Audit service (PostgreSQL dédié) | Append-only, immuable | 10 ans |
| Transactions on-chain | Blockchain | Permanent |

### 18.3 Monitoring & Métriques

Stack recommandée (à préciser en spec infrastructure) :
- **Metrics** : Prometheus + Grafana.
- **Logs** : Loki ou Datadog.
- **Tracing** : OpenTelemetry + Jaeger.
- **Alerting** : PagerDuty ou OpsGenie.

Métriques clés :
- Latence des appels JSON-RPC Odoo (p50, p95, p99).
- Volume de domain events par type / par heure.
- Taux d'erreur par service.
- Délai de traitement KYC (temps inscription → validation).
- Latence des transactions blockchain.

### 18.4 Supervision métier

| Indicateur | Alerte si |
|------------|-----------|
| KYC en attente > 48h | Notification Opérateur KYC |
| Paiement non réconcilié > 1h | Notification Opérateur finance |
| Transaction AML flaggée | Notification immédiate Compliance Officer |
| Distribution on-chain échouée | Alerte critique + intervention manuelle |
| Pause d'urgence activée | Alerte P0 toute l'équipe |

---

## 19. Providers & Adapters

### 19.1 Architecture provider-agnostic

Chaque fournisseur externe est accessible uniquement via son **Adapter**,
qui implémente une interface stable définie dans le domaine.
Le remplacement d'un fournisseur ne nécessite que le remplacement de l'adapter.

```
Domain Service
    │
    ▼
Interface (TypeScript)      ← définie dans le domaine
    │
    ▼
Adapter (implémentation)    ← couplé au provider
    │
    ▼
Provider externe (Stripe, Bridge, Fireblocks…)
```

### 19.2 Catalogue des adapters

**Stripe Adapter**
Interface : `IPaymentAdapter`
Méthodes : `createPaymentIntent`, `confirmPayment`, `createPayout`, `refund`, `handleWebhook`
Fournisseur actuel : Stripe
Alternative possible : Adyen, Checkout.com

**Bridge Adapter**
Interface : `IStablecoinAdapter`
Méthodes : `convertFiatToStablecoin`, `convertStablecoinToFiat`, `getConversionRate`, `getVaultBalance`
Fournisseur actuel : Bridge (Stripe)
Alternative possible : Mt Pelerin, Monerium, Société Générale EURCV

**Tempo Adapter**
Interface : `IBlockchainAdapter`
Méthodes : `mintTokens`, `transferTokens`, `burnTokens`, `distributeYield`, `getBalance`, `getTxStatus`
Fournisseur actuel : Tempo (EVM)
Alternative possible : Polygon, Avalanche, Base

**Odoo Adapter**
Interface : `IOdooAdapter`
Méthodes : `searchRead`, `create`, `write`, `unlink`, `callMethod`
Fournisseur actuel : Odoo V18 (JSON-RPC)
Non remplaçable par principe (source de vérité)

**KYC Provider Adapter**
Interface : `IKycAdapter`
Méthodes : `submitDocument`, `getLivenessUrl`, `getVerificationStatus`, `handleWebhook`
Fournisseur actuel : Onfido (ou Sumsub / Veriff)
Alternative possible : tout prestataire KYC exposant une API REST

**Custody Adapter**
Interface : `ICustodyAdapter`
Méthodes : `createVault`, `getAddress`, `getBalance`, `signTransaction`, `getTransactions`
Fournisseur actuel : Fireblocks
Alternative possible : Copper, BitGo, Ledger Enterprise

**Notification Adapter**
Interface : `INotificationAdapter`
Méthodes : `sendEmail`, `sendSms`, `sendPush`
Fournisseur actuel : Resend (email) + Vonage (SMS)
Alternative possible : Sendgrid, Twilio, Mailjet

**Storage Adapter**
Interface : `IStorageAdapter`
Méthodes : `upload`, `download`, `delete`, `getSignedUrl`, `listObjects`
Fournisseur actuel : MinIO (self-hosted)
Alternative possible : AWS S3, GCS, Azure Blob

---

## 20. Data & Storage

### 20.1 PostgreSQL — Périmètre Odoo

PostgreSQL est **exclusivement réservé à Odoo**.
Aucun autre service ne se connecte directement à cette base.
Accès uniquement via l'Odoo Adapter (JSON-RPC).

Configuration recommandée : PostgreSQL 16, réplication streaming,
backup quotidien chiffré, PITR (Point-in-Time Recovery) sur 30 jours.

### 20.2 Projections techniques

Les services backend maintiennent des **projections** dénormalisées :
vues optimisées pour le frontend, reconstruites à partir des domain events.

| Projection | Contenu | Stockage |
|-----------|---------|---------|
| `portfolio_view` | Positions, valorisation, revenus YTD | Redis ou PostgreSQL read-replica |
| `marketplace_book` | Offres actives par actif | Redis |
| `kyc_status_cache` | Statut KYC rapide (TTL 5 min) | Redis |
| `yield_projection` | Revenus projetés sur 12 mois | PostgreSQL read-only |

Ces projections sont des **caches dérivés** : elles peuvent être reconstituées
intégralement par replay des events Odoo + domain events Redis.
Elles ne sont jamais la source de vérité.

### 20.3 MinIO — Stockage de documents

MinIO opère comme un stockage objet compatible S3 (self-hosted).

| Bucket | Contenu | Chiffrement | Rétention |
|--------|---------|-------------|-----------|
| `kyc-documents` | Pièces d'identité, justificatifs | AES-256 côté serveur | 5 ans post-relation |
| `contracts` | Bulletins de souscription, cessions | AES-256 | Durée actif + 10 ans |
| `reports` | PDF rapports, attestations fiscales | AES-256 | 5 ans |
| `assets` | Documents techniques actifs solaires | AES-256 | Durée actif |
| `audit-archives` | Exports d'audit réglementaires | AES-256 | 10 ans |

Accès via Storage Adapter uniquement. Les URLs signées (pre-signed URLs)
avec TTL court (15 minutes) sont utilisées pour le téléchargement côté frontend.

### 20.4 Data Warehouse Analytics

En V2, un data warehouse analytique (BigQuery, Snowflake, ou DuckDB self-hosted)
sera alimenté par les events Redis et les exports Odoo pour :
- Analyse de la performance des actifs.
- Cohortes d'investisseurs.
- Modèles de projection énergétique.
- Alimentation des agents IA (section 21).

---

## 21. AI Future Layer

### 21.1 Positionnement

L'architecture événementielle de SolarCells est conçue pour être
consommée nativement par des agents IA en V3.
Les domain events constituent un flux de données structuré, horodaté
et contextuel — un input idéal pour des LLM et des modèles spécialisés.

### 21.2 Agents IA prévus

**Copilote conformité**
Consomme les events `aml.alert.*`, `kyc.*`, `marketplace.trade.*`.
Analyse les patterns de comportement anormal.
Propose des décisions de conformité documentées au Compliance Officer.
Ne décide jamais seul : rôle d'assistant, pas d'arbitre.

**Copilote portefeuille**
Analysed les positions (`portfolio_view`, événements `yield.distributed`).
Génère des recommandations personnalisées de réinvestissement ou de diversification.
Expose une interface conversationnelle dans le dashboard investisseur (opt-in).

**Générateur documentaire**
Génère automatiquement les rapports périodiques (trimestriels, annuels)
à partir des données structurées Odoo + domain events.
Produit des documents conformes aux standards réglementaires.

**Analyse rendement & projections énergétiques**
Modèles de prévision de production solaire (météo, dégradation des panneaux).
Projection des rendements sur 5, 10, 25 ans.
Calibration des modèles sur données historiques de production.

**Assistant reporting fiscal**
Génère des notices d'aide à la déclaration fiscale personnalisées
par juridiction (France, Suisse, Belgique…).

**Agents opérationnels**
Détection proactive des anomalies de réconciliation.
Analyse des logs pour détection d'incidents avant alerte humaine.
Suggestion de corrections automatisées (soumises à validation humaine).

### 21.3 Contraintes IA

- **Aucun agent ne modifie Odoo sans validation humaine.**
- **Aucune décision financière n'est prise par un agent seul.**
- Toutes les actions d'agents sont auditées dans l'Audit Service.
- Les agents ont accès en lecture seule aux projections. Pas d'accès direct à Odoo.

---

## 22. Scalabilité future

### 22.1 Montée en charge

| Dimension | MVP | V2 | V3 |
|-----------|-----|----|----|
| Investisseurs | 1 000 | 10 000 | 100 000 |
| AUM | 5 M€ | 100 M€ | 1 Md€ |
| Actifs tokenisés | 5 | 50 | 500 |
| Transactions/jour | 100 | 10 000 | 100 000 |
| Distributions/trimestre | 5 000 | 500 000 | 5 000 000 |

L'architecture événementielle (Redis Streams, consumers horizontalement scalables)
et l'API Gateway stateless permettent une montée en charge horizontale
sans refonte architecturale.

### 22.2 Multi-juridictions

| Juridiction | Réglementation | Stablecoin | Blockchain réseau |
|------------|---------------|-----------|------------------|
| Suisse | FINMA DLT | USDC / stablecoin CHF | Tempo |
| UE (France, Allemagne…) | MiCA | EURC | Tempo / Polygon |
| Royaume-Uni | FCA | GBPC | À définir |
| Singapour | MAS | XSGD | À définir |

L'abstraction via adapters (Stablecoin Adapter, Blockchain Adapter)
permet d'ajouter un marché sans refonte du domaine métier.
Les règles de conformité par juridiction sont paramétrables dans Odoo.

### 22.3 Multi-assets

Au-delà du solaire, l'architecture supporte d'autres classes d'actifs RWA :
- Éolien terrestre et offshore.
- Hydraulique run-of-river.
- Stockage batterie (BESS).
- Infrastructures de recharge EV.
- Actifs immobiliers à revenus (futur).

Un actif = un `solar.asset` dans Odoo + un contrat `SolarToken` sur la blockchain.
Aucune modification architecturale requise.

### 22.4 Multi-stablecoins

| Stablecoin | Émetteur | Usage prévu |
|-----------|---------|------------|
| EURC | Circle | Marché EU (défaut) |
| USDC | Circle | Marché CH, international |
| EURCV | Société Générale | Option institutionnelle EU |
| XCHF | Swiss Crypto Tokens | Marché CH natif |

Le Stablecoin Adapter abstrait la gestion multi-devises.
Le moteur de conversion et de sélection est géré dans le Payment Service.

### 22.5 Multi-blockchains

L'architecture Tempo Adapter peut être répliquée sur d'autres réseaux.
Un `solar.asset` Odoo peut être associé à plusieurs contrats sur plusieurs chaînes
(bridging inter-chaînes : post-V3, hors périmètre actuel).

### 22.6 Multi-custody providers

L'abstraction Custody Adapter permet de supporter plusieurs custodians
simultanément (ex. Fireblocks pour les institutionnels, Copper pour les HNWI).
La sélection du custodian est paramétrée par type d'investisseur dans Odoo.

### 22.7 Architecture modulaire

Chaque service backend est déployable indépendamment (Docker, Kubernetes).
L'ajout d'un nouveau service (ex. `AnalyticsService`, `TaxService`)
ne nécessite que son abonnement aux streams Redis pertinents,
sans modification des services existants.

---

*Document vivant — version 2.0.0*
*Toute modification : commit `docs: update product-spec vX.Y.Z` + incrément version frontmatter.*
*Compatible Claude Code / Codex / GitHub Spec Kit.*
