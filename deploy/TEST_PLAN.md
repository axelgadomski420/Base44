# PLAN TESTÓW — PURRE PETS

## 1. Backend — testy jednostkowe

```bash
cd spring-backend && mvn test
```

- [ ] `CoinServiceTest` — ledger: earn/spend, idempotencja, brak salda ujemnego.

## 2. migracje Flyway

```bash
mvn -q -DskipTests package && java -jar target/*.jar --spring.profiles.active=prod
```

- [ ] V1–V5 aplikują się na pustej bazie bez błędów (`ddl-auto=validate` przechodzi).

## 3. API — scenariusze E2E (curl / Postman)

### Rejestracja i role
- [ ] POST `/api/auth/register` rola BUYER → 200, token.
- [ ] POST `/api/auth/register` rola BREEDER → 200, token; konto bez badge.
- [ ] Rejestracja bez `rodoConsent` → 400.
- [ ] POST `/api/auth/login` błędne hasło → 401.
- [ ] Rate limiting: 6. logowanie w minucie → 429.

### Weryfikacja hodowcy
- [ ] POST `/api/verification` (multipart data+files, 3 pliki) → status PENDING.
- [ ] 2 pliki → 400 (minimum 3).
- [ ] GET `/api/verification/me` → dane + riskScore AI (lub fallback AI_FALLBACK).
- [ ] GET `/api/verification/documents/{id}` jako owner → 200 plik; jako inny user → 403; wpis w access logu.
- [ ] POST `/api/admin/verifications/{id}/decision` APPROVED → badge użytkownika = true.
- [ ] REJECTED bez powodu → 400; z powodem → status REJECTED.
- [ ] POST `/api/verification/appeal` po REJECTED → status ponownie w kolejce.
- [ ] Retencja: dokumenty mają `purge_after` = decyzja + 30 dni; scheduler o 4:00 usuwa wygasłe.

### PURRE Coins + Stripe
- [ ] GET `/api/coins/wallet` → saldo 0 + 4 pakiety (100/500/1000/5000).
- [ ] POST `/api/coins/purchase` bez STRIPE_SECRET_KEY → 503 z polskim komunikatem.
- [ ] Ze kluczem: → `checkoutUrl`; webhook `checkout.session.completed` → saldo += coins, transakcja COMPLETED.
- [ ] Duplikat webhooka (ten sam event id) → brak podwójnego zasilenia (idempotencja).
- [ ] Webhook z błędnym podpisem → 400.
- [ ] GET `/api/purchases/me` → historia; e-mail potwierdzający wysłany (log, gdy SMTP wyłączony).

### Ogłoszenia
- [ ] POST `/api/listings` jako BUYER → 403.
- [ ] Jako BREEDER bez APPROVED → 403 NOT_VERIFIED.
- [ ] Jako zweryfikowany: 5 zdjęć → 400 (min. 6); 6 zdjęć + saldo 50 → 201, saldo = 0.
- [ ] Saldo 49 → 402 INSUFFICIENT_COINS.
- [ ] 21 zdjęć → 400; 4 wideo → 400.
- [ ] GET `/api/listings?lat&lng&radiusKm` → wyniki posortowane po odległości (Haversine), wyróżnione najpierw.
- [ ] POST `/{id}/feature` (100) → featuredUntil +7 dni; `/boost-profile` (200) → boostedUntil +24 h.
- [ ] PATCH `/{id}/sold`, DELETE `/{id}` cudzego ogłoszenia → 403.

### Arcade (anti-cheat)
- [ ] POST `/arcade/scores` PURRE_2048 score 999999 → 400 SCORE_OUT_OF_RANGE.
- [ ] durationSeconds 0 → 400 DURATION_OUT_OF_RANGE.
- [ ] Wynik poprawny → coins 10–50, XP; dzienny cap 300 → nadwyżka 0 coins (dailyCapReached=true).
- [ ] POST `/arcade/daily` 2× → drugi raz 409 ALREADY_CLAIMED; streak rośnie dziennie.
- [ ] GET `/arcade/leaderboard` → TOP 10 z bonusem tygodniowym.

### Reklamy
- [ ] POST `/ads/sponsored` (50) → kampania 24 h; GET `/ads/serve` → rotacja z oznaczeniem SPONSORED.
- [ ] Kampania 200 coins → 7 dni.

## 4. Frontend (Angular)

- [ ] `ng build` prod — bez błędów (budgets, fileReplacements environment.prod).
- [ ] Rejestracja BREEDER → przekierowanie na /verification; BUYER → /discover.
- [ ] Dolne menu: Discover | Explore | Dodaj | Messenger | Arcade | Profil.
- [ ] Add listing: drag&drop, licznik 6–20 zdjęć, podgląd, usuwanie; błąd INSUFFICIENT_COINS → modal → /wallet.
- [ ] Wallet: pakiety → Stripe Checkout redirect; po powrocie saldo zaktualizowane.
- [ ] Verification: upload, statusy PENDING/APPROVED/REJECTED, pobieranie dokumentu, odwołanie.
- [ ] Admin: kolejka PENDING, podgląd risk score, zatwierdź/odrzuć z powodem.
- [ ] Arcade: PURRE 2048 (strzałki + przyciski), dzienny bonus, ranking.
- [ ] Motywy: 8 motywów przełączają się natychmiast; język pl/en przełącza teksty.
- [ ] RWD: 360 px, 768 px, 1440 px.

## 5. Infrastruktura (Oracle)

- [ ] `install.sh` uruchomiony 2× — bez błędów (idempotencja).
- [ ] `ufw status` → tylko 22/80/443 open; 8080/8100/3306/6379/11434 niedostępne z zewnątrz.
- [ ] `https://bengos.pl` → aplikacja; `https://bengos.pl/api/health` → 200.
- [ ] Cloudflare: SSL Full (strict) działa, WebSockets ON, cache statyk HIT.
- [ ] `systemctl status bengos bengos-ai` → active (running); restart serwera → usługi wracają.
- [ ] Backup: `/var/backups/purrepets/db-*.sql.gz` istnieje; restore na testowej bazie działa.
- [ ] Certbot: certyfikat ważny; `certbot renew --dry-run` OK.
