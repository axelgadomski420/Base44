"""Klient Ollama (Qwen2.5 3B Instruct) z twardym timeoutem i fallbackiem na reguły.

Limity dla Oracle 6 GB RAM: model 3B na CPU, timeout 15 s, max 512 tokenów odpowiedzi.
Gdy Ollama nie odpowiada — zwracamy None i warstwa ryzyka używa wyłącznie heurystyk.
"""
import os

import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b-instruct")
TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "15"))
MAX_TOKENS = int(os.getenv("OLLAMA_MAX_TOKENS", "512"))

SYSTEM_PROMPT = (
    "Jesteś asystentem weryfikacji hodowców na platformie PURRE PETS. "
    "Otrzymujesz tekst z OCR dokumentów hodowlanych (ZKwP/FCI/klub rasowy, dowód tożsamości, zaświadczenia). "
    "Oceń spójność: czy tekst zawiera numer rejestracji hodowli, nazwę organizacji, daty, dane osoby. "
    "Wskaż sygnały ryzyka (brakujące pola, sprzeczności, ślady edycji w tekście). "
    "Odpowiedz ZAWSZE poprawnym JSON-em w formacie: "
    '{"risk_score": 0-100, "analysis": "krótka analiza po polsku", "flags": ["..."]}. '
    "Nie podejmuj decyzji o zatwierdzeniu — to robi człowiek (human-in-the-loop)."
)


async def analyze(ocr_text: str) -> dict | None:
    prompt = f"Tekst z dokumentów:\n---\n{ocr_text[:6000]}\n---\nZwróć JSON."
    payload = {
        "model": MODEL,
        "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
        "stream": False,
        "format": "json",
        "options": {"num_predict": MAX_TOKENS, "temperature": 0.2},
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(OLLAMA_URL, json=payload)
            resp.raise_for_status()
            import json
            body = resp.json()
            return json.loads(body.get("response", "{}"))
    except Exception:
        return None
