# AUDIT-GAPS — 0.5.0 (audyt: co się nie zapisało)

## Stan po przerwanej sesji (przed tym commitem)

**Zapisane na GitHubie (weszedł backend i frontend społeczności 0.5.0):**
- Migracje V14–V19: profil zwierzaka, zapisane wyszukiwania + powiadomienia, messenger upgrade, społeczność, wydarzenia, obserwowanie.
- Backend: pakiety breeder, community, events, follow, savedsearch, scheduler, notification.
- Frontend: /community, /events, /breeder/:id, /notifications + wpisy w app.routes.ts.

**NIE zapisane (brakowało w repo) — dokończone w 0.5.0:**
| Brak | Status |
|---|---|
| CHANGELOG sekcja 0.5.0 | ✅ dodany |
| Landing purrepets.pl + logo | ✅ landing/ + nginx (blok purrepets.pl) |
| Logo PURRE PETS | ✅ landing/purre-logo.svg (odtworzone jako SVG) |
| Reels: dźwięki + edycja/filtry jak TikTok | ✅ PURRE Sounds (Web Audio) + filtry CSS + V20 |
| Funkcje Premium/Pro/Ultra (macierz, egzekwowanie) | ✅ paywall-macierz, statystyki PRO+, boost ULTIMATE, badge |
| Reklamy: CTR w panelu hodowcy | ✅ impressions+clicks w /ads/mine |

## Macierz pokrycia — 20 sekcji listy funkcji

| # | Sekcja | Status |
|---|---|---|
| 1 | Onboarding i konto | ✅ e-mail+role+język(pl/en)+8 motywów; Google/Apple OAuth — **do zrobienia** (wymaga kluczy) |
| 2 | Profil użytkownika | ✅ awatar, bio, miasto/region, WWW, Instagram, hasło, RODO eksport, sesje, 2FA; crop awatara, TikTok/YouTube, galeria 12 zdjęć, prywatność/powiadomienia — **częściowo** |
| 3 | Weryfikacja hodowcy | ✅ komplet (OCR, AI, human-in-the-loop, retencja 30 dni, odwołania) |
| 4 | Ogłoszenia / Marketplace | ✅ komplet + zapisane wyszukiwania (V15); filtry wieku/płci — **do rozbudowy** |
| 5 | Profil zwierzaka | ✅ V14 (pet profile) |
| 6 | Profil hodowcy | ✅ V19 follows, Trust Score, odznaki |
| 7 | PURRE Messenger | ✅ V7+V11+V16 (multimedia, statusy); E2E — **do zrobienia** |
| 8 | HoloFeed | ✅ V8 + reklamy; komentarze/udostępnianie — **do rozbudowy** |
| 9 | Discover / Feed | ✅ Smart Match (V8), filtry, zapisane filtry V15 |
| 10 | Społeczność | ✅ V17 |
| 11 | Wydarzenia | ✅ V18 |
| 12 | PURRE Arcade | ✅ 16 gier, anti-cheat, XP, rankingi |
| 13 | PURRE Coins i Stripe | ✅ komplet (4 pakiety, webhook, idempotencja) |
| 14 | Reklamy | ✅ komplet (5 placementów, capping, sponsored 50/200, partnerzy, AdSense w modelu, Premium pomija, CTR) |
| 15 | Panel hodowcy | ✅ + statystyki 0.5.0 |
| 16 | Panel administratora | ✅ moderacja, weryfikacje, reklamy, użytkownicy |
| 17 | AI (Ollama Qwen2.5 3B) | ✅ komplet + pamięć asystenta 0.4.0 |
| 18 | Bezpieczeństwo i RODO | ✅ komplet podstawowy; cookie banner — **do zrobienia** |
| 19 | Design PURRE AURA | ✅ 8 motywów, dolny tab bar |
| 20 | Deployment | ✅ bengos.pl + landing purrepets.pl (0.5.0) |

## Pozostała praca (kolejne cykle)
1. OAuth Google/Apple (sekcja 1) — wymaga client ID/secret od użytkownika.
2. Cookie banner + zgody marketingowe (sekcja 18).
3. Crop awatara (koło/kwadrat) + galeria profilowa 12 zdjęć + ustawienia prywatności/powiadomień (sekcja 2).
4. Filtry wieku/płci w ogłoszeniach (sekcja 4).
5. E2E w messengerze (sekcja 7) — duży zakres, wymaga decyzji o bibliotece (libsignal).
6. Komentarze/udostępnianie w HoloFeed (sekcja 8).
