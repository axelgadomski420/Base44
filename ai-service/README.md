# PURRE PETS — AI Service

FastAPI + Tesseract OCR + Ollama (Qwen2.5 3B Instruct) + Redis.

## Endpointy

| Metoda | Ścieżka | Opis |
| --- | --- | --- |
| GET | `/health` | status + nazwa modelu |
| POST | `/verify-analysis` | multipart `files` (1–20, max 10 MB) → `{risk_score, analysis, flags}` |
| POST | `/moderate` | `{text}` → `{flagged, reasons}` |

## Zasady

- Model 3B działa na CPU (~2–3 GB RAM) — mieści się w limicie Oracle 6 GB.
- Timeout Ollama 15 s; awaria → fallback na heurystyki (`AI_FALLBACK`).
- Wyniki AI wspierają decyzję administratora (human-in-the-loop), nigdy jej nie zastępują.
- OCR i analiza cache'owane w Redis (24 h / 1 h).

## Uruchomienie lokalne

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

Produkcja: `deploy/install.sh` instaluje Ollama + `ollama pull qwen2.5:3b-instruct`
i uruchamia serwis jako `bengos-ai.service` (systemd).
