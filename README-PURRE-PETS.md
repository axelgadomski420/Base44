# PURRE PETS

> **Where exceptional breeds find exceptional homes.**
> Social marketplace dla hodowców psów i kotów rasowych — TikTok + OLX + Instagram + Messenger w wydaniu premium.

![Angular 18](https://img.shields.io/badge/Angular-18.2-DD0031) ![Spring Boot 3.5](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F) ![Java 17](https://img.shields.io/badge/Java-17-ED8B00) ![MySQL 8](https://img.shields.io/badge/MySQL-8-4479A1)

## Stack (fundament Elif)

| Warstwa | Technologia |
| --- | --- |
| Frontend | Angular 18.2, TypeScript 5.5, Tailwind CSS 3.4 (motyw PURRE AURA + 7 alternatywnych), i18n (pl domyślny, en) |
| Backend | Spring Boot 3.5, Java 17, Spring Security + JWT, WebSocket/STOMP, Flyway, Stripe |
| Baza | MySQL 8 |
| AI | FastAPI + Tesseract OCR + Ollama (Qwen2.5 3B Instruct) + Redis |
| Deploy | Ubuntu 24.04 (Oracle), Nginx, Certbot, systemd (`bengos.service`, `bengos-ai.service`) |

## Struktura

```text
spring-backend/   API Spring Boot (com.purre.pets): auth+role, weryfikacja hodowcy, PURRE Coins, Stripe, ogłoszenia, arcade, ads
frontend/         Aplikacja Angular 18 (standalone): Discover, ogłoszenia, portfel, weryfikacja, panel admina, Arcade
ai-service/       FastAPI: OCR dokumentów, analiza ryzyka (Qwen2.5:3b), moderacja tekstu
deploy/           install.sh, Nginx, systemd, backup
AUDIT.md          Audyt 10 repozytoriów źródłowych i plan wdrożenia
DEPLOY.md         Instrukcja wdrożenia na Oracle (bengos.pl)
```

## Uruchomienie lokalne

```bash
# 1. MySQL
mysql -e "CREATE DATABASE IF NOT EXISTS purrepets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 2. Backend (port 8080, context /api)
cd spring-backend && cp ../deploy/.env.example .env && ./mvnw spring-boot:run

# 3. AI service (opcjonalnie dla weryfikacji)
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --port 8100

# 4. Frontend
cd frontend && npm install && npm start   # http://localhost:4200
```

## Wdrożenie na Oracle (bengos.pl)

```bash
curl -fsSL https://raw.githubusercontent.com/axelgadomski420/Base44/feature/purre-pets/deploy/install.sh | sudo bash
```

Szczegóły: [DEPLOY.md](DEPLOY.md) · Audyt i plan: [AUDIT.md](AUDIT.md) · Historia: [CHANGELOG.md](CHANGELOG.md)
