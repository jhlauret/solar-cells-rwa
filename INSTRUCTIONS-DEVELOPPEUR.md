# SolarCells RWA — Instructions de déploiement & maintenance
## Document à transmettre au développeur

---

## 1. Ce que vous recevez

Une archive `solarcells-rwa-COMPLET.zip` contenant :

```
solarcells-rwa/
├── .env.example              ← modèle des variables d'environnement
├── .github/workflows/        ← CI/CD automatisé (4 pipelines)
├── docker-compose.yml        ← orchestration des 7 services
├── Makefile                  ← toutes les commandes utiles
├── README.md                 ← documentation technique
├── nginx/                    ← configuration reverse proxy
├── scripts/                  ← scripts d'initialisation
├── odoo-addons/              ← 11 modules Odoo 18 (Python)
├── backend-node/             ← API Node.js/Express (TypeScript)
└── frontend-react/           ← Application React/Vite (TypeScript)
```

**Ce qui n'est PAS inclus** (à obtenir séparément) :
- Un serveur VPS ou cloud
- Un nom de domaine
- Les clés API Stripe (stripe.com)
- Un service SMTP (Mailgun ou SendGrid)
- Les secrets JWT (à générer)

---

## 2. Prérequis serveur

### Configuration minimale
| Ressource | Minimum | Recommandé |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 Go | 8 Go |
| Disque | 40 Go SSD | 80 Go SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Hébergeurs recommandés
- **Hetzner Cloud** : instance CX31 (4 vCPU / 8 Go) ≈ 12 €/mois
- **OVHcloud** : VPS Comfort ≈ 14 €/mois
- **DigitalOcean** : Droplet 8 Go ≈ 48 $/mois

### Logiciels à installer sur le serveur
```bash
# Docker Engine
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose plugin (inclus avec Docker Engine 24+)
docker compose version   # doit afficher 2.x

# Make
sudo apt-get install -y make
```

---

## 3. Comptes externes à créer avant le déploiement

### Stripe (paiements)
1. Créer un compte sur https://dashboard.stripe.com
2. Récupérer dans **Developers → API Keys** :
   - `STRIPE_SECRET_KEY` → commence par `sk_live_...` (ou `sk_test_...` pour les tests)
3. Dans **Developers → Webhooks**, créer un endpoint :
   - URL : `https://votre-domaine.com/api/v1/webhooks/stripe`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.processing`
   - Récupérer le `STRIPE_WEBHOOK_SECRET` → commence par `whsec_...`
4. Récupérer la **clé publique** `pk_live_...` (pour le frontend)

### SMTP (emails de vérification)
Choisir **un** de ces services :

**Option A — Mailgun** (recommandé, 3000 emails/mois gratuits)
1. Créer un compte sur https://mailgun.com
2. Ajouter et valider votre domaine
3. Récupérer : `SMTP_HOST=smtp.mailgun.org`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD`

**Option B — SendGrid**
1. Créer un compte sur https://sendgrid.com
2. Récupérer : `SMTP_HOST=smtp.sendgrid.net`, `SMTP_PORT=587`, `SMTP_USER=apikey`, `SMTP_PASSWORD=<votre_api_key>`

### Nom de domaine
1. Acheter le domaine sur Gandi, OVH ou Cloudflare (~12 €/an)
2. Pointer l'enregistrement DNS `A` vers l'IP du serveur :
   ```
   @     A    <IP_DU_SERVEUR>
   www   A    <IP_DU_SERVEUR>
   api   A    <IP_DU_SERVEUR>
   ```

---

## 4. Installation initiale sur le serveur

### 4.1 Transférer les fichiers
```bash
# Depuis votre machine locale :
scp solarcells-rwa-COMPLET.zip ubuntu@<IP_SERVEUR>:/srv/

# Sur le serveur :
ssh ubuntu@<IP_SERVEUR>
cd /srv
unzip solarcells-rwa-COMPLET.zip
cd solarcells-rwa
```

### 4.2 Configurer les variables d'environnement
```bash
cp .env.example .env
nano .env
```

Renseigner **obligatoirement** ces valeurs :
```bash
# PostgreSQL
POSTGRES_PASSWORD=<mot_de_passe_fort>       # ex: openssl rand -hex 16

# JWT — générer avec : openssl rand -base64 32
JWT_ACCESS_SECRET=<chaine_aleatoire_32_chars_minimum>
JWT_REFRESH_SECRET=<autre_chaine_aleatoire_32_chars_minimum>

# Odoo API (utilisateur qui sera créé à l'étape 5)
ODOO_API_USER=api@solarcells.com
ODOO_API_PASSWORD=<mot_de_passe_fort>

# MinIO
MINIO_ROOT_PASSWORD=<mot_de_passe_fort>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SMTP
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.votre-domaine.com
SMTP_PASSWORD=<cle_mailgun>
SMTP_FROM_EMAIL=noreply@votre-domaine.com
```

Configurer aussi le frontend :
```bash
cp frontend-react/.env.development frontend-react/.env.production
nano frontend-react/.env.production
```
```bash
VITE_API_URL=https://votre-domaine.com/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

### 4.3 Lancer la stack
```bash
make up
# Attendre ~2 minutes que tous les services soient healthy

make ps
# Tous les services doivent afficher "healthy" ou "running"
```

### 4.4 Initialiser Odoo
```bash
make odoo-init
# Attendre ~3 minutes

make install-all
# Installe les 11 modules — attendre ~5 minutes
```

### 4.5 Configurer le SMTP dans Odoo
```bash
make configure-smtp
# Ou manuellement : http://<IP>:8069 → Settings → Technical → Outgoing mail servers
```

### 4.6 Créer l'utilisateur API Odoo (obligatoire)
1. Aller sur http://<IP>:8069
2. Se connecter avec `admin` / `admin`
3. Aller dans **Settings → Users → New**
4. Créer l'utilisateur :
   - Nom : `API SolarCells`
   - Email : `api@solarcells.com` (doit correspondre à `ODOO_API_USER` dans `.env`)
   - Mot de passe : (doit correspondre à `ODOO_API_PASSWORD` dans `.env`)
   - Groupes : cocher `Solar / API`
5. **Changer immédiatement le mot de passe admin Odoo** (Settings → Users → Administrator)

---

## 5. Configuration SSL (HTTPS)

```bash
# Installer Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat Let's Encrypt
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Tester le renouvellement automatique
sudo certbot renew --dry-run
```

Ensuite, modifier `nginx/nginx.conf` pour rediriger HTTP → HTTPS :

```nginx
# Décommenter cette ligne dans le bloc server :
return 301 https://$host$request_uri;
```

```bash
make nginx-reload
```

---

## 6. Vérifications post-déploiement

```bash
# Santé de l'API
curl https://votre-domaine.com/health
# → {"status":"ok","env":"production"}

# Tests automatisés (optionnel mais recommandé)
make test-all
```

Tester manuellement le flow complet :
1. Ouvrir https://votre-domaine.com
2. Créer un compte → recevoir l'email OTP ✉️
3. Vérifier l'email → accéder au KYC
4. Uploader des documents de test
5. Créer un wallet
6. Accéder à la marketplace

---

## 7. GitHub — Workflow de développement

### 7.1 Initialiser le dépôt
```bash
cd /srv/solarcells-rwa   # ou en local sur votre machine
git init
git add .
git commit -m "feat: initial project setup"

# Créer le dépôt sur github.com puis :
git remote add origin https://github.com/votre-org/solarcells-rwa.git
git branch -M main
git push -u origin main

# Créer la branche develop
git checkout -b develop
git push -u origin develop
```

### 7.2 Structure des branches

```
main       ← production (protégée, déployée automatiquement)
develop    ← intégration (protégée, tests automatiques)
feature/*  ← nouvelles fonctionnalités
fix/*      ← corrections de bugs et coquilles
hotfix/*   ← corrections urgentes en production
chore/*    ← maintenance, dépendances
```

### 7.3 Protections GitHub à activer
Dans **Settings → Branches → Branch protection rules** :

**Pour `main` :**
- ✅ Require a pull request before merging
- ✅ Require status checks : `test-frontend`, `test-backend`
- ✅ Require branches to be up to date
- ✅ Do not allow bypassing (inclure les admins)
- ❌ Allow force pushes

**Pour `develop` :**
- ✅ Require a pull request before merging
- ✅ Require status checks : `test-frontend`, `test-backend`

### 7.4 Secrets GitHub à configurer
Dans **Settings → Secrets and variables → Actions** :

| Secret | Description |
|---|---|
| `DOCKER_USERNAME` | Nom d'utilisateur Docker Hub |
| `DOCKER_PASSWORD` | Token Docker Hub (read/write) |
| `DEPLOY_SSH_KEY` | Clé SSH privée vers le serveur |
| `DEPLOY_HOST` | IP du serveur |
| `DEPLOY_USER` | Utilisateur SSH (ex: `ubuntu`) |
| `DEPLOY_PATH` | `/srv/solarcells-rwa` |
| `STRIPE_PUBLIC_KEY` | `pk_live_...` (pour le build frontend) |
| `SLACK_WEBHOOK_URL` | (optionnel) notifications Slack |

### 7.5 Générer et configurer la clé SSH de déploiement
```bash
# Sur votre machine locale :
ssh-keygen -t ed25519 -C "solarcells-deploy" -f ~/.ssh/solarcells_deploy

# Copier la clé publique sur le serveur :
ssh-copy-id -i ~/.ssh/solarcells_deploy.pub ubuntu@<IP_SERVEUR>

# Copier la clé PRIVÉE dans GitHub Secrets → DEPLOY_SSH_KEY :
cat ~/.ssh/solarcells_deploy
```

---

## 8. Faire une correction de libellé ou micro-coquille (frontend)

```bash
# Partir toujours de develop à jour
git checkout develop
git pull origin develop

# Créer une branche descriptive
git checkout -b fix/label-dashboard-revenus

# Modifier le(s) fichier(s) concerné(s)
# exemple : frontend-react/src/pages/dashboard/DashboardPage.tsx

# Vérifier que TypeScript ne casse rien
cd frontend-react && npm run type-check && cd ..

# Committer avec un message conventionnel
git add frontend-react/src/pages/dashboard/DashboardPage.tsx
git commit -m "fix(dashboard): corriger libellé 'Rendements' → 'Revenus'"

# Pousser et ouvrir une PR vers develop
git push origin fix/label-dashboard-revenus
```

Sur GitHub : ouvrir une **Pull Request** `fix/label-dashboard-revenus` → `develop`
→ les tests TypeScript se lancent automatiquement
→ merger après validation
→ ouvrir une PR `develop` → `main` pour déployer en production

---

## 9. Ajouter une nouvelle fonctionnalité frontend

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-de-la-feature

# Développer...
# Committer régulièrement

git push origin feature/nom-de-la-feature
# → PR vers develop
# → Tests auto
# → Review + merge
# → PR develop → main → deploy auto
```

---

## 10. Correction urgente en production (hotfix)

```bash
# Partir de main (pas de develop)
git checkout main
git pull origin main
git checkout -b hotfix/correction-critique

# Corriger
git commit -m "hotfix: description de la correction"
git push origin hotfix/correction-critique

# PR directement vers main (priorité)
# Après merge → reporter aussi sur develop :
git checkout develop
git merge main
git push origin develop
```

---

## 11. Commandes quotidiennes utiles

```bash
make logs           # Voir les logs en temps réel
make ps             # Statut de tous les services
make down           # Arrêter la stack
make up             # Redémarrer la stack

make backend-dev    # Développer le backend en local (hot-reload)
make frontend-dev   # Développer le frontend en local (Vite)

make test-all       # Lancer tous les tests
make backend-test   # Tests Jest uniquement
make test-all-odoo  # 200 tests Odoo Python

make redis-cli      # Inspecter Redis (sessions)
make nginx-reload   # Recharger nginx sans redémarrage
```

---

## 12. Surveillance et maintenance

### Espace disque (à surveiller)
```bash
df -h                        # Espace disque global
docker system df             # Espace utilisé par Docker
docker system prune -f       # Nettoyer les images non utilisées
```

### Sauvegardes (à automatiser avec un cron)
```bash
# Sauvegarde PostgreSQL
docker compose exec postgres pg_dump -U odoo solarcells > backup_$(date +%Y%m%d).sql

# Sauvegarde MinIO (documents KYC)
# Configurer mc (MinIO Client) pour synchroniser vers S3 ou un NAS
```

### Renouvellement SSL (automatique via cron Certbot)
```bash
# Vérifier que le cron est en place :
sudo crontab -l | grep certbot
# Doit contenir : 0 12 * * * certbot renew --quiet
```

---

## 13. Contacts et ressources

| Ressource | URL |
|---|---|
| Documentation Odoo 18 | https://www.odoo.com/documentation/18.0/ |
| Documentation Stripe | https://stripe.com/docs |
| Documentation TanStack Query | https://tanstack.com/query |
| Documentation Docker Compose | https://docs.docker.com/compose/ |
| Stack overflow Odoo | https://stackoverflow.com/questions/tagged/odoo |

---

*Document généré pour le projet SolarCells RWA — Confidentiel*
