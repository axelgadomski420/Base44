// Wspólny klient Ollama (lokalny LLM) z timeoutem i obsługą błędów.
import { config } from "../config.js";

export async function ollamaGenerate(prompt, { system, model, timeoutMs = 60000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.ollamaUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: model || config.ollamaModel,
        prompt,
        ...(system ? { system } : {}),
        stream: false,
        options: { temperature: 0.4 },
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    const data = await response.json();
    return { ok: true, text: (data.response ?? "").trim() };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err), text: "" };
  } finally {
    clearTimeout(timer);
  }
}

export async function ollamaHealth() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${config.ollamaUrl.replace(/\/$/, "")}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return { online: false };
    const data = await response.json();
    return { online: true, models: (data.models ?? []).map((m) => m.name) };
  } catch {
    return { online: false };
  }
}
