# SolarCells RWA — Plateforme d'investissement en actifs solaires tokenisés

[![Test Odoo](https://github.com/your-org/solarcells-rwa/actions/workflows/test-odoo.yml/badge.svg)](https://github.com/your-org/solarcells-rwa/actions/workflows/test-odoo.yml)
[![Test Backend](https://github.com/your-org/solarcells-rwa/actions/workflows/test-backend.yml/badge.svg)](https://github.com/your-org/solarcells-rwa/actions/workflows/test-backend.yml)
[![Test Frontend](https://github.com/your-org/solarcells-rwa/actions/workflows/test-frontend.yml/badge.svg)](https://github.com/your-org/solarcells-rwa/actions/workflows/test-frontend.yml)

## Architecture

```
React + Vite  ──HTTPS──►  Node.js/Express  ──JSON-RPC──►  Odoo 18 (11 addons)
(25 pages)                (JWT argon2id)                   (16 modèles)
TanStack Query            Stripe webhooks                        │
                               │                          PostgreSQL 16
                               ▼
                            MinIO (KYC docs)
```

## Prérequis

| Outil | Version |
|---|---|
| Docker + Compose | 24+ |
| Node.js | 20+ |
| Make | any |

## Démarrage rapide

```bash
git clone https://github.com/your-org/solarcells-rwa.git
cd solarcells-rwa

cp .env.example .env
# Compléter .env avec vos secrets Stripe, JWT, etc.

make up          # Lance les 5 services Docker
make odoo-init   # Initialise la base de données
make install-all # Installe les 11 addons Odoo

# Frontend  : http://localhost:5173
# Backend   : http://localhost:3001/health
# Odoo      : http://localhost:8069
# MinIO     : http://localhost:9001
```

## Variables d'environnement clés

| Variable | Description |
|---|---|
| `JWT_ACCESS_SECRET` | Secret JWT (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret refresh JWT (min 32 chars) |
| `STRIPE_SECRET_KEY` | Clé Stripe (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook Stripe (`whsec_...`) |
| `ODOO_API_USER` / `_PASSWORD` | Utilisateur API Odoo |
| `MINIO_ROOT_PASSWORD` | Mot de passe MinIO |

Frontend — `frontend-react/.env.development` :
```
VITE_API_URL=http://localhost:3001/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

## Commandes

```bash
make help           # Toutes les commandes

make up / down      # Démarrer / arrêter la stack
make logs / ps      # Logs et statut

make install-all    # Installe les 11 addons Odoo
make test-all-odoo  # 200 tests Python Odoo
make backend-test   # Tests Jest Node.js
make test-all       # Tous les tests
```

## Structure

```
solarcells-rwa/
├── .github/workflows/    4 pipelines CI/CD
├── .specify/             Règles de gouvernance
├── odoo-addons/          11 addons Odoo 18
│   ├── solar_audit       Logs immuables
│   ├── solar_core        res.partner + auth + OTP
│   ├── solar_kyc         Dossiers KYC
│   ├── solar_wallet      Custody wallets
│   ├── solar_asset       Actifs solaires
│   ├── solar_holding     Holdings
│   ├── solar_payment     Transactions Stripe/Bridge
│   ├── solar_investment  Ordres de souscription
│   ├── solar_market      Marché secondaire P2P
│   ├── solar_yield       Distributions revenus
│   └── solar_compliance  Alertes AML
├── backend-node/         Node.js + Express
├── frontend-react/       React 18 + Vite
└── docker-compose.yml    5 services
```

## Flow utilisateur

```
Inscription → Email OTP → KYC (identité + selfie + domicile)
→ Wallet → Marketplace → Investir (Stripe) → Confirmation → Dashboard
```

## CI/CD

| Pipeline | Déclencheur |
|---|---|
| `test-odoo.yml` | PR sur `odoo-addons/` |
| `test-backend.yml` | PR sur `backend-node/` |
| `test-frontend.yml` | PR sur `frontend-react/` |
| `deploy.yml` | Push sur `main` (rolling update SSH) |

Secrets GitHub à configurer : `DOCKER_USERNAME`, `DOCKER_PASSWORD`,
`DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `STRIPE_PUBLIC_KEY`.

## Licence

Propriétaire — SolarCells SAS © 2025
