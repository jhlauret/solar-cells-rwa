# ==============================================================================
#  SolarCells RWA — Makefile
#  Usage : make <cible>   |   make help
# ==============================================================================

.PHONY: help up down logs ps \
        odoo-init install-addon test-addon \
        backend-dev backend-test \
        frontend-dev frontend-build \
        test-all lint \
        clean reset

ODOO_CTR     := solarcells-odoo
BACKEND_CTR  := solarcells-backend
FRONTEND_CTR := solarcells-frontend
DB           := solarcells

# ── Couleurs ───────────────────────────────────────────────────────────────────
BOLD := \033[1m
CYAN := \033[36m
GREEN:= \033[32m
RESET:= \033[0m

## help          : Affiche cette aide
help:
	@echo ""
	@echo "$(BOLD)SolarCells RWA — Commandes disponibles$(RESET)"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  $(CYAN)/' | sed 's/ *:/$(RESET)  /'
	@echo ""

# ── Stack complète ─────────────────────────────────────────────────────────────

## up            : Démarre toute la stack (postgres + odoo + minio + backend + frontend)
up:
	@echo "$(GREEN)▶ Démarrage de la stack SolarCells...$(RESET)"
	docker compose up -d --build
	@echo "$(GREEN)✓ Stack démarrée$(RESET)"
	@echo "  Odoo     → http://localhost:8069"
	@echo "  Backend  → http://localhost:3001"
	@echo "  Frontend → http://localhost:5173"
	@echo "  MinIO    → http://localhost:9001"

## down          : Arrête la stack
down:
	docker compose down

## logs          : Affiche les logs en temps réel
logs:
	docker compose logs -f --tail=100

## ps            : Statut des conteneurs
ps:
	docker compose ps

# ── Odoo ───────────────────────────────────────────────────────────────────────

## odoo-init     : Initialise la base de données Odoo
odoo-init:
	@echo "$(GREEN)▶ Initialisation de la base Odoo...$(RESET)"
	docker compose exec $(ODOO_CTR) odoo \
		--stop-after-init \
		-d $(DB) \
		--init base \
		-r ${POSTGRES_USER:-odoo} \
		-w ${POSTGRES_PASSWORD:-odoo}

## install-addon  addon=<name> : Installe un addon solar_*
install-addon:
	@if [ -z "$(addon)" ]; then echo "Usage: make install-addon addon=solar_audit"; exit 1; fi
	@echo "$(GREEN)▶ Installation de $(addon)...$(RESET)"
	docker compose exec $(ODOO_CTR) odoo \
		--stop-after-init \
		-d $(DB) \
		-i $(addon)

## install-all   : Installe tous les addons solar_* dans le bon ordre
install-all:
	@for addon in solar_audit solar_core solar_kyc solar_wallet solar_asset \
	              solar_holding solar_payment solar_investment solar_market \
	              solar_yield solar_compliance; do \
		echo "$(GREEN)▶ Installation de $$addon...$(RESET)"; \
		docker compose exec $(ODOO_CTR) odoo \
			--stop-after-init -d $(DB) -i $$addon || exit 1; \
	done
	@echo "$(GREEN)✓ Tous les addons installés$(RESET)"

## test-addon    addon=<name> : Lance les tests d'un addon
test-addon:
	@if [ -z "$(addon)" ]; then echo "Usage: make test-addon addon=solar_audit"; exit 1; fi
	@echo "$(GREEN)▶ Tests de $(addon)...$(RESET)"
	docker compose exec $(ODOO_CTR) odoo \
		--test-enable \
		--stop-after-init \
		--test-tags $(addon) \
		-d $(DB) \
		-i $(addon)

## test-all-odoo : Lance les 200 tests Odoo (tous les addons solar_*)
test-all-odoo:
	@for addon in solar_audit solar_core solar_kyc solar_wallet solar_asset \
	              solar_holding solar_payment solar_investment solar_market \
	              solar_yield solar_compliance; do \
		echo "$(GREEN)▶ Tests $$addon...$(RESET)"; \
		docker compose exec $(ODOO_CTR) odoo \
			--test-enable --stop-after-init \
			--test-tags $$addon \
			-d $(DB) -i $$addon || exit 1; \
	done

# ── Backend Node.js ────────────────────────────────────────────────────────────

## backend-dev   : Démarre le backend en mode watch (hot-reload)
backend-dev:
	cd backend-node && npm run dev

## backend-test  : Lance les tests Jest du backend
backend-test:
	cd backend-node && npm test

## backend-lint  : Lint TypeScript du backend
backend-lint:
	cd backend-node && npm run lint

# ── Frontend React ─────────────────────────────────────────────────────────────

## frontend-dev  : Démarre le frontend Vite en mode dev
frontend-dev:
	cd frontend-react && npm run dev

## frontend-build : Build de production du frontend
frontend-build:
	cd frontend-react && npm run build

## frontend-test : Type-check TypeScript du frontend
frontend-test:
	cd frontend-react && npm run type-check

# ── Tests transversaux ─────────────────────────────────────────────────────────

## test-all      : Lance tous les tests (Odoo + Jest + type-check)
test-all: test-all-odoo backend-test frontend-test
	@echo "$(GREEN)✓ Tous les tests passés$(RESET)"

## lint          : Lint tout le projet
lint: backend-lint
	@echo "$(GREEN)✓ Lint terminé$(RESET)"

# ── Nettoyage ──────────────────────────────────────────────────────────────────

## clean         : Supprime les conteneurs et images (garde les volumes)
clean:
	docker compose down --rmi local

## reset         : Réinitialisation complète (DÉTRUIT TOUTES LES DONNÉES)
reset:
	@echo "⚠️  Cette action supprime TOUTES les données (volumes inclus). Continuer ? [y/N]"
	@read -r ans && [ "$$ans" = "y" ] || exit 0
	docker compose down -v --rmi local
	@echo "$(GREEN)✓ Stack réinitialisée$(RESET)"

# ── Validation addons (CI) ─────────────────────────────────────────────────────

## validate-addon addon=<name> : Validation statique d'un addon
validate-addon:
	@if [ -z "$(addon)" ]; then echo "Usage: make validate-addon addon=solar_core"; exit 1; fi
	bash scripts/validate-addon.sh odoo-addons/$(addon)

## configure-smtp  : Configure le serveur SMTP dans Odoo
configure-smtp:
	bash scripts/configure-smtp.sh

## nginx-reload    : Recharge la config nginx sans redémarrer
nginx-reload:
	docker compose exec nginx nginx -s reload
	@echo "✓ nginx rechargé"

## redis-cli       : Ouvre un shell redis-cli interactif
redis-cli:
	docker compose exec redis redis-cli
