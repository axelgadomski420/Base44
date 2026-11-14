# CHANGELOG — PURRE PETS

## [0.1.0] — 2026-11-14 — feature/purre-pets

### Dodane
- Fundament backendu: Spring Boot 3.5 / Java 17 / MySQL 8 / Flyway / Spring Security + JWT (role BUYER, BREEDER, ADMIN), WebSocket/STOMP, globalna obsługa błędów, rate limiting.
- Rejestracja z wyborem roli (HODOWCA / KUPUJĄCY), logowanie JWT, profil `/api/auth/me`.
- **Weryfikacja legalności hodowli:** upload dokumentów (rejestracja ZKwP/FCI, dowód, zaświadczenie, dokumenty legalności, zdjęcia warunków — opcjonalnie, zgoda RODO), szyfrowanie AES-256-GCM w spoczynku, OCR + analiza ryzyka przez ai-service (Tesseract + Qwen2.5:3b), human-in-the-loop (admin zatwierdza/odrzuca), statusy PENDING/APPROVED/REJECTED, badge „Zweryfikowany hodowca", historia decyzji i odwołania, retencja dokumentów 30 dni po decyzji (RODO), log dostępu do dokumentów.
- **PURRE Coins:** portfel + ledger append-only (saldo = suma księgi), wydawanie z blokadą wiersza, idempotencja, pakiety: 100/9,99 zł, 500/39,99 zł, 1000/69,99 zł, 5000/299,99 zł.
- **Stripe Checkout** (PLN): tworzenie sesji, webhook z weryfikacją podpisu, idempotentne zasilenie portfela, zapis transakcji, e-mail potwierdzający, historia zakupów, rate limiting, obsługa błędów i retry.
- **Ogłoszenia:** tylko zweryfikowany hodowca; koszt 50 coins (wyróżnienie 100 / 7 dni, boost profilu 200 / 24 h); 6–20 zdjęć + wideo; wyszukiwanie Haversine po odległości; paginacja.
- **PURRE Arcade (ekonomia backendowa):** wyniki gier z anti-cheat (limity per gra, minimalny czas, dzienny limit coins), dzienny bonus 20 + streak 10, XP, ranking tygodniowy.
- **System reklam (backend):** kampanie sponsorowane (50 coins/24 h, 200 coins/7 dni), rotacja z cappingiem, typy SPONSORED/PARTNER/ADSENSE.
- **ai-service:** FastAPI + Tesseract OCR + Ollama Qwen2.5:3b + Redis; endpointy /ocr, /verify-analysis, /moderate; limity RAM/timeout, fallback na reguły.
- **Frontend Angular 18:** shell PURRE AURA, 8 motywów, i18n pl/en, auth (rejestracja z rolą + upload dokumentów), Discover, portfel + zakup coins (Stripe), kreator weryfikacji, dodawanie ogłoszenia (6–20 zdjęć, drag&drop), panel admina (kolejka weryfikacji), hub Arcade.
- **Deploy:** idempotentny `deploy/install.sh` (Java 17, MySQL 8, Node 20, Nginx, Certbot, Ollama + Qwen2.5:3b, FastAPI, Redis, systemd, firewall, backupy), konfiguracja Nginx i systemd, DEPLOY.md, TEST_PLAN.md.

### Uwagi
- Stary katalog `backend/` (Node/Prisma) oznaczony jako legacy — nie rozwijany.
- Faza 2–4 (Messenger, HoloFeed, Smart Match, Adopcje+AI, 15 gier, edytor wideo) — plan w AUDIT.md §3.
