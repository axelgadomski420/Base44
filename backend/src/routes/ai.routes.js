import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { requireAuth, isModerator } from "../lib/auth.js";
import { asyncHandler, badRequest, forbidden } from "../lib/errors.js";
import { ollamaGenerate, ollamaHealth } from "../lib/ollama.js";

const router = express.Router();

// GET /api/ai/health — status Ollama dla panelu admina i asystenta.
router.get("/health", async (_req, res) => {
  const health = await ollamaHealth();
  res.json({ ollama: health.online, model: config.ollamaModel, models: health.models ?? [] });
});

// POST /api/ai/chat — asystent PURRE (Ollama). Przyjmuje { prompt | message, history }.
router.post("/chat", async (req, res) => {
  const body = req.body ?? {};
  const prompt = (body.prompt ?? body.message ?? "").toString().trim();
  if (!prompt) return res.status(400).json({ error: "Brak promptu" });
  if (prompt.length > 4000) return res.status(400).json({ error: "Prompt za długi (max 4000 znaków)" });

  const history = Array.isArray(body.history)
    ? body.history.slice(-8).map((m) => `${m.role === "user" ? "Użytkownik" : "Asystent"}: ${String(m.text ?? m.content ?? "").slice(0, 500)}`).join("\n")
    : "";

  const system = `Jesteś PURRE Assistant — pomocnym asystentem polskiej społeczności miłośników psów i kotów "PURRE PETS".
Odpowiadasz ZAWSZE po polsku, zwięźle i konkretnie. Pomagasz w tematach: hodowla, adopcje, bezpieczne kupno zwierzaka, ogłoszenia, PURRE Coins, edytor wideo (rolki) i obsługa aplikacji.`;

  const result = await ollamaGenerate(history ? `${history}\nUżytkownik: ${prompt}\nAsystent:` : prompt, { system });
  if (!result.ok) {
    console.error("Błąd LLM:", result.error);
    return res.status(503).json({ error: "Model AI jest niedostępny. Spróbuj ponownie za chwilę." });
  }
  res.json({ response: result.text, answer: result.text, model: config.ollamaModel });
});

// POST /api/ai/verify-breeder — automatyczna analiza wniosku hodowcy przez LLM.
router.post("/verify-breeder", requireAuth, isModerator, asyncHandler(async (req, res) => {
  const id = String(req.body?.id ?? "").trim();
  if (!id) throw badRequest("Brak id wniosku");
  const request = await prisma.verificationRequest.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ error: "Nie znaleziono wniosku" });

  const profile = await prisma.profile.findFirst({ where: { user_id: request.user_id } });
  const prompt = `Przeanalizuj wniosek weryfikacji hodowcy w serwisie PURRE PETS i oceń jego wiarygodność.

Dane wniosku:
- Nazwa hodowli: ${request.kennel_name}
- Numer rejestru: ${request.registry_no || "brak"}
- Miasto: ${request.city || "brak"}
- Gatunek: ${request.species || "brak"}
- Opis / notatka: ${request.note || "brak"}
- Dokument: ${request.document_url || "brak"}
- Profil: bio=${profile?.bio || "brak"}, miasto=${profile?.city || "brak"}, obserwujący=${profile?.followers ?? 0}

Odpowiedz WYŁĄCZNIE w formacie JSON:
{"score": <0-100>, "recommendation": "<approve|reject|manual>", "reasoning": "<2-3 zdania po polsku>", "missing": ["<brakujące elementy>"]}`;

  const result = await ollamaGenerate(prompt, { timeoutMs: 90000 });
  let parsed = null;
  if (result.ok) {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
    }
  }

  const score = typeof parsed?.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : null;
  const updated = await prisma.verificationRequest.update({
    where: { id: request.id },
    data: {
      ai_recommendation: parsed?.recommendation ?? "manual",
      ai_score: score,
      ai_analyzed_at: new Date(),
      ai_reasoning: (parsed?.reasoning ?? (result.ok ? result.text.slice(0, 1000) : "Analiza LLM niedostępna")).slice(0, 1000),
    },
  });
  res.json({ request: updated, llm_ok: result.ok });
}));

export default router;
