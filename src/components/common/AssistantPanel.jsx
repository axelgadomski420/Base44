import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import { askAssistant } from "@/lib/server-fns";

export default function AssistantPanel() {
  const { t } = useI18n();
  const { isAuthenticated, navigateToLogin } = useAuth();
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = question.trim();
    if (!text || busy) return;
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    setThread((prev) => [...prev, { role: "user", text }]);
    setQuestion("");
    setBusy(true);
    try {
      const { answer } = await ask({ data: { question: text } });
      setThread((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (error) {
      setThread((prev) => [
        ...prev,
        { role: "assistant", text: error?.message ?? "Asystent jest chwilowo niedostępny." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-violet to-aura px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-background shadow-[0_18px_40px_-18px_hsl(var(--violet))] lg:bottom-6 lg:right-6"
      >
        <Sparkles className="h-4 w-4" /> Assistant
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-0 backdrop-blur-sm sm:p-6">
          <div className="flex h-[80vh] w-full max-w-md flex-col rounded-t-[var(--radius)] border border-border/70 bg-card/95 sm:rounded-[var(--radius)]">
            <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <Sparkles className="h-4 w-4 text-aura" />
              <p className="text-sm font-semibold">{t("assistant.title")}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-border/70"
                aria-label={t("common.cancel")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {thread.length === 0 && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Zapytaj o rasę, opiekę, dokumenty hodowlane albo bezpieczeństwo ogłoszenia.
                </p>
              )}
              {thread.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-violet/25 text-foreground"
                      : "border border-border/60 bg-background/40"
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("common.loading")}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border/60 p-3">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") send();
                }}
                placeholder={t("assistant.placeholder")}
                className="h-10 flex-1 rounded-xl border border-border/70 bg-background/40 px-3 text-[12px] outline-none focus:border-violet/60"
              />
              <button
                type="button"
                onClick={send}
                disabled={busy || !question.trim()}
                className="btn-aura grid h-10 w-10 place-items-center rounded-xl disabled:opacity-50"
                aria-label={t("assistant.send")}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
