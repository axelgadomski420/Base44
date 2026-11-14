#!/usr/bin/env bash
# PURRE PETS — pełne wdrożenie produkcyjne (Oracle Ubuntu 24.04, PM2 + Nginx).
# Uruchomienie: sudo bash scripts/deploy.sh
set -euo pipefail

APP_DIR="/home/ubuntu/Base44"
BACKEND="$APP_DIR/backend"
NGINX_CONF="$BACKEND/nginx/purrepets.conf"

echo "==> [1/9] Synchronizacja repozytorium…"
cd "$APP_DIR"
git pull --ff-only

echo "==> [2/9] Zależności…"
npm ci --omit=dev=false
(cd "$BACKEND" && npm ci)

echo "==> [3/9] Naprawa uprawnień PostgreSQL (42501)…"
sudo -u postgres psql -d purrepets -f "$BACKEND/scripts/fix-db-perms.sql" || echo "  (pominięto — sprawdź nazwę bazy)"

echo "==> [4/9] Migracje Prisma…"
cd "$BACKEND"
npx prisma db push --skip-generate || npx prisma migrate deploy
npx prisma generate

echo "==> [5/9] Seed administratora (effdoa@gmail.com → ADMIN)…"
node scripts/seed-admin.js

echo "==> [6/9] Build frontendu (Vite/TanStack Start)…"
cd "$APP_DIR"
npm run build

echo "==> [7/9] Nginx: konfiguracja + test + reload…"
sudo cp "$NGINX_CONF" /etc/nginx/sites-available/purrepets
sudo ln -sf /etc/nginx/sites-available/purrepets /etc/nginx/sites-enabled/purrepets
sudo nginx -t && sudo systemctl reload nginx

echo "==> [8/9] PM2: restart z odświeżeniem środowiska…"
pm2 restart purrepets-backend --update-env || pm2 start "$BACKEND/ecosystem.config.cjs"
pm2 restart purrepets-frontend --update-env || pm2 start "$APP_DIR/ecosystem.config.cjs" --only purrepets-frontend
pm2 save

echo "==> [9/9] Weryfikacja zdrowia…"
sleep 3
curl -fsS http://127.0.0.1:4000/api/health && echo " ← backend OK"
curl -fsS -o /dev/null -w "frontend HTTP %{http_code}\n" http://127.0.0.1:3000/

echo ""
echo "✅ Wdrożenie zakończone. Logi: pm2 logs purrepets-backend --lines 50"
echo "   Webhook Stripe: https://purrepets.pl/api/stripe/webhook (eventy: checkout.session.completed, invoice.paid, customer.subscription.deleted)"
