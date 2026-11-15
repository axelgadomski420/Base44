#!/usr/bin/env bash
# PURRE PETS — bezpieczne wdrożenie produkcyjne (Oracle Ubuntu 24.04, ARM64, PM2 + Nginx).
# Frontend: TanStack Start SSR na Nitro → node .output/server/index.mjs (127.0.0.1:3000)
# Backend:  Express + Prisma + Socket.IO → backend/src/server.js (127.0.0.1:4000)
#
# Gwarancje:
#  - nie wykonuje git reset --hard ani git clean; przerywa się przy JAKIEJKOLWIEK lokalnej zmianie
#    (także plikach untracked — git status --short), nigdy ich nie nadpisuje,
#  - zależności WYŁĄCZNIE przez npm ci (npm install na produkcji jest zabroniony),
#  - NIE wykonuje destrukcyjnych operacji na bazie (prisma generate tylko; migracje ręcznie),
#  - NIE dotyka Dockera, kontenerów, wolumenów ani innych aplikacji (np. tikbengos),
#  - przed buildem zachowuje poprzednią wersję (.output.bak-*) i ecosystem.config.cjs,
#  - po restarcie PM2: health checki ORAZ pełny smoke-test HTTP — porażka czegokolwiek = ROLLBACK,
#  - rollback przywraca .output, ecosystem.config.cjs, konfigurację Nginx i proces legacy PM2,
#  - usuwa wyłącznie pliki utworzone przez ten skrypt (rotacja .output.bak-*; keep 3).
#
# Uruchomienie:  bash scripts/deploy.sh
# Opcjonalnie:   DEPLOY_BRANCH=main DEPLOY_NGINX=1 bash scripts/deploy.sh
set -euo pipefail

APP_DIR="/home/ubuntu/Base44"
BACKEND="$APP_DIR/backend"
BRANCH="${DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
FRONT_URL="${FRONT_URL:-http://127.0.0.1:3000}"
API_HEALTH="${API_HEALTH:-http://127.0.0.1:4000/api/health}"
NGINX_DEST="/etc/nginx/sites-available/purrepets"
OUR_PM2_APPS="purrepets-frontend purrepets-backend"

log() { echo "==> $*"; }
die() { echo "❌ $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || die "Node.js nie jest zainstalowany"
command -v pm2  >/dev/null 2>&1 || die "PM2 nie jest zainstalowany (npm i -g pm2)"
log "Node $(node -v), npm $(npm -v)"

# --- ROLLBACK ---------------------------------------------------------------
# Przywraca poprzedni działający stan: .output, ecosystem.config.cjs, Nginx, proces legacy.
# Nie usuwa bazy, uploadów, Dockera ani żadnych danych.
NGINX_INSTALLED=0
rollback() {
  log "❌ ROLLBACK — przywracanie poprzedniego stanu"
  pm2 delete purrepets-frontend >/dev/null 2>&1 || true
  pm2 delete purrepets-backend  >/dev/null 2>&1 || true
  latest_bak="$(ls -1dt "$APP_DIR"/.output.bak-* 2>/dev/null | head -1 || true)"
  if [ -n "$latest_bak" ]; then
    rm -rf "$APP_DIR/.output"
    cp -a "$latest_bak" "$APP_DIR/.output"
    log "  przywrócono .output z $latest_bak"
  else
    log "  ⚠️ brak backupu .output do przywrócenia"
  fi
  if [ -n "${ECO_BAK:-}" ] && [ -f "$ECO_BAK" ]; then
    cp -a "$ECO_BAK" "$APP_DIR/ecosystem.config.cjs"
    log "  przywrócono ecosystem.config.cjs z $ECO_BAK"
  fi
  if [ "$NGINX_INSTALLED" = "1" ] && [ -n "${NGINX_BAK:-}" ] && [ -f "$NGINX_BAK" ]; then
    sudo cp "$NGINX_BAK" "$NGINX_DEST" && sudo nginx -t && sudo systemctl reload nginx \
      && log "  przywrócono konfigurację Nginx z $NGINX_BAK" \
      || log "  ⚠️ nie udało się przywrócić Nginx — sprawdź ręcznie ($NGINX_BAK)"
  fi
  if [ -n "${LEGACY_APP:-}" ]; then
    pm2 restart "$LEGACY_APP" >/dev/null 2>&1 || true
    log "  wznowiono historyczny proces PM2: $LEGACY_APP"
  fi
  pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env >/dev/null 2>&1 || true
  pm2 save >/dev/null 2>&1 || true
  log "Stan przywrócony. Diagnostyka:"
  pm2 logs purrepets-frontend --lines 30 --nostream || true
  pm2 logs purrepets-backend  --lines 30 --nostream || true
  exit 1
}

cd "$APP_DIR"

log "[1/12] Czystość repozytorium (również pliki untracked)"
dirty="$(git status --short || true)"
if [ -n "$dirty" ]; then
  echo "$dirty"
  die "Repozytorium ma lokalne zmiany (także untracked). Zapisz je (commit / git stash / przenieś) — skrypt nigdy ich nie nadpisze."
fi

log "[2/12] Synchronizacja repozytorium (gałąź: $BRANCH)"
git fetch origin
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 || git checkout -b "$BRANCH" "origin/$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
dirty="$(git status --short || true)"
[ -z "$dirty" ] || { echo "$dirty"; die "Po pull nadal są lokalne zmiany — przerwanie."; }
mkdir -p "$APP_DIR/logs"

log "[3/12] backend/.env — kontrola"
[ -f "$BACKEND/.env" ] || die "Brak $BACKEND/.env. Skopiuj backend/.env.example i ustaw wartości (sekrety po rotacji!)."

log "[4/12] Zależności — wyłącznie npm ci (npm install na produkcji zabroniony)"
if ! npm ci; then
  die "npm ci (frontend) nie powiódł się — package-lock.json poza syncem z package.json.
      Zregeneruj lockfile w środowisku z npm (lokalnie lub CI): npm install --package-lock-only,
      zacommituj package-lock.json i spróbuj ponownie. NIE używaj --force ani --legacy-peer-deps."
fi
if ! ( cd "$BACKEND" && npm ci ); then
  die "npm ci (backend) nie powiódł się — sprawdź backend/package-lock.json."
fi

log "[5/12] Prisma: generowanie klienta (BEZ migracji i bez db push)"
( cd "$BACKEND" && npx prisma generate )
log "    Migracje schematu uruchamiaj świadomie i ręcznie:"
log "      cd backend && npx prisma migrate deploy"

log "[6/12] Backup poprzedniego stanu (.output + ecosystem.config.cjs)"
STAMP="$(date +%Y%m%d-%H%M%S)"
if [ -d "$APP_DIR/.output" ]; then
  cp -a "$APP_DIR/.output" "$APP_DIR/.output.bak-$STAMP"
  log "    zapisano: .output.bak-$STAMP"
fi
ECO_BAK=""
if [ -f "$APP_DIR/ecosystem.config.cjs" ]; then
  ECO_BAK="$APP_DIR/ecosystem.config.bak-$STAMP"
  cp -a "$APP_DIR/ecosystem.config.cjs" "$ECO_BAK"
  log "    zapisano: $(basename "$ECO_BAK")"
fi

log "[7/12] Build produkcyjny (Vite + Nitro)"
npm run build
[ -f "$APP_DIR/.output/server/index.mjs" ] || die "Build nie wygenerował .output/server/index.mjs — wstrzymuję wdrożenie"
log "    .output/server/index.mjs OK"

log "[8/12] Smoke-test artefaktów (przed przełączeniem PM2)"
SMOKE_ALLOW_OFFLINE=1 node scripts/smoke-test.mjs || die "Smoke-test artefaktów nie przeszedł — wstrzymuję wdrożenie (PM2 nietknięty)"

log "[9/12] PM2: migracja historycznego procesu + startOrReload"
# Wykryj historyczne procesy (np. 'purrepet') kolidujące z naszymi portami/nazwami.
LEGACY_APP="$(pm2 jlist 2>/dev/null | node -e '
let d="";process.stdin.on("data",(c)=>d+=c).on("end",()=>{
  try{
    const apps=JSON.parse(d);
    const ours=new Set(["purrepets-frontend","purrepets-backend"]);
    const hits=apps.filter((a)=>!ours.has(a.name)&&(
      /^purrepet/i.test(a.name||"")||
      [3000,4000].includes(Number((a.pm2_env&&a.pm2_env.env&&a.pm2_env.env.PORT)??(a.env&&a.env.PORT)??-1))
    ));
    console.log(hits.map((a)=>a.name).join(","));
  }catch(e){console.log("");}
});')"
if [ -n "$LEGACY_APP" ]; then
  log "    wykryto historyczny proces PM2: $LEGACY_APP — zatrzymuję (zwolnienie portu 3000/4000)"
  # Zatrzymanie (nie usunięcie!) — w razie rollbacku proces wróci przez pm2 restart.
  IFS=',' read -ra LEGACY_LIST <<< "$LEGACY_APP"
  for la in "${LEGACY_LIST[@]}"; do pm2 stop "$la" || true; done
  unset IFS
fi
pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env
pm2 save

log "[10/12] Health checki (realne odpowiedzi HTTP)"
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
[ "$front_ok" = "1" ] && [ "$api_ok" = "1" ] || rollback

log "[11/12] Pełny smoke-test HTTP (SSR /, routing /login, statyki /robots.txt, /api/health)"
# Porażka JAKIEGOKOLWIEK testu = nieudane wdrożenie → rollback.
node scripts/smoke-test.mjs || rollback

log "[12/12] Sukces: usunięcie zatrzymanego procesu legacy + rotacja backupów"
if [ -n "$LEGACY_APP" ]; then
  IFS=',' read -ra LEGACY_LIST <<< "$LEGACY_APP"
  for la in "${LEGACY_LIST[@]}"; do pm2 delete "$la" || true; done
  unset IFS
  pm2 save
  log "    usunięto historyczny proces PM2: $LEGACY_APP (port zwolniony trwale)"
fi
ls -1dt "$APP_DIR"/.output.bak-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
log "✅ Wdrożenie zakończone. Logi: pm2 logs purrepets-frontend purrepets-backend --lines 100 --nostream"
exit 0

# --- Opcjonalna instalacja Nginx (DEPLOY_NGINX=1) — patrz docs/NODE-MIGRATION.md -------------
# Aby przenieść powyższy blok do skryptu, wstaw przed [9/12]:
#   sudo cp "$BACKEND/nginx/purrepets.conf" /etc/nginx/sites-available/purrepets
#   sudo ln -sf ... && sudo nginx -t && sudo systemctl reload nginx
# Pełna wersja z preflightem certyfikatów/duplikatów/ścieżek: scripts/deploy-nginx.sh
