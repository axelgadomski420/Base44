"""Heurystyki ryzyka (fallback) + fuzja z wynikiem LLM. Wynik 0-100, wyżej = większe ryzyko."""
import re

REQUIRED_SIGNALS = [
    (r"zkwp|związek kynologiczny|kynologiczn", 25, "wzmianka o ZKwP/organizacji kynologicznej"),
    (r"fci|fédération|federation", 15, "wzmianka o FCI"),
    (r"klub|rasy|rasow", 10, "wzmianka o klubie rasowym"),
    (r"nr|numer|rejestr|regestr", 15, "numer rejestracji"),
    (r"legitymacj|zaświadczen|zaswiadczen|certyfikat|wypis", 15, "dokument potwierdzający"),
    (r"\d{3,}", 10, "numer identyfikacyjny w tekście"),
]


def heuristic_risk(texts: list[str]) -> tuple[int, list[str]]:
    full = "\n".join(texts).lower()
    score = 100
    flags: list[str] = []
    for pattern, weight, label in REQUIRED_SIGNALS:
        if re.search(pattern, full):
            score -= weight
        else:
            flags.append(f"MISSING:{label}")
    if len("".join(texts).strip()) < 80:
        score += 20
        flags.append("MISSING:za mało tekstu z OCR")
    return max(0, min(100, score)), flags


def merge(llm: dict | None, texts: list[str]) -> dict:
    base_score, base_flags = heuristic_risk(texts)
    if not llm:
        return {
            "risk_score": base_score,
            "analysis": "Analiza heurystyczna (LLM niedostępny) — wymagana decyzja administratora.",
            "flags": base_flags + ["AI_FALLBACK"],
        }
    try:
        llm_score = int(llm.get("risk_score", base_score))
    except (TypeError, ValueError):
        llm_score = base_score
    llm_score = max(0, min(100, llm_score))
    score = round(0.5 * base_score + 0.5 * llm_score)
    flags = sorted(set(base_flags) | set(str(f) for f in (llm.get("flags") or [])))
    analysis = str(llm.get("analysis", ""))[:1200] or "Analiza LLM bez opisu."
    return {"risk_score": score, "analysis": analysis, "flags": flags}
