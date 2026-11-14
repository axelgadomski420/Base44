# AUDIT.md — PURRE PETS (Base44 → stack Elif)

**Data:** 2026-11-14 · **Repo:** https://github.com/axelgadomski420/Base44 · **Gałąź:** `feature/purre-pets`
**Cel:** produkcyjny social marketplace dla hodowców psów i kotów rasowych (TikTok + OLX + Instagram + Messenger, odsłona premium).

---

## 1. Stan repozytorium docelowego (Base44)

Repo `axelgadomski420/Base44` zawierało starter platformy Base44 (TanStack Start / React 19 / Cloudflare Workers)
oraz wcześniejszą próbę samodzielnego backendu PURRE PETS w stacku **Node 22 + Express + PostgreSQL + Prisma + Socket.IO**
(`backend/`, README: „Backend (zamiennik Base44)").

**Decyzja architektoniczna (za właścicielem):** PURRE PETS budujemy w stacku fundamentu **Elif**:
Angular 18 + Spring Boot 3.5 + MySQL 8 + WebSocket/STOMP. Katalogi:

| Katalog | Zawartość | Status |
| --- | --- | --- |
| `spring-backend/` | **Nowy** backend Spring Boot 3.5 (Java 17, MySQL, JWT, STOMP, Flyway, Stripe) | aktywny |
| `frontend/` | **Nowy** frontend Angular 18 (Tailwind, i18n pl/en, 8 motywów PURRE AURA) | aktywny |
| `ai-service/` | **Nowy** FastAPI + Tesseract OCR + Ollama/Qwen2.5:3b + Redis | aktywny |
| `deploy/` | install.sh, Nginx, systemd, backupy | aktywny |
| `backend/` | stary zamiennik Node/Prisma | **legacy — wygaszany**, nie rozwijamy |
| `src/`, `base44/` | starter Base44 (TanStack) | legacy, nietknięty |

## 2. Audyt repozytoriów źródłowych

### 2.1 Elif — fundament (AtfastrSlushyMaker/Elif)
- **Stack:** Angular 18.2 / TS 5.5 / Material 18 / Tailwind 3.4 · Spring Boot 3.5.11 / Java 17 · MySQL 8 · STOMP (`/elif/ws-community`) · Stripe java 29 · iText/PDFBox · Mail.
- **Moduły:** community (posty, komentarze, głosy, czat realtime, typing/seen, moderacja), marketplace (katalog, koszyk, Stripe checkout, zamówienia, faktury, reklamacje), pet profiles, pet transit (OCR), adoption, events, services, users/auth, back-office, powiadomienia, seam-y AI (Groq/Gemini/OpenAI), companion FastAPI agent.
- **Konfiguracja:** port 8087, context-path `/elif`, `ddl-auto=update`, uploady w `backend/uploads`, multipart 10 MB, seed SQL.
- **Ocena:** najlepszy fundament — domena, realtime i role są gotowe. Do PURRE PETS przenosimy architekturę (pakiety domenowe, STOMP, powiadomienia, upload) i wzorce, a nazwy brandujemy na PURRE (context-path `/api`, pakiet `com.purre.pets`).
- **Ryzyka:** `ddl-auto=update` → zastąpione Flyway + `validate`; brak migracji; brak JWT (tylko security-crypto) → dodajemy pełny Spring Security + JWT; brak rate limitingu i idempotencji → dodajemy.

### 2.2 paw-match (pablo-navia5)
- Angular 17 + Spring Boot (Java 21/Gradle) + MySQL + Firebase Auth + Cloudinary. Feed personalizowany, algorytm match (preferencje ↔ potrzeby zwierzaka), panele adoptujący/schronisko, whitelisty CORS.
- **Do PURRE:** model preferencji → Smart Match, Discover, rekomendacje. **Nie przenosimy:** Firebase (mamy JWT), Cloudinary (mamy własny storage/MinIO).

### 2.3 Adoptek (ABDELLAHdev01)
- Angular + Spring Boot 3 + **Spring Security + JWT** + NgRx, adopcje, AI chatbot, wyszukiwanie po lokalizacji.
- **Do PURRE:** wzorzec konfiguracji Security+JWT (filtr, provider), przepływy adopcji, PROMPT design asystenta (PURRE Assistant). NgRx pomijamy (signals/store Angular 18).

### 2.4 real-time-chat (56duong)
- Angular 16 + Spring Boot 3.3 + STOMP + MySQL + PrimeNG. Czat 1:1 i grupowy, unseen, statusy online, kolory czatu, upload avatara, zarządzanie członkami grupy.
- **Do PURRE:** BENGOS Messenger — model `Conversation/ConversationMember/Message/UnseenState`, broker STOMP, upload avatara. Faza 2.

### 2.5 Social-Network (anna02272)
- Spring Boot + Angular + **Elasticsearch + MinIO** (gałąź `ues`): indeksowanie postów/grup, ICU tokenizer, Phrase/Fuzzy/BooleanQuery, highlighter, PDF w treści, grupy, zgłoszenia, blokady.
- **Do PURRE:** HoloFeed media storage (MinIO), wyszukiwarka ogłoszeń/postów/grup rasowych, grupy. Faza 3.

### 2.6 TikTok-Clone-App-Free (liveupx)
- **Uwaga:** repo zawiera wyłącznie README + zrzuty ekranu — **brak kodu źródłowego**. Z dokumentacji czerpiemy wyłącznie specyfikację UX: full-screen swipe feed, filtry wideo, dźwięki/muzyka, hashtag discovery, przypięte komentarze, playlisty, speed 1x/2x/3x.
- **Do PURRE:** UX HoloFeed (swipe, discovery, hashtagi). Implementacja opiera się na video-streaming-spring + własnym kodzie.

### 2.7 video-streaming-spring (volvadvit)
- Spring Web + MySQL: upload wideo, streaming przez HTTP (range), generowanie podglądów, metadane w MySQL, frontend Angular.
- **Do PURRE:** backend HoloFeed — upload, miniatury, streaming; rozszerzamy o HLS (ffmpeg) i WebSocket statusu uploadu. Faza 3.

### 2.8 nearby-marketplace (iPollo)
- Angular 19 + Spring Boot 4 + JPA + **JWT (jjwt)** + **Flyway** + S3/R2. Wyszukiwanie po odległości **Haversine w czystym SQL**, paginacja, autoryzacja właściciela w serwisie, DTO wszędzie, globalny exception handler.
- **Do PURRE:** wzorzec Haversine (MySQL, bez PostGIS), Flyway, security/JWT, autoryzacja owner-check. Czat kupujący–sprzedający realizujemy przez STOMP z real-time-chat.

### 2.9 mini-games (adamvangrover) — baza PURRE Arcade
- 40+ gier vanilla JS/ES6 (Snake, Tetris, Memory, 2048, Pong, Mines…), ekonomia coins/XP w LocalStorage, daily challenges, store, 3D hub (Three.js) z fallbackiem 2D.
- **Do PURRE:** silniki gier jako moduły Angular (port ES6→TS), ekonomia **po stronie backendu** (LocalStorage tylko cache). Faza 4.

### 2.10 BlastScale (AtakanKeser) — ekonomia Arcade
- Wzorce klasy produkcyjnej: **ledger append-only** z `balance_after`, `SELECT ... FOR UPDATE`, idempotencja (Idempotency-Key + unikalny klucz ledgerowy), anti-cheat Chain of Responsibility (sesja → progres → czas → limity wyniku → replay), daily reward ze streakiem, ranking tygodniowy w Redis, rate limiting, telemetry/outbox.
- **Do PURRE:** implementujemy te wzorce w module coins/arcade (MySQL-first; Redis docelowo).

## 3. Kolejność wdrożenia (za właścicielem)

1. ✅ **Fundament:** Spring Boot 3.5 + MySQL + Flyway + JWT (role BUYER/BREEDER/ADMIN) + STOMP + upload.
2. ✅ **Weryfikacja hodowcy:** dokumenty (ZKwP/FCI, dowód, zaświadczenie, warunki trzymania, RODO), szyfrowanie AES-GCM w spoczynku, OCR (Tesseract) + analiza ryzyka (Qwen2.5:3b przez FastAPI), human-in-the-loop, statusy PENDING/APPROVED/REJECTED, badge, retencja 30 dni, log dostępu.
3. ✅ **PURRE Coins + Stripe:** ledger, pakiety 100/500/1000/5000, Stripe Checkout (PLN), webhook z weryfikacją podpisu, idempotencja, e-mail, historia, rate limiting.
4. ✅ **Ogłoszenia:** tylko hodowca zweryfikowany, koszt 50 coins (wyróżnienie 100, boost 200), 6–20 zdjęć, Haversine.
5. ✅ **Ekonomia Arcade + Ads (backend):** anti-cheat, daily bonus 20 + streak 10, limity dzienne, ranking; kampanie reklamowe (sponsorowane 50 coins/24 h, 200 coins/7 dni), AdSense sloty.
6. ⏭ Faza 2: BENGOS Messenger (STOMP 1:1+grupy, unseen, typing, seen) — z real-time-chat.
7. ⏭ Faza 3: HoloFeed (upload wideo, miniatury, HLS, swipe) + MinIO + Elasticsearch — z video-streaming-spring i Social-Network.
8. ⏭ Faza 4: Smart Match (paw-match), Adopcje + PURRE Assistant (Adoptek), 15 gier Arcade (mini-games), edytor dźwięku/wideo, 2FA, sesje, eksport RODO.

## 4. Zasady bezpieczeństwa wdrożone w tej iteracji

- JWT HS256 (jjwt), role w tokenie, filtry na `/api/admin/**`, `/api/breeder/**`.
- Dokumenty weryfikacji szyfrowane AES-256-GCM kluczem z env; dostęp tylko owner/admin; każdy odczyt logowany.
- Retencja: dokumenty usuwane 30 dni po decyzji (scheduler) — RODO.
- Webhook Stripe: weryfikacja podpisu, idempotencja po `session.id`, log zdarzeń.
- Rate limiting (token bucket) na `/api/auth/**`, `/api/coins/purchase`, `/api/arcade/scores`.
- Anti-cheat Arcade: limity wyniku per gra, minimalny czas gry, dzienny limit coins, walidacja serwerowa.
- Flyway + `ddl-auto=validate`; hasła bcrypt(12); DTO wszędzie (bez ekspozycji encji).
