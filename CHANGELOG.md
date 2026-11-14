# Changelog — PURRE PETS

## [0.3.0] — Edytor wideo, 2FA + sesje, komplet 15 gier Arcade

### Dodano
- **Edytor wideo z dźwiękiem (FFmpeg):** POST /media/video-edit — przycinanie (trim), wyciszanie,
  tempo 0.5–2×, głośność wideo, podkład muzyczny (MP3/WAV/M4A/AAC/OGG) z regulacją głośności i amix.
  Wynik zawsze MP4 (H.264 + AAC, faststart), ochrona path traversal, timeout renderu 120 s, rate limit 10/min.
  Strona /video-editor: podgląd, trim z wideo („Start/Koniec = tu"), render, kopiowanie adresu wyniku.
- **2FA (TOTP, RFC 6238):** setup/enable/disable (GET /auth/2fa/status, POST /auth/2fa/setup|enable|disable),
  własna implementacja bez zależności (Base32 + HMAC-SHA1, okno ±1), login dwuetapowy (require2fa),
  otpauth:// URI dla Google Authenticator/Aegis/Authy. Migracja V9 (totp_secret, totp_enabled).
- **Sesje:** refresh tokeny (SHA-256 w bazie, rotacja przy /auth/refresh, TTL 30 dni), tabela sessions
  (urządzenie, IP, ostatnie użycie), lista sesji + wylogowanie pojedynczej sesji i innych urządzeń,
  POST /auth/logout. Frontend: auto-refresh sesji przy wygasłym access tokenie.
- **Arcade — komplet 15 gier:** PURRE 2048, Memory, Quiz, Snake, Tetris, Flappy, Runner, Match-3, Wordle,
  Trivia, Coloring, Puzzle (przesuwane kafelki), Bubble (strzelanie bąbelkami), Hex (reakcja kolorów),
  Jump (timing). Wszystkie z anti-cheat backendowym (limity wyniku i czasu wg GameRule), selektor gier.

### Bezpieczeństwo
- 2FA opcjonalne per użytkownik, refresh tokeny hashowane SHA-256, rotacja sesji, zdalne wylogowanie,
  walidacja ścieżek mediów przed ffmpeg, limity rozmiaru wyniku (10 MB), brak hazardu i wypłat Coins.

## [0.2.0] — Fazy 2–4: Messenger, HoloFeed, Moderacja, Premium

### Dodano
- **Faza 2 — BENGOS Messenger:** rozmowy 1:1 i grupowe (STOMP przez /ws, JWT w CONNECT), wiadomości na żywo,
  unseen/seen, typing, REST /conversations (+/direct, /group, /{id}/messages, /{id}/read), UI messengera
  z linkiem „Napisz do hodowcy" w ogłoszeniu.
- **Faza 3 — HoloFeed, Smart Match, Adopcje, PURRE Assistant:**
  - HoloFeed: pionowy feed wideo (snap-scroll, TikTok-style), /listings/feed, kafelki w Discover/Explore.
  - Adopcje: listing_type SALE/ADOPTION (adopcja bezpłatna), filtr w Explore, badge ❤️.
  - Smart Match: /match + /match/preferences (scoring: gatunek 40 / rasa 30 / miasto 15 / wyróżnienie 10 / świeżość 5).
  - PURRE Assistant: /assistant (ai-service: Ollama Qwen2.5 3B + Redis cache, fallback tekstowy), strona czatu Q&A.
- **Faza 4 — PURRE Premium + Arcade:**
  - Premium: 500 coins / 30 dni (/premium/purchase, /premium/status), pomija reklamy, badge 👑, przedłużanie okresu.
  - Gry: PURRE 2048, PURRE Memory, PURRE Quiz, PURRE Snake — z anti-cheat backendowym (limity wyniku i czasu).
- **Moderacja i panel admina:**
  - Rola MODERATOR + panel zgłoszeń (/moderation): SPAM/FAKE_LISTING/PSEUDO_BREEDER/CRUELTY/SCAM/OTHER,
    rozstrzyganie, licznik PENDING; zgłaszanie ogłoszeń przyciskiem 🚩.
  - Panel admina (/admin): zarządzanie użytkownikami i rolami, kolejka weryfikacji, zarządzanie kampaniami reklam
    (/ads/managed/list, toggle aktywności).
- **Profil:** zdjęcie profilowe (multipart /users/me/avatar), edycja (nazwa, bio, miasto, region, WWW, Instagram),
  zmiana hasła, eksport danych RODO (art. 15), status i zakup Premium.
- **Naprawa K1 (audyt):** StorageService zwraca web-path /api/media/… zamiast ścieżki systemowej — zdjęcia działają;
  proxy deweloperski /api → :8080.

### Bezpieczeństwo
- JWT w sockecie (AuthChannelInterceptor), @PreAuthorize MODERATOR/ADMIN na moderacji, premium serwerowo
  (reklamy pomijane w AdService.serve), brak hazardu i wypłat Coins, brak profilowania reklamowego.

## [0.1.0] — Faza 1: Fundament (feature/purre-pets)

### Dodano
- **Backend (Spring Boot 3.5, Java 17, MySQL, Flyway):**
  - Auth: rejestracja z rolą HODOWCA (BREEDER) / KUPUJĄCY (BUYER) + zgoda RODO, JWT, rate limiting.
  - Weryfikacja legalności hodowli: dokumenty AES-256-GCM, OCR (Tesseract) + AI (Qwen2.5 3B) risk score,
    human-in-the-loop (admin zatwierdza), statusy PENDING/APPROVED/REJECTED, badge, odwołania,
    retencja RODO 30 dni (scheduler 4:00), log dostępu do dokumentów.
  - PURRE Coins: ledger append-only z idempotencją, pakiety, koszty (ogłoszenie 50, wyróżnienie 100, boost 200).
  - Stripe Checkout (PLN): webhook z weryfikacją podpisu, idempotencja, e-mail, historia zakupów.
  - Ogłoszenia: tylko zweryfikowany hodowca, 6–20 zdjęć + max 3 wideo, Haversine (SQL), wyróżnienia/boost.
  - PURRE Arcade: 15 gier (reguły anti-cheat backendowe), dzienny bonus 20 + streak 10, cap 300/dzień,
    ranking tygodniowy TOP 10, XP.
  - Reklamy: sponsorowane ogłoszenia (50 coins/24 h, 200 coins/7 dni), partnerzy, AdSense, rotacja.
- **AI Service (FastAPI + Ollama Qwen2.5 3B + Tesseract + Redis):** OCR, analiza ryzyka z fallbackiem na heurystyki, moderacja.
- **Frontend (Angular 18 standalone + Tailwind):**
  - 8 motywów (domyślny PURRE AURA — Dark Luxury), i18n pl (domyślny) / en.
  - Strony: login/rejestracja z wyborem roli, Discover (geolokalizacja + reklamy), Explore (wyszukiwarka),
    szczegóły ogłoszenia (galeria + lightbox), dodawanie ogłoszenia (drag&drop, limity, obsługa braku Coins),
    portfel (pakiety → Stripe, transakcje, historia), weryfikacja hodowcy (upload/status/odwołanie),
    profil (motywy, język, moje ogłoszenia, wyróżnianie/boost), panel admina (kolejka weryfikacji),
    Arcade z grywalnym PURRE 2048, Messenger (szkielet fazy 2).
  - Dolne menu: Discover | Explore | Dodaj | Messenger | Arcade | Profil.
- **Deploy:** idempotentny deploy/install.sh (Oracle Ubuntu 24.04: Java 17, MySQL 8, Node 20, Nginx,
  Certbot, Redis, Ollama + Qwen2.5 3B, systemd bengos/bengos-ai, firewall 80/443, backupy),
  deploy/nginx.conf, DEPLOY.md, TEST_PLAN.md.

### Bezpieczeństwo
- @EnableMethodSecurity + @PreAuthorize na kontrolerach, JWT BCrypt(12), szyfrowanie dokumentów w spoczynku,
  webhook Stripe podpisany, idempotencja płatności, rate limiting, brak hazardu i wypłat Coins.
