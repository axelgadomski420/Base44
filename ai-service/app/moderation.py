"""Moderacja tekstu: reguły + opcjonalny LLM. Zwraca decyzję i powody."""
import re

BLOCK_PATTERNS = [
    (r"\b(kupię|sprzedam)\b.{0,30}\b(bez (rodowodu|papierów)|bez metryki)\b", "ogłoszenie bez rodowodu"),
    (r"\b(wysyłka|transport)\b.{0,30}\b(kurier|paczką|przesyłką)\b.{0,30}\b(szcz|szczeni|kot|koci)\b", "wysyłka żywych zwierząt"),
    (r"\b(tanio|okazja)\b.{0,40}\b(szcz|szczeni|koci)\b", "podejrzenie pseudohodowli"),
]


def moderate(text: str) -> dict:
    reasons = []
    text_lower = (text or "").lower()
    for pattern, label in BLOCK_PATTERNS:
        if re.search(pattern, text_lower):
            reasons.append(label)
    return {"flagged": bool(reasons), "reasons": reasons}
