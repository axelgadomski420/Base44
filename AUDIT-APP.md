# AUDYT APLIKACJI PURRE PETS — stan po Fazie 1

Data: 2026-11-14 · Zakres: spring-backend, frontend, ai-service, deploy · Metoda: przegląd kodu plik po pliku.

## 1. Podsumowanie wykonawcze

Aplikacja jest **architekturalnie spójna** (Angular 18 standalone + Spring Boot 3.5 + MySQL/Flyway + FastAPI),
ale audyt wykazał **1 błąd krytyczny, 4 luki średnie i szereg braków funkcjonalnych** z roadmapy faz 2–4.
Wszystkie pozycje z tej listy dostają poprawki w commitach tego cyklu (patrz §5).

## 2. Błędy krytyczne

| # | Problem | Plik | Skutek | Naprawa |
|---|---------|------|--------|---------|
| K1 | `MediaController.upload` zwraca **ścieżkę systemową** (`/opt/.../uploads/media/...`) jako `url`, która trafia do DB i `<img src>` | listing/MediaController, common/StorageService | Zdjęcia/wideo nie wyświetlają się w przeglądarce | `storeMedia` zwraca web-path `/api/media/RRRR/MM/plik`; handler `/media/**` serwuje katalog; dodany proxy dev |

## 3. Luki bezpieczeństwa / poprawności

| # | Problem | Naprawa |
|---|---------|---------|
| Ś1 | Brak roli **MODERATOR** — moderacja zgłoszeń niemożliwa, admin robi wszystko | Role + `MODERATOR`, migracja V6 (aktualizacja CHECK), panel moderatora |
| Ś2 | Brak edycji profilu (avatar, bio, socials) — `User` ma kolumny, ale zero endpointów | `ProfileController`: PATCH `/users/me`, avatar upload, zmiana hasła, eksport RODO |
| Ś3 | Reklamy dla użytkowników PREMIUM nie są wyłączane (fazowy wymóg „Premium = bez reklam") | `AdService.serve` pomija premium; `premium_until` w V6 |
| Ś4 | WebSocket /ws bez uwierzytelnienia STOMP — każdy mógł subskrybować tematy | `AuthChannelInterceptor`: token JWT z nagłówka CONNECT |

## 4. Stan modułów (audyt funkcjonalny)

| Moduł | Stan przed audytem | Decyzja |
|-------|--------------------|---------|
| Auth + role | ✅ OK (JWT, BCrypt 12, rate limit, RODO) | bez zmian |
| Weryfikacja hodowcy | ✅ OK (AES-GCM, OCR+AI, HITL, retencja 30 dni, log dostępu) | bez zmian |
| PURRE Coins | ✅ OK (ledger, blokada wiersza, idempotencja) | + powód `PREMIUM_SUBSCRIPTION` |
| Stripe | ✅ OK (podpis, idempotencja, historia) | bez zmian |
| Ogłoszenia | ✅ OK (limit 6–20/3, Haversine, koszty) | + typ SALE/ADOPTION (adopcje) |
| Reklamy | ✅ backend kompletny; frontend tylko slot w Discover | + panel admina (kampanie), pomijanie premium |
| Panel admina | ⚠️ tylko weryfikacje | + hub /admin: weryfikacje, reklamy, użytkownicy (role) |
| Panel moderatora | ❌ brak | + zgłoszenia (reports), kolejka /moderation |
| Messenger | ❌ placeholder | + faza 2: STOMP 1:1+grupy, unseen, typing, seen |
| HoloFeed | ❌ brak | + faza 3: /feed (wideo), strona feed |
| Smart Match | ❌ brak | + faza 3: preferencje + scoring |
| PURRE Assistant | ❌ brak | + faza 3: /assistant (Qwen2.5 3B) |
| Arcade | ⚠️ 1/15 gier frontend | + faza 4: Memory, Quiz, Snake (anti-cheat zgodny z GameRule) |
| Premium | ❌ brak | + faza 4: 500 coins/30 dni, bez reklam, badge |
| Profil | ⚠️ tylko wyświetlanie | + edycja, avatar, hasło, eksport RODO |

## 5. Plan naprawczy (commity w tym cyklu)

1. `fix(media): web-path URL-i mediów` + audyt (ten commit).
2. `feat(profile)`: edycja profilu + avatar + hasło + eksport RODO; migracja V6 (MODERATOR, premium_until).
3. `feat(moderation)`: zgłoszenia, rola MODERATOR, panel moderatora, hub admina, zarządzanie reklamami i użytkownikami.
4. `feat(messenger)`: faza 2 — czat STOMP (1:1 + grupy), unseen, typing; uwierzytelnienie WS.
5. `feat(faza3)`: HoloFeed, Smart Match, Adopcje, PURRE Assistant; migracja V8.
6. `feat(faza4)`: gry Memory/Quiz/Snake, PURRE Premium (bez reklam), changelog.

## 6. Co świadomie NIE jest robione

- Hazard / wypłaty coins — zabronione regułą projektu (coins tylko wewnętrzne).
- Płatności poza Stripe, przechowywanie kart — nigdy.
- Profilowanie reklamowe (RODO) — impressiony bez profilowania.
- MinIO/HLS dla HoloFeed — wideo ≤10 MB przez istniejący storage; HLS w fazie późniejszej przy skali.
