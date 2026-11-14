# Changelog — PURRE PETS

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
- **Deploy:** idempotentny `deploy/install.sh` (Oracle Ubuntu 24.04: Java 17, MySQL 8, Node 20, Nginx,
  Certbot, Redis, Ollama + Qwen2.5 3B, systemd `bengos`/`bengos-ai`, firewall 80/443, backupy),
  `deploy/nginx.conf`, `DEPLOY.md`, `TEST_PLAN.md`.

### Bezpieczeństwo
- `@EnableMethodSecurity` + `@PreAuthorize` na kontrolerach, JWT BCrypt(12), szyfrowanie dokumentów w spoczynku,
  webhook Stripe podpisany, idempotencja płatności, rate limiting, brak hazardu i wypłat Coins.

### Fazy kolejne (plan w AUDIT.md §3)
- Faza 2: BENGOS Messenger (STOMP 1:1 + grupy, typing/seen), HoloFeed (wideo, miniatury, HLS).
- Faza 3: Smart Match (paw-match), Adopcje + PURRE Assistant (Adoptek), Elasticsearch.
- Faza 4: pozostałe 14 gier Arcade, edytor wideo/dźwięku, 2FA, sesje, eksport RODO, PURRE Premium.
