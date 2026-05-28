# Conventions de commits

## Principe absolu
**Un commit = une responsabilité unique.**
Si le message contient un "et", le commit est probablement trop gros.

## Format
On suit [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <résumé impératif court, ≤ 72 caractères>

[corps optionnel, expliquant le pourquoi]

[footer optionnel : Refs #123, BREAKING CHANGE: …]
```

## Types autorisés
| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité utilisateur |
| `fix` | Correction de bug |
| `refactor` | Restructuration sans changement de comportement |
| `chore` | Tâches d'outillage, config, dépendances |
| `docs` | Documentation uniquement |
| `test` | Ajout/modification de tests |
| `style` | Formatage, sans impact fonctionnel |
| `perf` | Amélioration de performance |
| `build` | Build, Docker, CI |
| `ci` | Pipeline CI |

## Scopes recommandés
`frontend`, `backend`, `odoo`, `contracts`, `docs`, `specs`, `infra`, `tests`, `repo`.

## Règles
1. **Pas de gros commits.** Si le diff dépasse une responsabilité claire, on découpe.
2. **Un écran frontend = une branche** (ou une série de commits sur une branche dédiée).
3. **Aucun commit ne doit casser le build** sur `main`.
4. **Pas de mélange** : code + doc dans deux commits séparés sauf trivialité (1 ligne).
5. **Le message est en anglais ou en français**, mais on choisit une langue et on s'y tient pour le projet.

## Exemples valides
```
chore(repo): add root README
chore(repo): add .gitignore
chore(infra): scaffold docker-compose with empty services
docs: add ARCHITECTURE skeleton
chore(frontend): create frontend-react folder with README
chore(backend): create backend-node folder with README
chore(odoo): create odoo-addons folder with README
```

## Exemples à proscrire
```
❌ feat: add frontend and backend folders and docker-compose
❌ chore: initial commit          (trop générique pour un repo non vide)
❌ wip: stuff                     (jamais)
```
