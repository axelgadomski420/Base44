import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler } from "../lib/errors.js";

export const assistantRouter = Router();

const askSchema = z.object({ question: z.string().min(2).max(600) });

// POST /api/assistant/ask â replaces the askAssistant server function
// (Base44's InvokeLLM). Ships a helpful rule-based fallback; set
// ASSISTANT_LLM_URL / ASSISTANT_LLM_KEY to plug a real LLM provider.
assistantRouter.post(
  "/ask",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { question } = askSchema.parse(req.body);

    if (process.env.ASSISTANT_LLM_URL && process.env.ASSISTANT_LLM_KEY) {
      try {
        const response = await fetch(process.env.ASSISTANT_LLM_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ASSISTANT_LLM_KEY}` },
          body: JSON.stringify({
            prompt: `JesteÅ PURRE Assistant â asystentem marketplace'u hodowlanego PURRE PETS dla psÃ³w i kotÃ³w rasowych w Polsce. Odpowiadaj po polsku, rzeczowo, maksymalnie 900 znakÃ³w. Nie diagnozuj chorÃ³b â przy problemach zdrowotnych odeÅlij do weterynarza. Nie pomagaj w omijaniu prawa ani w handlu zwierzÄtami bez dokumentacji. Pytanie uÅ¼ytkownika: ${question}`,
          }),
        });
        if (response.ok) {
          const parsed = await response.json().catch(() => null);
          const answer = typeof parsed === "string" ? parsed : (parsed?.content ?? parsed?.answer ?? "");
          if (answer) return res.json({ answer: String(answer) });
        }
      } catch {
        // fall through to the local answer
      }
    }

    const q = question.toLowerCase();
    let answer;
    if (/ras|rodowÃ³d|pedigree|hodowl/.test(q)) {
      answer =
        "W PURRE PETS ogÅoszenia dodajÄ konta hodowcy. Warto wybieraÄ hodowle z weryfikacjÄ (Odznaka zaufania) i dokumentacjÄ rodowodowÄ. SprawdÅº sekcjÄ âBezpieczeÅstwoâ na karcie ogÅoszenia i nigdy nie wysyÅaj zaliczki przed umowÄ i wizytÄ w hodowli.";
    } else if (/bezpiecz|oszust|zaliczk|pÅatnoÅ/.test(q)) {
      answer =
        "Zasady bezpieczeÅstwa: umawiaj wizytÄ w hodowli, podpisuj umowÄ, nie wysyÅaj zaliczek przed obejrzeniem zwierzaka, korzystaj z pÅatnoÅci Åledzonych. OgÅoszenia z wysokim ryzykiem oznaczamy jako âw trakcie weryfikacjiâ.";
    } else if (/coin|monet|arcade|gr|poziom|xp/.test(q)) {
      answer =
        "PURRE coiny zdobywasz w Arcade (2048, Memory, Quiz) â codzienna gra z zakÅadki Arcade daje dodatkowy bonus. Monety wymienisz w zakÅadce Nagrody na boosty, ramki, odznaki i dodatkowe media.";
    } else if (/ogÅoszen|dodaÄ|sprzedaÅ¼|wystawi/.test(q)) {
      answer =
        "OgÅoszenie dodasz w zakÅadce âDodajâ: przeÅÄcz konto na hodowcÄ, wypeÅnij formularz i wgraj zdjÄcie. Pierwsze ogÅoszenie jest darmowe, kolejne kosztujÄ 20 PURRE coinÃ³w. KaÅ¼de ogÅoszenie przechodzi automatycznÄ moderacjÄ.";
    } else {
      answer =
        "Jestem PURRE Assistant. MogÄ pomÃ³c w tematach: bezpieczne kupno zwierzaka, ogÅoszenia i konto hodowcy, coiny i nagrody w Arcade. PamiÄtaj â w kwestiach zdrowotnych zawsze konsultuj siÄ z weterynarzem.";
    }

    res.json({ answer: answer.slice(0, 900) });
  })
);
