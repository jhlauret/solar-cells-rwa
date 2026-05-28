# Glossaire

Le projet a une **règle de surface stricte** : aucun jargon crypto n'est exposé à l'utilisateur final. Ce glossaire fait office de table de traduction.

## UI utilisateur ↔ Technique

| UI utilisateur (visible) | Concept technique (interne) |
|---|---|
| Compte | Wallet custodial |
| Actif solaire | Token / RWA |
| Part | Token unit / share |
| Cession | Transfer (on-chain ou registre Odoo) |
| Bénéficiaire autorisé | Adresse whitelistée |
| Revenu solaire | Yield / dividende |
| Justificatif d'identité | KYC documents |
| Statut de conformité | KYC status |
| Carnet d'opérations | Transaction history |
| Coffre | Custody account |

## Mots **interdits** dans l'UI finale
- `wallet`
- `blockchain`
- `token`
- `crypto`
- `mint` / `burn`
- `gas`
- `smart contract`
- `whitelist` (préférer "bénéficiaire autorisé")

## Mots **autorisés** côté code et documentation interne
Tous. Le tabou ne s'applique qu'à l'UI livrée à l'utilisateur final.
