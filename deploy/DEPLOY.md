# DEPLOY — PURRE PETS na Oracle Cloud (bengos.pl)

Serwer: Oracle Cloud, Ubuntu 24.04, 1 OCPU / 6 GB RAM, IP `92.5.154.243`.

## 1. DNS

W panelu DNS domeny `bengos.pl` ustaw rekordy A:

| Typ | Nazwa | Wartość      | TTL  |
|-----|-------|--------------|------|
| A   | @     | 92.5.154.243 | 300  |
| A   | www   | 92.5.154.243 | 300  |

## 2. Cloudflare

1. Dodaj domenę do Cloudflare, serwery DNS wg instrukcji Cloudflare.
2. **SSL/TLS → Overview:** tryb **Full (strict)**.
3. **SSL/TLS → Edge Certificates:** Always Use HTTPS: ON; HSTS: ON (po sprawdzeniu, że wszystko działa na HTTPS).
4. **DNS:** rekordy A `@` i `www` z **proxy ON** (pomarańczowa chmurka).
5. **Security → WAF:** włącz managed rules; **Rate limiting:** np. 100 żądań/min na `/api/auth/*`.
6. **Caching:** Cache Everything dla statycznych plików `*.js`, `*.css`, obrazów; bypass dla `/api/*`.
7. **Network:** WebSockets: ON (dla BENGOS Messenger / STOMP).

## 3. Instalacja — jedna komenda

Na świeżym Ubuntu 24.04 jako root:

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/Base44/feature/purre-pets/deploy/install.sh | bash
```

Skrypt jest **idempotentny** — można go uruchamiać ponownie (np. po zmianie DNS, aby dokończyć Certbot).

Co instaluje: Java 17, Maven, MySQL 8, Node 20, Nginx, Certbot, Redis, Ollama + `qwen2.5:3b-instruct`,
FastAPI (ai-service), buduje backend i frontend, konfiguruje systemd, Nginx, firewall (tylko 22/80/443) i backupy.

## 4. Po instalacji

```bash
# Sekrety i konfiguracja (uzupełnij Stripe!):
nano /etc/purrepets/purre.env

# Restart po zmianach:
systemctl restart bengos.service bengos-ai.service

# Status i logi:
systemctl status bengos bengos-ai ollama
journalctl -u bengos -f
journalctl -u bengos-ai -f
```

### Stripe

1. Dashboard → Developers → API keys → wklej `STRIPE_SECRET_KEY`.
2. Developers → Webhooks → dodaj endpoint `https://bengos.pl/api/stripe/webhook`
   z eventami `checkout.session.completed`, `checkout.session.expired`.
3. Skopiuj signing secret do `STRIPE_WEBHOOK_SECRET` i zrestartuj backend.
4. Lokalny test: `stripe listen --forward-to localhost:8080/stripe/webhook`.

### AI (Ollama)

Model `qwen2.5:3b-instruct` pobiera się w tle (`/var/log/ollama-pull.log`). Sprawdź:

```bash
ollama list                 # powinno pokazać qwen2.5:3b-instruct
curl -s http://127.0.0.1:8100/health
```

## 5. Architektura portów

| Usługa          | Port    | Dostęp          |
|-----------------|---------|-----------------|
| Nginx           | 80/443  | publiczny       |
| Spring Boot API | 8080    | tylko localhost |
| AI FastAPI      | 8100    | tylko localhost |
| MySQL           | 3306    | tylko localhost |
| Redis           | 6379    | tylko localhost |
| Ollama          | 11434   | tylko localhost |

## 6. Backups

Codziennie 3:00 (cron `/etc/cron.d/purre-backup`): zrzut MySQL + uploady do
`/var/backups/purrepets`, retencja 7 dni.

## 7. Aktualizacja aplikacji

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/Base44/feature/purre-pets/deploy/install.sh | bash
```
(install.sh zrobi git pull, rebuild i restart bez utraty danych)
