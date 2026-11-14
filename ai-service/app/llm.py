"""Klient Ollama (Qwen2.5 3B Instruct) z twardym timeoutem i fallbackiem na reguły.

Limity dla Oracle 6 GB RAM: model 3B na CPU, timeout 15 s, max 512 tokenów odpowiedzi.
Gdy Ollama nie odpowiada — zwracamy None i warstwa wyższa używa fallbacku.
"""
import json
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

ASSISTANT_PROMPT = (
    "Jesteś PURRE Assistant — przyjaznym doradcą platformy PURRE PETS (social marketplace "
    "hodowców psów i kotów rasowych). Odpowiadasz ZAWSZE po polsku, zwięźle (max 150 słów), "
    "praktycznie i ciepło. Tematy: rasy, pielęgnacja, żywienie, przygotowanie do adopcji/zakupu, "
    "co sprawdzić u hodowcy (rodowód ZKwP/FCI, dokumenty zdrowotne, chip, umowa). "
    "Nigdy nie diagnozuj chorób — przy problemach zdrowotnych zawsze kieruj do weterynarza. "
    "Nie promuj pseudohodowli; zawsze zachęcaj do weryfikacji legalności hodowli."
)


async def _generate(prompt: str, as_json: bool) -> dict | None:
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": MAX_TOKENS, "temperature": 0.2},
    }
    if as_json:
        payload["format"] = "json"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(OLLAMA_URL, json=payload)
            resp.raise_for_status()
            body = resp.json()
            text = body.get("response", "")
            if as_json:
                return json.loads(text or "{}")
            return {"answer": text.strip()}
    except Exception:
        return None


async def analyze(ocr_text: str) -> dict | None:
    prompt = f"{SYSTEM_PROMPT}\n\nTekst z dokumentów:\n---\n{ocr_text[:6000]}\n---\nZwróć JSON."
    return await _generate(prompt, as_json=True)


async def answer(question: str) -> dict | None:
    prompt = f"{ASSISTANT_PROMPT}\n\nPytanie użytkownika: {question[:1000]}"
    return await _generate(prompt, as_json=False)

