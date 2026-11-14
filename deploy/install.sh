#!/usr/bin/env bash
# ============================================================================
# PURRE PETS — instalacja produkcyjna na Oracle Cloud (Ubuntu 24.04, 6 GB RAM)
# Idempotentny: można uruchamiać wielokrotnie. Domena: bengos.pl
# Użycie:  curl -fsSL https://raw.githubusercontent.com/axelgadomski420/Base44/feature/purre-pets/deploy/install.sh | bash
# ============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/axelgadomski420/Base44.git}"
REPO_BRANCH="${REPO_BRANCH:-feature/purre-pets}"
APP_DIR="${APP_DIR:-/opt/purre-pets}"
ETC_DIR="/etc/purrepets"
WEB_ROOT="/var/www/purre-pets"
DB_NAME="${DB_NAME:-purrepets}"
DB_USER="${DB_USER:-purre}"
DOMAIN="${DOMAIN:-bengos.pl}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

log() { echo -e "\033[1;35m[PURRE]\033[0m $*"; }

[[ $EUID -eq 0 ]] || { echo "Uruchom jako root (sudo)."; exit 1; }

# --- 1. Pakiety systemowe ---------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
log "Instaluję pakiety systemowe…"
apt-get update -qq
apt-get install -y -qq \
  openjdk-17-jdk-headless maven mysql-server redis-server nginx \
  certbot python3-certbot-nginx git curl unzip \
  ffmpeg tesseract-ocr tesseract-ocr-pol tesseract-ocr-eng poppler-utils \
  python3 python3-venv ufw > /dev/null

# --- 2. Node 20 --------------------------------------------------------------
if ! command -v node >/dev/null || [[ "$(node -v | cut -dv -f2)" != 20.* ]]; then
  log "Instaluję Node 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
  apt-get install -y -qq nodejs > /dev/null
fi

# --- 3. Kod źródłowy ----------------------------------------------------------
log "Pobieram kod ($REPO_BRANCH)…"
if [[ -d $APP_DIR/.git ]]; then
  git -C "$APP_DIR" fetch origin "$REPO_BRANCH" --quiet
  git -C "$APP_DIR" checkout -q "$REPO_BRANCH"
  git -C "$APP_DIR" reset -q --hard "origin/$REPO_BRANCH"
else
  git clone -q --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
fi

# --- 4. Sekrety i konfiguracja ------------------------------------------------
mkdir -p "$ETC_DIR" /var/lib/purre-pets/uploads /var/lib/purre-pets/documents /var/backups/purrepets
ENV_FILE="$ETC_DIR/purre.env"
if [[ ! -f $ENV_FILE ]]; then
  log "Generuję sekrety…"
  DB_PASSWORD="$(openssl rand -hex 16)"
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  DOC_KEY="$(openssl rand -base64 32 | tr -d '\n')"
  cat > "$ENV_FILE" <<EOF
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
DOCUMENTS_ENCRYPTION_KEY=$DOC_KEY
UPLOAD_DIR=/var/lib/purre-pets/uploads
DOCUMENT_DIR=/var/lib/purre-pets/documents
AI_SERVICE_URL=http://127.0.0.1:8100
APP_FRONTEND_URL=https://$DOMAIN
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
# Wpisz klucze Stripe (dashboard → Developers → API keys / Webhooks):
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CERTBOT_EMAIL=$CERTBOT_EMAIL
EOF
  chmod 600 "$ENV_FILE"
fi
set -a; source "$ENV_FILE"; set +a

# --- 5. MySQL -------------------------------------------------------------------
log "Konfiguruję MySQL…"
mysql --defaults-extra-file=<(printf '[client]\nuser=root\nsocket=/var/run/mysqld/mysqld.sock\n') <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

# --- 6. Redis --------------------------------------------------------------------
systemctl enable --now redis-server >/dev/null 2>&1 || true

# --- 7. AI service (FastAPI + Ollama) ----------------------------------------------
log "Instaluję Ollama + Qwen2.5 3B…"
if ! command -v ollama >/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh > /dev/null 2>&1
fi
systemctl enable --now ollama >/dev/null 2>&1 || true
# Model pobierany w tle — nie blokuje instalacji (ok. 2 GB)
(ollama list | grep -q "qwen2.5:3b-instruct") || nohup ollama pull qwen2.5:3b-instruct >/var/log/ollama-pull.log 2>&1 &

log "Instaluję AI service (FastAPI)…"
python3 -m venv /opt/purre-ai-venv
/opt/purre-ai-venv/bin/pip install -q --upgrade pip
/opt/purre-ai-venv/bin/pip install -q -r "$APP_DIR/ai-service/requirements.txt"

cat > /etc/systemd/system/bengos-ai.service <<EOF
[Unit]
Description=PURRE PETS AI Service (FastAPI + OCR + LLM)
After=network.target ollama.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR/ai-service
ExecStart=/opt/purre-ai-venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8100
Restart=always
RestartSec=5
Environment=OLLAMA_URL=http://127.0.0.1:11434
Environment=OLLAMA_MODEL=qwen2.5:3b-instruct
Environment=REDIS_URL=redis://127.0.0.1:6379/1
# Limit RAM dla AI (Ollama + FastAPI) — serwer 6 GB
MemoryMax=3G

[Install]
WantedBy=multi-user.target
EOF

# --- 8. Backend Spring Boot ---------------------------------------------------------
log "Buduję backend Spring Boot…"
cd "$APP_DIR/spring-backend"
mvn -q -DskipTests package
JAR="$(ls -t target/*.jar | head -1)"

cat > /etc/systemd/system/bengos.service <<EOF
[Unit]
Description=PURRE PETS Backend (Spring Boot)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR/spring-backend
ExecStart=/usr/bin/java -Xms256m -Xmx1536m -jar $JAR --spring.profiles.active=prod
Restart=always
RestartSec=5
EnvironmentFile=$ENV_FILE

[Install]
WantedBy=multi-user.target
EOF

# --- 9. Frontend Angular --------------------------------------------------------------
log "Buduję frontend Angular…"
cd "$APP_DIR/frontend"
npm ci --silent || npm install --silent
npm run build -- --configuration production
rm -rf "$WEB_ROOT"
mkdir -p "$WEB_ROOT"
cp -r dist/purre-pets/browser/* "$WEB_ROOT"/ 2>/dev/null || cp -r dist/purre-pets/* "$WEB_ROOT"/

# --- 10. Nginx --------------------------------------------------------------------------
log "Konfiguruję Nginx…"
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/purre-pets
sed -i "s/bengos.pl/$DOMAIN/g; s|/var/www/purre-pets|$WEB_ROOT|g" /etc/nginx/sites-available/purre-pets
ln -sf /etc/nginx/sites-available/purre-pets /etc/nginx/sites-enabled/purre-pets
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# --- 11. Firewall — tylko SSH, 80 i 443 ---------------------------------------------------
log "Konfiguruję firewall (ufw)…"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

# --- 12. TLS (Certbot) — tylko gdy DNS już wskazuje na serwer ------------------------------
if [[ -n "$CERTBOT_EMAIL" ]] && dig +short "$DOMAIN" | grep -q .; then
  log "Wystawiam certyfikat Let's Encrypt…"
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" || \
    log "Certbot nie powiódł się — sprawdź DNS (A @ i www → 92.5.154.243) i uruchom ponownie."
else
  log "Pomijam Certbot (brak CERTBOT_EMAIL lub DNS). Skonfiguruj Cloudflare SSL Full (strict) lub uruchom ponownie z CERTBOT_EMAIL."
fi

# --- 13. Backupy (cron: codziennie 3:00) ----------------------------------------------------
cat > /usr/local/bin/purre-backup.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
source /etc/purrepets/purre.env
STAMP=$(date +%F_%H%M)
mysqldump --single-transaction "${DB_NAME}" | gzip > "/var/backups/purrepets/db-${STAMP}.sql.gz"
tar -czf "/var/backups/purrepets/uploads-${STAMP}.tar.gz" /var/lib/purre-pets/uploads 2>/dev/null || true
find /var/backups/purrepets -name '*.gz' -mtime +7 -delete
EOF
chmod +x /usr/local/bin/purre-backup.sh
cat > /etc/cron.d/purre-backup <<'EOF'
0 3 * * * root /usr/local/bin/purre-backup.sh
EOF

# --- 14. Start -------------------------------------------------------------------------------
log "Uruchamiam usługi…"
systemctl daemon-reload
systemctl enable --now bengos-ai.service
systemctl enable --now bengos.service

log "✅ PURRE PETS zainstalowany."
log "   Frontend:  https://$DOMAIN  (po konfiguracji DNS/Cloudflare)"
log "   API:       https://$DOMAIN/api/health"
log "   AI health: http://127.0.0.1:8100/health (tylko lokalnie)"
log "   Konfiguracja: $ENV_FILE  — uzupełnij STRIPE_SECRET_KEY i STRIPE_WEBHOOK_SECRET."
log "   Po zmianie sekretów: systemctl restart bengos.service bengos-ai.service"
