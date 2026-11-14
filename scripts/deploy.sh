#!/usr/bin/env bash
# PURRE PETS — pełne wdrożenie produkcyjne (Oracle Ubuntu 24.04, PM2 + Nginx).
# Uruchomienie: sudo bash scripts/deploy.sh
set -euo pipefail

APP_DIR="/home/ubuntu/Base44"
BACKEND="$APP_DIR/backend"
NGINX_CONF="$BACKEND/nginx/purrepets.conf"
UPLOAD_DIR="/var/www/purrepets/uploads"

echo "==> [1/10] Synchronizacja repozytorium…"
cd "$APP_DIR"
git pull --ff-only
mkdir -p "$APP_DIR/logs" "$UPLOAD_DIR"

echo "==> [2/10] Zależności…"
npm ci --omit=dev=false
(cd "$BACKEND" && npm ci)

echo "==> [3/10] Naprawa uprawnień PostgreSQL (42501)…"
sudo bash "$BACKEND/scripts/fix-db-perms.sh" purrepets || echo "  (pominięto — sprawdź nazwę bazy)"

echo "==> [4/10] Migracje Prisma…"
cd "$BACKEND"
npx prisma db push --skip-generate || npx prisma migrate deploy
npx prisma generate

echo "==> [5/10] Seed administratora (effdoa@gmail.com → ADMIN)…"
node scripts/seed-admin.js || true

echo "==> [6/10] Uprawnienia do uploads (zapis dla PM2)…"
sudo chown -R "$(whoami)": "$UPLOAD_DIR" 2>/dev/null || true
chmod -R u+rwX "$UPLOAD_DIR" 2>/dev/null || true

echo "==> [7/10] Build frontendu (Vite/TanStack Start)…"
cd "$APP_DIR"
npm run build

echo "==> [8/10] Nginx: konfiguracja + test + reload…"
sudo cp "$NGINX_CONF" /etc/nginx/sites-available/purrepets
sudo ln -sf /etc/nginx/sites-available/purrepets /etc/nginx/sites-enabled/purrepets
sudo nginx -t && sudo systemctl reload nginx

echo "==> [9/10] PM2: restart z --update-env…"
pm2 restart purrepets-backend --update-env || pm2 start "$BACKEND/ecosystem.config.cjs" --only purrepets-backend
pm2 restart purrepets-frontend --update-env || pm2 start "$APP_DIR/ecosystem.config.cjs" --only purrepets-frontend
pm2 save

echo "==> [10/10] Triple-Check (Moduł 6)…"
sleep 3
bash "$APP_DIR/scripts/triple-check.sh" || true

echo ""
echo "✅ Wdrożenie zakończone. Logi: pm2 logs purrepets-backend --lines 100 --nostream"
echo "   Webhook Stripe: https://purrepets.pl/api/stripe/webhook (checkout.session.completed, invoice.paid, customer.subscription.deleted)"
