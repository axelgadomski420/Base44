# PURRE PETS — Premium Social Marketplace

Premium platforma webowa (PWA) dla hodowców psów i kotów oraz osób szukających zwierzaka.

Łączy marketplace, profile hodowli, społeczność, krótkie wideo w stylu TikToka (HoloFeed), czat, gry (PURRE Arcade), płatności (PURRE Coins + Stripe) i AI.

## Główne funkcje (pełna specyfikacja)

- **Konta**: email + hasło, Google OAuth, weryfikacja email, 2FA, RODO
- **Role**: HODOWCA / KUPUJĄCY
- **Onboarding**: język, motyw (PURRE AURA i inne), rasy, lokalizacja
- **Profile**: użytkownik, hodowca (weryfikacja + badge), zwierzak
- **Weryfikacja hodowcy**: upload dokumentów, OCR (Tesseract), AI (Qwen), human-in-the-loop
- **Marketplace**: ogłoszenia za Coins, zdjęcia + nieograniczone wideo, filtry, mapa (Haversine)
- **Edytor wideo TikTok-style**: trim, split, merge, filtry, efekty, napisy (Whisper), muzyka
- **HoloFeed**: full-screen pionowe wideo, swipe, autoplay, Smart Match
- **Messenger**: 1:1, grupowy, przy ogłoszeniu, E2E (planowane)
- **Społeczność**: grupy rasowe/regionalne
- **Wydarzenia**: kalendarz, Event Radar, bilety za Coins
- **PURRE Arcade**: 15+ gier, Coins, XP, rankingi, anti-cheat
- **PURRE Coins + Stripe**: zakup pakietów, webhook, brak wypłat
- **Reklamy**: AdSense, sponsorowane, Premium wyłącza
- **Panele**: hodowca + admin
- **AI**: asystent, moderacja, OCR, risk score
- **Design**: Dark Luxury, PURRE AURA (czerń #050507, fiolet #8B5CF6, aurora #2BE39B)
- **Deployment**: Oracle Cloud (92.5.154.243), bengos.pl / purrepets.pl, Nginx, Cloudflare

## Stack

- **Frontend**: Vite + React 19 + TanStack Start + Tailwind + Radix
- **Backend**: Express + Prisma + PostgreSQL + Socket.IO + JWT
- **Płatności**: Stripe
- **AI / OCR**: Ollama + Qwen2.5 (planowane) / Tesseract
- **Wideo**: FFmpeg / ffmpeg.wasm (planowane)

## Uruchomienie lokalne

### Frontend

```bash
npm install
npm run dev
```

### Backend (wymaga PostgreSQL)

```bash
cd backend
cp .env.example .env
# Ustaw JWT_SECRET, DATABASE_URL, CORS_ORIGINS, PUBLIC_BASE_URL
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Pełny stack z Base44 (alternatywa)

```bash
npm ci
base44 login
base44 link
base44 dev
```

## Struktura

- `src/` — frontend (TanStack routes)
- `backend/` — self-hosted Express + Prisma
- `base44/entities/` — definicje encji (Profile, Listing, Post, Pet, Wallet, ...)

## Status implementacji

Działa: feed, ogłoszenia, messenger, portfel, 7 gier Arcade (2048, Memory, Quiz, Snake, Reflex, Whack, Slide), wydarzenia z biletami za Coins, grupy społeczności, wniosek o weryfikację hodowcy + kolejka admina, edytor wideo (trim, filtry, napis, okładka, eksport WebM) oraz pakiety Stripe.

Po wdrożeniu backendu uruchom migrację schematu:

```bash
cd backend
npx prisma db push
# albo, jeśli trzymasz historię migracji:
npx prisma migrate deploy
```

Stripe: ustaw `STRIPE_SECRET_KEY` i `STRIPE_WEBHOOK_SECRET`, webhook na `POST /api/stripe/webhook`. Bez kluczy sklep pokazuje pakiety, ale nie otwiera płatności.

---

*Pełna specyfikacja w pliku SPEC.md*
