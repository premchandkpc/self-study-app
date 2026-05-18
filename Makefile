.PHONY: install dev build preview stop lint clean help

APP_DIR := react-study-app
PORT    := 5173

# ── install ────────────────────────────────────────────────────────────────────
install:
	cd $(APP_DIR) && npm install

# ── dev server ─────────────────────────────────────────────────────────────────
dev:
	@-lsof -ti :$(PORT) | xargs kill -9 2>/dev/null || true
	cd $(APP_DIR) && npm run dev

# ── production build ───────────────────────────────────────────────────────────
build:
	cd $(APP_DIR) && npm run build

# ── preview built dist ─────────────────────────────────────────────────────────
preview: build
	cd $(APP_DIR) && npm run preview

# ── kill dev server ────────────────────────────────────────────────────────────
stop:
	@-lsof -ti :$(PORT) | xargs kill -9 2>/dev/null || true
	@echo "Stopped port $(PORT)"

# ── lint (eslint) ──────────────────────────────────────────────────────────────
lint:
	cd $(APP_DIR) && npm run lint

# ── remove build artifacts ─────────────────────────────────────────────────────
clean:
	rm -rf $(APP_DIR)/dist $(APP_DIR)/node_modules/.vite

# ── help ───────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  make install   install npm deps"
	@echo "  make dev       dev server → http://localhost:$(PORT)"
	@echo "  make build     production build → $(APP_DIR)/dist/"
	@echo "  make preview   build + serve dist locally"
	@echo "  make stop      kill port $(PORT)"
	@echo "  make lint      eslint"
	@echo "  make clean     remove dist + vite cache"
	@echo ""
