#!/usr/bin/env bash
# Naprawa uprawnień PostgreSQL dla PURRE PETS (błąd 42501) i weryfikacja połączenia.
set -euo pipefail

DB_NAME="${DB_NAME:-purrepets}"
DB_USER="${DB_USER:-postgres}"

echo "==> [1/3] Naprawiam uprawnienia schematu public (42501)…"
sudo -u postgres psql -d "$DB_NAME" -f "$(dirname "$0")/fix-db-perms.sql"

echo "==> [2/3] Weryfikuję zapis (CREATE TABLE + INSERT + DROP)…"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS _perm_check (id int); INSERT INTO _perm_check VALUES (1); DROP TABLE _perm_check;"

echo "==> [3/3] OK — aplikacja może migrować i zapisywać. Restart PM2:"
pm2 restart purrepets-backend --update-env || true
