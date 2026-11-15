#!/usr/bin/env bash
# PURRE PETS — bezpieczne wdrożenie produkcyjne (Oracle Ubuntu 24.04, ARM64, PM2 + Nginx).
# Frontend: TanStack Start SSR na Nitro → node .output/server/index.mjs (127.0.0.1:3000)
# Backend:  Express + Prisma + Socket.IO → backend/src/server.js (127.0.0.1:4000)
#
# Gwarancje:
#  - nie wykonuje git reset --hard ani git clean,
#  - przerywa się, gdy repo ma niezacommitowane zmiany (decyzja należy do operatora),
#  - NIE wykonuje destrukcyjnych operacji na bazie (prisma db push tylko ręcznie),
#  - przed buildem zachowuje poprzednią działającą wersję (.output.bak-*),
#  - po buildzie uruchamia smoke-test artefaktów (w tym regresję 'cloudflare:'),
#  - po restarcie PM2 sprawdza realne odpowiedzi HTTP; przy porażce robi rollback.
#
# Uruchomienie:  bash scripts/deploy.sh
# Opcjonalnie:   DEPLOY_BRANCH=main DEPLOY_NGINX=1 bash scripts/deploy.sh
set -euo pipefail

APP_DIR="/home/ubuntu/Base44"
BACKEND="$APP_DIR/backend"
BRANCH="${DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
FRONT_URL="${FRONT_URL:-http://127.0.0.1:3000}"
API_HEALTH="${API_HEALTH:-http://127.0.0.1:4000/api/health}"

log() { echo "==> $*"; }
die() { echo "❌ $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || die "Node.js nie jest zainstalowany"
command -v pm2  >/dev/null 2>&1 || die "PM2 nie jest zainstalowany (npm i -g pm2)"
log "Node $(node -v), npm $(npm -v)"

cd "$APP_DIR"

log "[1/10] git status — kontrola niezacommitowanych zmian"
if ! git diff --quiet || ! git diff --cached --quiet; then
  git status --short
  die "Repozytorium ma niezacommitowane zmiany. Zapisz je (commit lub git stash) i uruchom ponownie."
fi

log "[2/10] Synchronizacja repozytorium (gałąź: $BRANCH)"
git fetch origin
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 || git checkout -b "$BRANCH" "origin/$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
mkdir -p "$APP_DIR/logs"

log "[3/10] backend/.env — kontrola"
if [ ! -f "$BACKEND/.env" ]; then
  die "Brak $BACKEND/.env. Skopiuj backend/.env.example, ustaw wartości (sekrety po rotacji!) i uruchom ponownie."
fi

log "[4/10] Zależności (zgodnie z lockfile)"
if npm ci; then
  log "    npm ci OK"
else
  log "npm ci nie powiódł się (lockfile poza syncem po migracji) — npm install (regeneruje package-lock.json)"
  npm install
  log "    ⚠️  Odświeżony package-lock.json zacommituj po wdrożeniu:"
  log "       git add package-lock.json && git commit -m 'chore: regenerate package-lock.json (Node migration)'"
fi
( cd "$BACKEND" && npm ci )

log "[5/10] Prisma: generowanie klienta (bez migracji schematu)"
( cd "$BACKEND" && npx prisma generate )
log "    UWAGA: migracje schematu uruchamiaj świadomie i ręcznie:"
log "    cd backend && npx prisma migrate deploy   # lub: npx prisma db push (po sprawdzeniu skutków)"

log "[6/10] Backup poprzedniego buildu + build produkcyjny (Vite + Nitro)"
STAMP="$(date +%Y%m%d-%H%M%S)"
if [ -d "$APP_DIR/.output" ]; then
  cp -a "$APP_DIR/.output" "$APP_DIR/.output.bak-$STAMP"
  log "    zapisano kopię: .output.bak-$STAMP"
fi
npm run build
[ -f "$APP_DIR/.output/server/index.mjs" ] || die "Build nie wygenerował .output/server/index.mjs — wstrzymuję wdrożenie"
log "    .output/server/index.mjs OK"

log "[7/10] Smoke-test artefaktów (przed przełączeniem PM2)"
SMOKE_ALLOW_OFFLINE=1 node scripts/smoke-test.mjs || die "Smoke-test artefaktów nie przeszedł — wstrzymuję wdrożenie"

if [ "${DEPLOY_NGINX:-0}" = "1" ]; then
  log "[7b] Nginx: instalacja konfiguracji + test + reload"
  sudo cp "$BACKEND/nginx/purrepets.conf" /etc/nginx/sites-available/purrepets
  sudo ln -sf /etc/nginx/sites-available/purrepets /etc/nginx/sites-enabled/purrepets
  sudo nginx -t
  sudo systemctl reload nginx
fi

log "[8/10] PM2: startOrReload (bez usuwania działających procesów)"
pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env
pm2 save

log "[9/10] Health checki (realne odpowiedzi HTTP)"
sleep 3
front_ok=0; api_ok=0
for _ in 1 2 3 4 5 6; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "$FRONT_URL/" || true)"
  [ "$code" = "200" ] && { front_ok=1; break; }
  sleep 2
done
for _ in 1 2 3 4 5 6; do
  body="$(curl -s "$API_HEALTH" || true)"
  echo "$body" | grep -q '"ok":true' && { api_ok=1; break; }
  sleep 2
done
log "    frontend $FRONT_URL → ok=$front_ok, backend $API_HEALTH → ok=$api_ok"

if [ "$front_ok" = "1" ] && [ "$api_ok" = "1" ]; then
  log "[10/10] Pełny smoke-test HTTP (SSR, routing, statyki) + sprzątanie backupów"
  node scripts/smoke-test.mjs || log "    ⚠️ smoke-test HTTP zgłosił problemy — sprawdź wyniki powyżej"
  ls -1dt "$APP_DIR"/.output.bak-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
  log "✅ Wdrożenie zakończone. Logi: pm2 logs purrepets-frontend purrepets-backend --lines 100 --nostream"
  exit 0
fi

log "❌ Health check nie przeszedł — ROLLBACK do poprzedniej wersji"
latest_bak="$(ls -1dt "$APP_DIR"/.output.bak-* 2>/dev/null | head -1 || true)"
if [ -n "$latest_bak" ]; then
  rm -rf "$APP_DIR/.output"
  cp -a "$latest_bak" "$APP_DIR/.output"
  pm2 reload purrepets-frontend --update-env || pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env
  log "Rollback z $latest_bak wykonany — sprawdź logi:"
else
  log "Brak backupu do rollbacku — sprawdź logi:"
fi
pm2 logs purrepets-frontend --lines 50 --nostream || true
pm2 logs purrepets-backend  --lines 50 --nostream || true
exit 1
