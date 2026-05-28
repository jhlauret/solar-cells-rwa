# Architecture — SolarCells RWA

> Document de référence à enrichir au fil du projet. **Squelette initial.**

## Vue d'ensemble

```
┌──────────────┐     HTTPS/JSON     ┌──────────────┐    JSON-RPC    ┌──────────────┐
│              │ ─────────────────► │              │ ─────────────► │              │
│   Frontend   │                    │   Backend    │                │   Odoo V18   │
│  React/Vite  │ ◄───────────────── │   Node/Exp.  │ ◄───────────── │  (vérité)    │
│              │                    │              │                │              │
└──────────────┘                    └──────────────┘                └──────┬───────┘
                                                                           │
                                                                           ▼
                                                                    ┌──────────────┐
                                                                    │  PostgreSQL  │
                                                                    │ (Odoo only)  │
                                                                    └──────────────┘
```

## Principes
1. **Odoo = source de vérité métier unique.** Aucun modèle métier ailleurs.
2. **Backend Node = orchestrateur sans état métier.** Il traduit, valide, agrège, n'invente rien.
3. **Frontend = pur consommateur de l'API backend.** Aucun appel direct à Odoo.
4. **PostgreSQL est réservé à Odoo.** Toute autre persistance est interdite au MVP.

## Flux clés (à détailler)
- [ ] Onboarding investisseur + KYC
- [ ] Souscription à un actif solaire
- [ ] Transfert whitelisté entre investisseurs
- [ ] Distribution périodique de revenus
- [ ] Consultation du portefeuille

## Sécurité (à détailler)
- [ ] Authentification frontend (session ou JWT — à décider)
- [ ] Authentification backend ↔ Odoo (compte technique JSON-RPC)
- [ ] Modèle de permissions par rôle
- [ ] Audit trail (côté Odoo)

## Décisions ouvertes
- [ ] Choix du provider KYC
- [ ] Choix du custodian (wallets custodial au MVP)
- [ ] Modèle de smart contracts (post-MVP)
