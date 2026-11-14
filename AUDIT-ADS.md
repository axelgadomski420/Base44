# Audyt systemu reklam — PURRE PETS (0.3.1)

Data: 2026-11-14 · Branch: feature/purre-pets · Audyt: co jest, czego brakuje, co się dubluje.

## 1. Co JEST (stan po 0.3.1)

### Backend (spring-backend, pakiet com.purre.pets.ads)
| Element | Status |
| --- | --- |
| Migracja V5: `ad_campaigns` + `ad_impressions` | ✅ |
| Migracja V10: kolumna `clicks` | ✅ (0.3.1) |
| `AdCampaign` (SPONSORED_LISTING / PARTNER / ADSENSE) | ✅ |
| `AdService.serve` — rotacja, impression, Premium → null | ✅ |
| `AdService.recordClick` + `POST /ads/{id}/click` (publiczny, anonimowy) | ✅ (0.3.1) |
| `POST /ads/sponsored` (BREEDER, 50 🪙/1 d, 200 🪙/7 d, debet z idempotencją) | ✅ |
| `GET /ads/mine` (BREEDER) | ✅ |
| `POST /ads/managed`, `GET /ads/managed/list`, `POST /ads/managed/{id}/toggle` (ADMIN) | ✅ |
| SecurityConfig: GET /ads/serve i POST /ads/*/click permitAll | ✅ |

### Frontend (Angular 18 standalone)
| Element | Status |
| --- | --- |
| `purre-ad-slot` — komponent wielokrotnego użytku (capping co N wejść, klik → click tracking) | ✅ (0.3.1) |
| Slot DISCOVER (co 6 kafelków w siatce) | ✅ (było) |
| Slot HOLOFEED (co 4. wideo w feedzie) | ✅ (0.3.1) |
| Slot GAME_INTERSTITIAL (co 3. wejście do Arcade) | ✅ (0.3.1) |
| Slot BREEDER_PANEL (szczegóły ogłoszenia) | ✅ (0.3.1) |
| Slot FOOTER (nad dolnym menu, wszystkie strony) | ✅ (0.3.1) |
| Panel hodowcy `/my-ads` — zakup reklamy + moje kampanie | ✅ (0.3.1) |
| Panel admina `/admin/ads` — kampanie, toggle, liczniki | ✅ (było) |
| Premium: slot niewidoczny (backend zwraca null) | ✅ |

## 2. Czego BRAKOWAŁO (naprawione w 0.3.1)
1. **Brak UI hodowcy** — `POST /ads/sponsored` i `GET /ads/mine` istniały bez żadnego frontendu
   (monetyzacja niedostępna dla użytkownika). → nowa strona `/my-ads` + link z formularza ogłoszenia.
2. **3 z 5 placementów nieużywane** — HOLOFEED, GAME_INTERSTITIAL, BREEDER_PANEL, FOOTER zdefiniowane
   w backendzie, ale żaden slot ich nie wołał (jedynie DISCOVER). → komponent `purre-ad-slot` we wszystkich slotach.
3. **Brak śledzenia kliknięć** — tylko impressions. → V10 + `POST /ads/{id}/click` + licznik w panelu admina.
4. **Brak cappingu rotacji** poza Discover (dokumentacja wymagała „1 na 5–7 interakcji"). → `everyN` w `purre-ad-slot`.

## 3. Co się DUBLUJE / było uszkodzone (naprawione)
1. **CoinServiceTest w złym miejscu (krytyczne):** plik leżał w
   `spring-backend/src/main/java/com/purre/pets/src/test/java/...` — testy JUnit w źródłach main
   psuły kompilację produkcyjną (JUnit/Mockito tylko w scope test). Przeniesiony do
   `spring-backend/src/test/java/com/purre/pets/coins/CoinServiceTest.java`, duplikat usunięty (222cfed).
2. **Panel admina pozwalał tworzyć SPONSORED_LISTING bez pobrania coins** — ścieżka admina jest
   świadomie „over-ride" (administracja ręczna), ale pozycja w selektorze może mylić; zostawiona celowo.

## 4. Dublowanie w repo (nieaktywne, do rozważenia)
- `backend/` — stary backend Node/Prisma (przed migracją na Spring Boot) — nieaktywny.
- `src/` + `vite.config.js` + `wrangler.jsonc` — stary frontend Vite/React — nieaktywny.
- `base44/` — stara konfiguracja eksportu — nieaktywna.
- `AUDIT.md` vs `AUDIT-APP.md` — dwa pliki audytu (historyczne).
→ Rekomendacja: usunąć legacy katalogi w osobnym commicie (mniejszy checkout, brak mylenia agentów/CI).

## 5. Zasady produktowe (zachowane)
- Reklamy nie zasłaniają treści, zawsze oznaczone „Sponsorowane", rel="nofollow sponsored".
- Premium nie widuje reklam (decyzja serwera, nie UI).
- RODO: brak profilowania — impression/click anonimowe lub z ID konta wyłącznie do limitacji częstotliwości.
- Brak hazardu i wypłat Coins; jedyna ścieżka wydawania na reklamy to PURRE Coins ze Stripe.

## 6. Znane długi (nieblokujące)
- Impression liczony przy /ads/serve — bez deduplikacji per sesja (mogą się kumulować przy odświeżaniu).
- AdSense slot renderuje baner tekstowy/obrazkowy — prawdziwy skrypt AdSense wymaga dodania pliku index.html (rodo/cookies).
- Rotation to AtomicLong in-memory — po restarcie serwera licznik od zera (kosmetyczne).
