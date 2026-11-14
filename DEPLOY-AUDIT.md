# Audyt deploymentu i CI/CD — PURRE PETS (0.4.0)

Data: 2026-11-14 · Branch: feature/purre-pets

## 1. Stan procesu (przed 0.4.0)
- **Brak CI:** push na GitHub nie uruchamiał żadnej walidacji (build/test) — błędy kompilacji
  (np. CoinServiceTest w src/main, wykryty w 0.3.1) trafiały na serwer produkcyjny bez wykrycia.
- **Brak auto-deploy:** wdrożenie jest ręczne — `deploy/install.sh` na serwerze (bengos.pl),
  systemd `bengos`/`bengos-ai`, sekrety w `/etc/purrepets/purre.env`. To świadomy wybór (prostota),
  ale oznacza, że push ≠ release.

## 2. Co naprawiono (0.4.0)
1. **CI (`.github/workflows/ci.yml`):** każdy push/PR buduje backend (mvn package + testy),
   frontend (ng build production) i ai-service (pip install). Kompilacja jest teraz bramką.
2. **Naprawa synchronizacji awatara:** po uploadzie zdjęcia profilowego backend zwracał ten sam URL
   (`/api/media/...`), a przeglądarka serwowała stary obraz z cache. Frontend teraz dokleja
   cache-buster `?v=<timestamp>` do avatarUrl po każdej zmianie — stan UI i bazy jest spójny natychmiast.
3. **Synchronizacja stanu DB:** schemat zmienia wyłącznie Flyway (V1–V13), `ddl-auto=validate`
   blokuje start przy niezgodności encji ze schematem — drift bazy nie wchodzi na produkcję.

## 3. Sesje a aktualizacje
- Refresh tokeny i sesje są w MySQL (tabela `sessions`) — restart serwisu NIE wylogowuje użytkowników.
- Access JWT jest stateless — bez cache po stronie serwera, brak problemu inwalidacji przy deployu.

## 4. Procedura release (obowiązująca)
1. Push na `feature/purre-pets` → CI buduje i testuje.
2. Merge do `main` po review.
3. Na serwerze: `git pull && sudo bash deploy/install.sh` (idempotentny: migracje Flyway, rebuild,
   restart systemd, health-check /health).

## 5. Rekomendacje (dalsze)
- Auto-deploy: webhook z GitHub → mały listener na serwerze wywołujący install.sh (opcjonalnie).
- Smoke-test po deployu: curl /health + /api/health w install.sh (do dodania).
- Tagi release `v0.4.0` + CHANGELOG jako źródło prawdy o wersji.
