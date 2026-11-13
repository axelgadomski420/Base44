import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/_authed/messages/$id")({
  head: () => ({ meta: [{ title: "PURRE PETS — rozmowa" }] }),
  component: ThreadPage,
});

function ThreadPage() {
  const { id } = useParams({ from: "/_app/_authed/messages/$id" });
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.entities.Conversation.get(id).then(setConversation);
  }, [id]);

  useEffect(() => {
    let active = true;
    base44.entities.Message.filter({ conversation_id: id }, { sort: "created_date", limit: 200 }).then(
      (page) => {
        if (active) setMessages(page.items ?? []);
      }
    );
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== id) return;
      setMessages((prev) => {
        if (event.type === "create") {
          if (prev.some((message) => message.id === event.data.id)) return prev;
          return [...prev, event.data];
        }
        if (event.type === "delete") return prev.filter((message) => message.id !== event.data.id);
        return prev.map((message) => (message.id === event.data.id ? event.data : message));
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const content = draft.trim();
    if (!content || !user?.id || !conversation) return;
    setSending(true);
    setDraft("");
    try {
      await base44.entities.Message.create({
        conversation_id: id,
        members: conversation.members ?? [],
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        content,
        seen: false,
      });
      await base44.entities.Conversation.update(id, {
        last_message: content,
        last_sender_id: user.id,
        last_message_at: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  };

  const otherName =
    conversation?.member_names?.[
      (conversation.members ?? []).findIndex((member) => member !== user?.id)
    ] || t("messages.conversation");

  return (
    <div className="flex h-[100dvh] flex-col lg:h-screen">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate({ to: "/messages" })}
          className="grid h-9 w-9 place-items-center rounded-xl border border-border/70"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{otherName}</p>
          {conversation?.listing_title && (
            <p className="truncate text-[10px] text-aura">#{conversation.listing_title}</p>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-xs text-muted-foreground">{t("messages.startChat")}</p>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === user?.id;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                  mine
                    ? "bg-gradient-to-br from-violet to-violet/70 text-white"
                    : "border border-border/70 bg-card/70 text-foreground"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/60 bg-background/90 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={t("messages.startChat")}
            className="h-11 flex-1 rounded-xl border border-border/70 bg-card/60 px-3 text-sm outline-none focus:border-violet/60"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !draft.trim()}
            className="btn-aura grid h-11 w-11 place-items-center rounded-xl disabled:opacity-50"
            aria-label={t("common.send")}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
