"""PURRE PETS — AI Service (FastAPI).

Zadania: OCR dokumentów weryfikacji, analiza ryzyka (Qwen2.5 3B przez Ollama),
moderacja tekstu ogłoszeń, PURRE Assistant. Limit RAM: model 3B na CPU (~2-3 GB).
Cache Redis (opcjonalny). AI nigdy nie decyduje sam — wynik trafia do człowieka (human-in-the-loop).
"""
import hashlib
import json
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from . import llm, moderation, ocr, risk

app = FastAPI(title="PURRE PETS AI Service", version="1.1.0")

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_FILES = 20

_redis = None
try:
    import redis  # type: ignore

    _redis = redis.Redis(
        host=os.getenv("REDIS_HOST", "127.0.0.1"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        socket_timeout=2,
    )
except Exception:
    _redis = None


def _cache_get(key: str):
    if _redis is None:
        return None
    try:
        raw = _redis.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def _cache_set(key: str, value: dict, ttl: int = 3600) -> None:
    if _redis is None:
        return
    try:
        _redis.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": llm.MODEL}


@app.post("/verify-analysis")
async def verify_analysis(files: list[UploadFile] = File(...)) -> dict:
    if not files or len(files) > MAX_FILES:
        raise HTTPException(400, "Oczekiwano 1-20 plików.")
    texts = []
    for f in files:
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(413, f"Plik {f.filename} przekracza 10 MB.")
        digest = hashlib.sha256(data).hexdigest()
        cache_key = f"ocr:{digest}"
        cached = _cache_get(cache_key)
        if cached is not None:
            texts.append(cached)
            continue
        text = ocr.extract_text(f.filename or "plik", data)
        _cache_set(cache_key, text, ttl=86400)
        texts.append(text)

    prompt_hash = hashlib.sha256("\n".join(texts).encode()).hexdigest()[:32]
    cache_key = f"analysis:{prompt_hash}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    llm_result = await llm.analyze("\n".join(texts))
    result = risk.merge(llm_result, texts)
    _cache_set(cache_key, result, ttl=3600)
    return result


class ModerateRequest(BaseModel):
    text: str


@app.post("/moderate")
def moderate_text(req: ModerateRequest) -> dict:
    return moderation.moderate(req.text)


class AssistantRequest(BaseModel):
    question: str


@app.post("/assistant")
async def assistant(req: AssistantRequest) -> dict:
    question = req.question.strip()[:1000]
    if not question:
        raise HTTPException(400, "Puste pytanie.")
    cache_key = "assistant:" + hashlib.sha256(question.lower().encode()).hexdigest()[:32]
    cached = _cache_get(cache_key)
    if cached:
        return cached
    result = await llm.answer(question)
    if result is None or not result.get("answer"):
        return {"answer": None}
    _cache_set(cache_key, result, ttl=86400)
    return result

