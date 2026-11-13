# PURRE PETS â Backend (zamiennik Base44) â instrukcja wdroÅ¼enia na Oracle Cloud

Samodzielny backend zastÄpujÄcy platformÄ Base44 dla aplikacji PURRE PETS.
Stack: **Node.js 22 LTS Â· Express Â· PostgreSQL Â· Prisma Â· JWT Â· bcrypt Â· Multer Â· Socket.IO Â· Zod Â· PM2**.

- Backend nasÅuchuje wyÅÄcznie lokalnie na `http://127.0.0.1:4000` (port 4000 NIE jest otwarty w Oracle Security List).
- Publiczny dostÄp wyÅÄcznie przez Nginx: `http://92.5.154.243/api` oraz `https://purrepets.pl/api`.
- Frontend (Vite/React) dziaÅa na `127.0.0.1:5173`, Nginx serwuje go pod `/`.

## 1. ZaleÅ¼noÅci systemowe (Ubuntu 24.04)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx postgresql postgresql-contrib

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x

# PM2
sudo npm install -g pm2
```

## 2. Baza danych PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER purre WITH PASSWORD 'purre_secret';
CREATE DATABASE purrepets OWNER purre;
GRANT ALL PRIVILEGES ON DATABASE purrepets TO purre;
SQL
```

> Ustaw wÅasne, silne hasÅo i wpisz je w `.env` (`DATABASE_URL`).

## 3. Instalacja backendu

```bash
sudo mkdir -p /var/www/purrepets-backend
sudo chown $USER /var/www/purrepets-backend
git clone <twoje-repo-backendu> /var/www/purrepets-backend
cd /var/www/purrepets-backend

cp .env.example .env
nano .env   # ustaw JWT_SECRET (openssl rand -hex 48), DATABASE_URL, CORS_ORIGINS

npm install
npx prisma generate
```

## 4. Migracje Prisma

```bash
# produkcyjnie:
npx prisma migrate deploy

# (przy rozwoju: npx prisma migrate dev --name init)
```

## 5. Test lokalny

```bash
npm start
# w drugim terminalu:
curl http://127.0.0.1:4000/api/health
# â {"ok":true,"now":"..."}
```

## 6. PM2 (produkcja, autostart po restarcie serwera)

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # wykonaj wyÅwietlonÄ komendÄ sudo
pm2 logs purrepets-backend
pm2 restart purrepets-backend   # po zmianach
```

## 7. Nginx

```bash
sudo cp nginx/purrepets.conf /etc/nginx/sites-available/purrepets
sudo ln -sf /etc/nginx/sites-available/purrepets /etc/nginx/sites-enabled/purrepets
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/purrepets-backend/uploads
sudo chown www-data:www-data /var/www/purrepets-backend/uploads
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS dla `purrepets.pl`:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d purrepets.pl -d www.purrepets.pl
# nastÄpnie odkomentuj blok 443 w konfiguracji (certbot moÅ¼e zrobiÄ to automatycznie)
```

## 8. Firewall / Oracle Security List

W konsoli Oracle Cloud otwÃ³rz ingress tylko dla TCP 80 i 443. Na serwerze:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Nie otwieraj portu 4000** â backend ma byÄ osiÄgalny tylko przez Nginx (`127.0.0.1:4000`).

## Opis dziaÅania

### Autoryzacja

- `POST /api/auth/register` â tworzy konto (hasÅo: bcrypt, koszt 12) i wysyÅa 6-cyfrowy kod OTP.
  Bez skonfigurowanego SMTP kod trafia do logÃ³w serwera (`pm2 logs`) i â poza produkcjÄ â
  do odpowiedzi API (`dev_otp`). Po dodaniu SMTP w `.env` kody lecÄ mailem (nodemailer).
- `POST /api/auth/verify-otp` â weryfikuje kod, zwraca `{ access_token, user }`.
- `POST /api/auth/login` â zwraca `{ access_token, user }` (JWT HS256, domyÅlnie 7 dni).
- `GET /api/auth/me` â dane zalogowanego (`Authorization: Bearer <token>`).
- `POST /api/auth/logout` â JWT jest bezstanowy; klient usuwa token po swojej stronie.
- `GET /api/auth/login-info` â shim kompatybilnoÅci dla `loadSignInOptions()` we frontendzie
  (Nginx aliasuje teÅ¼ starÄ ÅcieÅ¼kÄ `/api/apps/public/login-info/by-id/<appId>`).

### Encje (REST, prefiks `/api/entities`)

Encje: `Profile, Listing, Pet, Post, Comment, Like, Follow, Conversation, Message, Wallet, Redemption, GameScore`.

| Operacja | Endpoint | OdpowiedÅº |
| --- | --- | --- |
| list | `GET /api/entities/:entity/list?sort=&limit=&offset=` | `{ items: [...] }` |
| filter | `POST /api/entities/:entity/query` `{ where, sort, limit, offset }` | `{ items: [...] }` |
| count | `POST /api/entities/:entity/count` `{ where }` | liczba |
| get | `GET /api/entities/:entity/:id` | obiekt |
| create | `POST /api/entities/:entity` | obiekt (201) |
| update | `PATCH /api/entities/:entity/:id` | obiekt |
| delete | `DELETE /api/entities/:entity/:id` | `{ success: true }` |

- Filtry obsÅugujÄ operatory Base44: `=`, `$in`, `$nin`, `$regex`, `$ne`, `$gt/$gte/$lt/$lte`, `$or`.
  Dla pÃ³l tablicowych (`members`, `tags`, `image_urls`, â¦) rÃ³wnoÅÄ oznacza âtablica zawiera wartoÅÄâ.
- Sortowanie: `-created_date`, `price`, `-price`, `-followers`, `-score`, `-last_message_at`.
- Zasady dostÄpu odwzorowujÄ reguÅy RLS z `base44/entities/*.jsonc`:
  - odczyt publiczny: `Profile, Pet, Comment, Like, Follow, GameScore`;
  - `Post` â publicznie tylko `published` (+ wÅasne wpisy i admin);
  - `Listing` â publicznie `active`/`sold` (+ wÅasne i admin);
  - `Conversation`, `Message` â tylko czÅonkowie rozmowy;
  - `Wallet`, `Redemption` â tylko wÅaÅciciel;
  - zapis: wÅaÅciciel (`created_by_id`) lub admin; `Wallet`, `Redemption`, `GameScore` tworzone
    wyÅÄcznie przez dedykowane endpointy;
  - pola `Profile.followers` i `Profile.verified` aktualizuje tylko admin.
- Skutki uboczne (jak w aplikacji Base44): `Like` Â±1 do `Post.likes`, `Comment` +1 do
  `Post.comment_count`, `Follow` Â±1 do `Profile.followers`.

### Endpointy dedykowane (dawne funkcje serwerowe frontendu)

| Endpoint | ZastÄpuje |
| --- | --- |
| `POST /api/games/submit` | `submitScore` (limity wynikÃ³w, bonus dzienny, monety/XP, push portfela) |
| `POST /api/rewards/redeem` | `redeemReward` (wykup nagrÃ³d za coiny) |
| `POST /api/listings/with-cost` | `createListing` (tylko hodowca, pierwsze darmowe, potem 20 coinÃ³w) |
| `POST /api/listings/:id/moderate` | `moderateListing` (moderacja ryzyka â reguÅy lub opcjonalny LLM) |
| `POST /api/assistant/ask` | `askAssistant` (asystent â reguÅy lub opcjonalny LLM) |

### Upload plikÃ³w

`POST /api/uploads` (multipart, pole `file`, max 25 MB, obrazy i wideo) â `{ file_url }`.
Pliki trafiajÄ do `UPLOAD_DIR` i sÄ publicznie serwowane pod `/uploads/...`.

### Realtime (Socket.IO)

- Handshake: `io(API_URL, { auth: { token: "<JWT>" } })`.
- Klient wysyÅa `subscribe { room }` albo `subscribe { entity: "Message" | "Wallet" }`;
  dozwolone pokoje: `user:<swÃ³j id>` (portfel) oraz `conversation:<id>` (tylko czÅonkowie).
- Serwer emituje `entity:event` o strukturze `{ type: "create" | "update" | "delete", data }` â
  identycznej jak zdarzenia `base44.entities.*.subscribe`.

### BÅÄdy

SpÃ³jny format: `{ "error": { "message": "...", "code": "...", "details": ... } }`
z odpowiednim statusem HTTP (400/401/403/404/409/429/500).

## Uwagi

- **MFA**: frontend ma ÅcieÅ¼ki MFA (TOTP/SMS), ale ten backend ich nie wÅÄcza â logowanie
  zawsze zwraca `access_token`, wiÄc ÅcieÅ¼ka MFA w UI pozostaje nieaktywna (kompatybilne zachowanie).
- **Logowanie Google**: wymaga konfiguracji OAuth po stronie serwera; obecnie shim `login-info`
  zgÅasza brak providerÃ³w, a klient kieruje uÅ¼ytkownikÃ³w na `/login`. Przycisk Google warto ukryÄ.
- **LLM**: moderacja i asystent dziaÅajÄ na reguÅach; opcjonalnie podepnij dowolne API przez
  `MODERATION_LLM_URL` / `ASSISTANT_LLM_KEY` w `.env`.
- **Skalowanie Socket.IO**: przy wiÄcej niÅ¼ jednym procesie potrzebny adapter Redis
  (obecnie `instances: 1` w ecosystem.config.cjs).
