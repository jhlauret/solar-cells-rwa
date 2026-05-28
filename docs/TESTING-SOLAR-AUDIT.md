# Tester `solar_audit` localement — Guide pas-à-pas

> Premier addon Odoo du projet. Cible : vérifier qu'il s'installe,
> qu'il passe ses tests, et qu'il est manipulable depuis l'UI Odoo.
> Durée estimée : ~10 minutes la première fois (téléchargement images
> Docker comprises), ~2 minutes les suivantes.

---

## Prérequis

| Outil | Version minimum | Vérification |
|-------|----------------|--------------|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 (intégré) | `docker compose version` |
| GNU Make | 3.8+ | `make --version` |

Si Docker n'est pas installé : [docs.docker.com/get-docker](https://docs.docker.com/get-docker/).

---

## Étape 0 — Préparer l'environnement

```bash
# Depuis la racine du repo SolarCells :
cp .env.example .env
```

Édite `.env` et **change au minimum** ces deux valeurs :

```
POSTGRES_PASSWORD=<un_mot_de_passe_fort>
ODOO_ADMIN_PASSWORD=<autre_mot_de_passe_fort>
```

Les autres valeurs par défaut sont OK pour un test local.

---

## Étape 1 — Validation statique (sans Docker)

Avant même de démarrer Docker, vérifie que l'addon est cohérent :

```bash
make lint-solar-audit
```

Sortie attendue (extrait) :

```
==============================================================
  Validation statique de l'addon : solar_audit
==============================================================
✓ __manifest__.py présent
→ Vérification syntaxe Python...
  ✓ ./models/solar_audit_log.py
  ✓ ./tests/test_solar_audit_log.py
  ...
→ Vérification XML...
  ✓ ./views/solar_audit_log_views.xml
  ...
→ Présence de tests...
  ✓ 17 méthodes de test trouvées
==============================================================
  ✅ Validation OK
```

Si cette étape échoue, **arrête là et signale le problème.** L'addon
ne s'installera pas dans Odoo.

---

## Étape 2 — Démarrer Postgres + Odoo

```bash
make up
```

Cela télécharge (la première fois) les images Docker `postgres:16` et
`odoo:18.0`, démarre les deux services en arrière-plan, et attend
qu'ils soient prêts.

Vérifier l'état :

```bash
make status
```

Sortie attendue :

```
NAME                    IMAGE          STATUS
solarcells-postgres     postgres:16    Up (healthy)
solarcells-odoo         odoo:18.0      Up (healthy)
```

⚠ **Premier démarrage uniquement** : Odoo met ~60 secondes à passer
en `healthy` (initialisation interne). Patiente.

Si tu veux voir les logs en direct :

```bash
make logs
```

(Ctrl+C pour sortir des logs sans arrêter Odoo.)

---

## Étape 3 — Initialiser la base de données

Avant d'installer un addon, Odoo a besoin d'une base de données initialisée.

```bash
make odoo-init
```

Cela crée une base `solarcells` avec le module `base` et l'utilisateur `admin`.

⚠ Cette commande prend **30 à 60 secondes** la première fois.

À la fin :

```
✓ Base solarcells initialisée.
  Connectez-vous sur http://localhost:8069 :
    login : admin
    pwd   : <ce_qui_est_dans_.env_ADMIN_PASSWORD>
```

Tu peux maintenant ouvrir http://localhost:8069 et te connecter.
Tu ne verras pas encore l'addon `solar_audit` — il faut l'installer.

---

## Étape 4 — Installer l'addon `solar_audit`

```bash
make install-solar-audit
```

Cela exécute :

```bash
docker compose exec odoo odoo -d solarcells -i solar_audit --stop-after-init
```

Sortie attendue (dernières lignes) :

```
INFO solarcells odoo.modules.loading: Module solar_audit loaded in X.XXs
✓ solar_audit installé dans solarcells
```

Si tu vois des **erreurs** dans la sortie, copie-les et signale-les.
Les erreurs Odoo sont assez bavardes mais lisibles.

---

## Étape 5 — Lancer les tests automatiques

C'est le test critique :

```bash
make test-solar-audit
```

Cela lance les **17 tests unitaires** en mode `--test-enable`.

Sortie attendue (extrait) :

```
INFO solarcells odoo.addons.solar_audit.tests.test_solar_audit_log:
    test_create_audit_entry_success ... ok
INFO solarcells odoo.addons.solar_audit.tests.test_solar_audit_log:
    test_direct_create_is_forbidden ... ok
INFO solarcells odoo.addons.solar_audit.tests.test_solar_audit_log:
    test_write_is_forbidden ... ok
... (14 autres)

OK
```

**Si un test échoue**, la sortie indique précisément lequel et pourquoi.

### Tests qu'on s'attend à voir passer

| # | Test | Vérifie que |
|---|------|-------------|
| 1 | `test_create_audit_entry_success` | La création standard fonctionne |
| 2 | `test_create_audit_entry_with_full_metadata` | Tous les champs optionnels sont persistés |
| 3 | `test_create_audit_entry_default_actor_is_current_user` | L'acteur par défaut est l'utilisateur courant |
| 4 | `test_create_audit_entry_uuid_is_unique` | Les UUID sont uniques entre entrées |
| 5 | `test_create_audit_entry_rejects_non_recordset_subject` | Validation d'input |
| 6 | `test_create_audit_entry_rejects_multi_subject` | Validation d'input |
| 7 | `test_create_audit_entry_rejects_empty_subject` | Validation d'input |
| 8 | `test_create_audit_entry_rejects_empty_action_code` | Validation d'input |
| 9 | **`test_direct_create_is_forbidden`** | `create()` direct est bloqué |
| 10 | **`test_write_is_forbidden`** | `write()` est bloqué |
| 11 | **`test_unlink_without_retention_context_is_forbidden`** | `unlink()` est bloqué |
| 12 | **`test_unlink_with_retention_context_is_allowed`** | Purge contrôlée OK |
| 13 | `test_subject_uuid_captured_when_available` | UUID du sujet auto-capturé |
| 14 | `test_subject_uuid_absent_when_no_uuid_field` | OK quand pas de champ uuid |
| 15 | `test_search_entries_for_subject` | Helper de recherche |
| 16 | `test_search_entries_for_action` | Helper de recherche |
| 17 | `test_default_order_is_most_recent_first` | Tri par date décroissante |

Les tests en **gras** sont les invariants critiques de l'addon (immuabilité).

---

## Étape 6 — Vérification manuelle dans l'UI Odoo

Ouvre http://localhost:8069, connecte-toi avec `admin`.

1. En haut à gauche, tu devrais voir le **menu "Solar"** apparaître.
2. Clique : **Solar → Audit → Audit log**.
3. La liste est vide pour l'instant (aucune entrée n'a encore été créée).
4. Clique **"Search"** et applique le filtre **"Last 7 days"** : toujours vide.

Maintenant, génère un audit log manuellement via le **shell Odoo** :

```bash
make odoo-shell
```

Une fois dans le shell Python :

```python
# Crée une entrée d'audit sur l'utilisateur admin
admin = env['res.users'].browse(2)  # admin id=2 généralement
entry = env['solar.audit.log'].create_audit_entry(
    action_code='manual.test.from_shell',
    subject=admin.partner_id,
    after={'test': 'hello from shell'},
)
print(entry.uuid, entry.action_code, entry.timestamp)
env.cr.commit()  # IMPORTANT : sinon le rollback à la sortie du shell perd l'entrée
exit()
```

Retourne dans l'UI Odoo, rafraîchis **Solar → Audit → Audit log** :
l'entrée `manual.test.from_shell` doit apparaître.

Clique dessus pour voir le détail (la form view) : tu dois voir
le sujet (`res.partner` id=X), l'acteur (`admin`), le contenu du `after_state`.

Tente **manuellement** ces actions, qui doivent **toutes échouer** avec
un message d'erreur clair :

- 🚫 Bouton "Create" : il **ne doit pas exister** dans la barre du haut
  (la vue tree a `create="false"`).
- 🚫 Modifier un champ dans la form view : tous les champs sont en `readonly="1"`.
- 🚫 Supprimer une entrée : pas de bouton non plus.

---

## Étape 7 — Tester l'immuabilité depuis le shell

```bash
make odoo-shell
```

```python
entry = env['solar.audit.log'].search([], limit=1)
print(entry.action_code)

# Test 1 : create direct doit échouer
try:
    env['solar.audit.log'].create({
        'action_code': 'bypass',
        'subject_model': 'res.partner',
        'subject_id': 1,
        'actor_type': 'user',
    })
    print("❌ ERREUR : create direct a réussi (NE DEVRAIT PAS)")
except Exception as e:
    print(f"✓ create direct bloqué : {e}")

# Test 2 : write doit échouer
try:
    entry.write({'action_code': 'mutated'})
    print("❌ ERREUR : write a réussi")
except Exception as e:
    print(f"✓ write bloqué : {e}")

# Test 3 : unlink doit échouer
try:
    entry.unlink()
    print("❌ ERREUR : unlink a réussi")
except Exception as e:
    print(f"✓ unlink bloqué : {e}")

exit()
```

Les trois exceptions doivent être levées. Si l'une d'elles n'est PAS levée,
c'est un bug de l'addon (ou de cette spec).

---

## Étape 8 — Nettoyer (optionnel)

### Arrêter les services sans perdre les données

```bash
make down
```

### Repartir de zéro (PERTE des données)

```bash
make clean       # demande confirmation, supprime les volumes
make up          # redémarre
make odoo-init   # réinitialise la base
```

---

## Que faire en cas de problème

### Symptôme : `make up` échoue sur le pull d'image

→ Vérifie ta connexion internet. Réessaie : `make up`.

### Symptôme : `make odoo-init` lance des erreurs Postgres

→ Postgres n'est pas encore prêt. Attends 30 sec et réessaie.
   Ou regarde les logs : `docker compose logs postgres`.

### Symptôme : `make install-solar-audit` lance une erreur d'import

→ Probable bug Python dans l'addon. Copie l'erreur. Relance `make lint-solar-audit`.

### Symptôme : un test échoue

→ Copie la sortie complète du test qui échoue. Le rapport indique le fichier
   et la ligne. C'est un bug à corriger (soit dans le test, soit dans le modèle).

### Symptôme : Odoo démarre mais le menu "Solar" n'apparaît pas

→ Tu n'es probablement pas dans le bon groupe. L'utilisateur `admin` devrait
   l'avoir automatiquement (via `base.group_system`). Vérifie sur
   **Paramètres → Utilisateurs → admin → Solar / Audit Reader** doit être coché.

---

## Quand tout passe : critères de succès

- [x] `make lint-solar-audit` : ✅
- [x] `make up` + `make status` : 2 conteneurs `Up (healthy)`
- [x] `make odoo-init` : pas d'erreur, message "Base solarcells initialisée"
- [x] `make install-solar-audit` : pas d'erreur, "Module solar_audit loaded"
- [x] `make test-solar-audit` : **17 tests passent, 0 échec**
- [x] Menu "Solar → Audit" visible dans Odoo UI
- [x] Création manuelle via shell visible dans la liste
- [x] Tentatives de bypass (create/write/unlink) toutes bloquées

Si les 8 cases sont cochées, **l'addon est validé** et on peut construire
les suivants par-dessus.

---

## Prochaines étapes (après validation `solar_audit`)

Une fois cet addon vert :

1. **`solar_core`** (minimal) — extension `res.partner` + groupes de sécurité partagés
2. **`solar_kyc`** — cas KYC + documents + décisions (3 modèles)
3. **`solar_wallet`** — wallets custodial

Voir `specs/mdd/00-overview.md` §16.3 pour l'ordre complet d'implémentation.
