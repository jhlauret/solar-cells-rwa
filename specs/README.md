# specs

Spécifications fonctionnelles du projet.

## Principe
Chaque fonctionnalité métier doit avoir une **spec écrite** dans ce dossier **avant** d'être implémentée. La spec décrit le quoi et le pourquoi ; le code décrit le comment.

## Structure cible
```
specs/
├── 00-overview.md
├── 01-onboarding-kyc.md
├── 02-portfolio.md
├── 03-souscription.md
├── 04-transfert.md
├── 05-revenus.md
└── 99-glossaire-metier.md
```

## Format d'une spec
- **Contexte** : pourquoi cette fonctionnalité existe.
- **Acteurs** : qui l'utilise.
- **Parcours utilisateur** : étape par étape.
- **Règles métier** : conditions, validations, contraintes.
- **Modèle de données impacté** : quels modèles Odoo, quels champs.
- **API exposée** : endpoints backend, payloads.
- **Critères d'acceptation** : tests vérifiables.

## Statut
🚧 Aucune spec rédigée. À démarrer avant la première feature métier.
