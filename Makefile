.PHONY: help dev dev-api dev-web build migrate seed clean docker-up docker-down docker-build lint

# ── dev ────────────────────────────────────────────────────────────────────
dev:
	npm run dev

dev-api:
	npm -w packages/api run dev

dev-web:
	npm -w packages/web run dev

# ── build ──────────────────────────────────────────────────────────────────
build:
	npm -w packages/web run build

# ── database ───────────────────────────────────────────────────────────────
migrate:
	npm -w packages/api run migrate

seed:
	npm -w packages/api run seed

# ── docker ─────────────────────────────────────────────────────────────────
docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-build:
	docker compose build

# ── lint ───────────────────────────────────────────────────────────────────
lint:
	npm -w packages/web run lint

# ── cleanup ────────────────────────────────────────────────────────────────
clean:
	rm -rf node_modules packages/*/node_modules packages/web/dist
	find . -name ".DS_Store" -delete

# ── help ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "LOCAL DEVELOPMENT:"
	@echo "  make dev           Start api + web (parallel)"
	@echo "  make dev-api       Start api only"
	@echo "  make dev-web       Start web only"
	@echo ""
	@echo "DATABASE:"
	@echo "  make migrate       Run migrations"
	@echo "  make seed          Seed database"
	@echo ""
	@echo "BUILD:"
	@echo "  make build         Build web bundle"
	@echo "  make lint          Run eslint"
	@echo ""
	@echo "DOCKER:"
	@echo "  make docker-up     docker compose up --build"
	@echo "  make docker-down   docker compose down"
	@echo "  make docker-build  docker compose build"
	@echo ""
	@echo "CLEANUP:"
	@echo "  make clean         Remove node_modules and build artifacts"
	@echo ""
