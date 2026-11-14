import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Image as ImageIcon, Lock, MoreVertical, Search, Send, Smile, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { base44, messagesApi } from "@/api/base44Client";
import { decryptFrom, encryptFor, ensureE2eKeys } from "@/lib/e2e";
import { cn } from "@/lib/utils";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const ME = () => {
  try {
    return JSON.parse(localStorage.getItem("purre:user") || "null");
  } catch {
    return null;
  }
};

/**
 * ChatWindow — messenger w stylu Meta/Messenger:
 *  • szyfrowanie end-to-end (ECDH P-256 + AES-GCM) — serwer nie widzi treści,
 *  • zdjęcia i wideo, statusy dostarczono/odczytano, „pisze…”,
 *  • reakcje emoji, usuwanie wiadomości, wyszukiwarka konwersacji.
 */
export default function ChatWindow({ conversationId, peer, onClose }) {
  const me = ME();
  const myId = me?.id ?? me?.user_id ?? null;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState([]);
  const [e2eReady, setE2eReady] = useState(false);
  const [search, setSearch] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const peerId = peer?.user_id ?? peer?.id ?? null;

  const decryptAll = useCallback(async (items) => {
    return Promise.all(
      items.map(async (m) => ({
        ...m,
        plain: m.e2e && m.sender_id !== myId
          ? await decryptFrom(m.sender_id, m, { fetchKeys: (id) => base44.e2e.keys(id) })
          : m.e2e
            ? await decryptFrom(peerId, m, { fetchKeys: (id) => base44.e2e.keys(id) }).catch(() => m.content)
            : m.content,
      }))
    );
  }, [myId, peerId]);

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await messagesApi.messages(conversationId);
      setMessages(await decryptAll(res.items ?? []));
    } catch (err) {
      toast.error(err?.message ?? "Nie udało się wczytać rozmowy");
    }
  }, [conversationId, decryptAll]);

  useEffect(() => {
    (async () => {
      try {
        await ensureE2eKeys((body) => base44.e2e.register(body));
        setE2eReady(true);
      } catch {
        setE2eReady(false);
      }
      load();
    })();
  }, [load]);

  // Polling: nowe wiadomości + wskaźnik „pisze…”
  useEffect(() => {
    if (!conversationId) return;
    const timer = setInterval(() => {
      load();
      messagesApi.typing(conversationId).then((r) => setTyping(r.typing ?? [])).catch(() => null);
    }, 4000);
    return () => clearInterval(timer);
  }, [conversationId, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const signalTyping = () => {
    if (conversationId) messagesApi.typingSignal(conversationId).catch(() => null);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    try {
      let payload;
      if (peerId && e2eReady) {
        const enc = await encryptFor(peerId, text, { fetchKeys: (id) => base44.e2e.keys(id) });
        payload = enc
          ? { conversation_id: conversationId, recipient_id: peerId, ciphertext: enc.ciphertext, iv: enc.iv, e2e: true }
          : { conversation_id: conversationId, recipient_id: peerId, content: text };
      } else {
        payload = { conversation_id: conversationId, recipient_id: peerId, content: text };
      }
      const res = await messagesApi.send(payload);
      setMessages((m) => [...m, { ...res.message, plain: text }]);
    } catch (err) {
      setInput(text);
      toast.error(err?.message ?? "Nie udało się wysłać");
    } finally {
      setBusy(false);
    }
  };

  const sendMedia = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const up = await base44.integrations.Core.UploadPublicFile({ file });
      const media_type = file.type.startsWith("video") ? "video" : "image";
      const res = await messagesApi.send({
        conversation_id: conversationId,
        recipient_id: peerId,
        media_url: up.file_url,
        media_type,
      });
      setMessages((m) => [...m, { ...res.message, plain: "" }]);
    } catch (err) {
      toast.error(err?.message ?? "Upload nie powiódł się");
    } finally {
      setBusy(false);
    }
  };

  const react = async (m, emoji) => {
    setMenuFor(null);
    try {
      await messagesApi.react(m.id, emoji);
      load();
    } catch {}
  };

  const remove = async (m) => {
    setMenuFor(null);
    try {
      await messagesApi.remove(m.id);
      setMessages((list) => list.filter((x) => x.id !== m.id));
    } catch {}
  };

  const visible = search.trim()
    ? messages.filter((m) => (m.plain || "").toLowerCase().includes(search.trim().toLowerCase()))
    : messages;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <img src={peer?.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{peer?.display_name || peer?.name || "Rozmowa"}</p>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Szyfrowanie end-to-end
            {typing.length > 0 && <span className="ml-1 text-aura">· pisze…</span>}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj…"
            className="h-8 w-32 rounded-xl border border-border/60 bg-background/50 pl-7 pr-2 text-xs outline-none"
          />
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-xs text-muted-foreground">
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {visible.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}>
              {!mine && (
                <button
                  type="button"
                  onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100"
                  aria-label="Reakcja"
                >
                  <Smile className="h-4 w-4" />
                </button>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "bg-aura/25 text-foreground" : "bg-secondary/60 text-foreground"
                )}
              >
                {m.media_url && (
                  m.media_type === "video" ? (
                    <video src={m.media_url} controls className="mb-1 max-h-56 rounded-xl" />
                  ) : (
                    <img src={m.media_url} alt="" className="mb-1 max-h-56 rounded-xl object-cover" />
                  )
                )}
                {m.e2e && (
                  <p className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" /> e2e
                  </p>
                )}
                {m.plain || (m.e2e ? "🔒 …" : "")}
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
                  {m.reactions?.length > 0 && <span>{m.reactions.map((r) => r.emoji).join("")}</span>}
                  <span>{new Date(m.created_date).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && (m.read ? <CheckCheck className="h-3 w-3 text-aura" /> : m.delivered ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
              {mine && (
                <button
                  type="button"
                  onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100"
                  aria-label="Opcje"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              )}
              {menuFor === m.id && (
                <div className="absolute z-10 mt-24 rounded-xl border border-border/70 bg-card p-2 shadow-xl">
                  <div className="flex gap-1">
                    {REACTIONS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => react(m, emoji)} className="text-lg">
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {m.sender_id === myId && (
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      className="mt-2 flex w-full items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" /> Usuń dla wszystkich
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 p-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            sendMedia(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl border border-border/60" aria-label="Zdjęcie lub wideo">
          <ImageIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="hidden" aria-label="Wideo">
          <Video className="h-4 w-4" />
        </button>
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            signalTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Napisz wiadomość…"
          className="h-10 flex-1 rounded-xl border border-border/60 bg-background/50 px-3 text-sm outline-none"
        />
        <button type="button" onClick={send} disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl bg-aura text-black disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
