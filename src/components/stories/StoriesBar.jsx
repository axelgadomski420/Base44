import { useEffect, useRef, useState } from "react";
import { Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { storiesApi } from "@/api/base44Client";
import StoryComposer, { filterCss } from "@/components/stories/StoryComposer";
import { cn } from "@/lib/utils";

/**
 * StoriesBar + StoryViewer — pełnoekranowe relacje (24 h) z paskiem czasu,
 * automatycznym przejściem, reakcjami, filtrami, nakładką i muzyką.
 */
export function StoriesBar({ onOpen }) {
  const [groups, setGroups] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);

  const reload = () => storiesApi.list().then((r) => setGroups(r?.groups ?? [])).catch(() => null);

  useEffect(() => {
    reload();
  }, []);

  return (
    <>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-3">
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex h-24 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border/70 text-muted-foreground transition hover:border-aura/60 hover:text-aura"
        >
          <Plus className="h-5 w-5" />
          <span className="text-[9px] uppercase tracking-wider">Relacja</span>
        </button>
        {groups.map((g) => (
          <button
            key={g.author_id}
            type="button"
            onClick={() => onOpen?.(g)}
            className="relative h-24 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-aura/60"
          >
            <img src={g.stories[0]?.media_url} alt="" className="h-full w-full object-cover" style={{ filter: filterCss(g.stories[0]?.filter) }} />
            <span className="absolute bottom-1 left-1 right-1 truncate text-[9px] font-semibold text-white drop-shadow">
              {g.author_name}
            </span>
          </button>
        ))}
      </div>
      {composerOpen && <StoryComposer onClose={() => setComposerOpen(false)} onPublished={reload} />}
    </>
  );
}

export function StoryViewer({ group, onClose }) {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reacted, setReacted] = useState(null);
  const [muted, setMuted] = useState(true);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const stories = group?.stories ?? [];
  const current = stories[idx];

  useEffect(() => {
    if (!current) return;
    storiesApi.view(current.id).catch(() => null);
    setProgress(0);
    const duration = current.media_type === "video" ? 15000 : 5000;
    const started = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / duration) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current);
        if (idx + 1 < stories.length) setIdx(idx + 1);
        else onClose?.();
      }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [idx, current, stories.length, onClose]);

  // Muzyka relacji (30 s podgląd z iTunes lub biblioteka PURRE).
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (current?.music_url && !current.media_type?.includes("video")) {
      const audio = new Audio(current.music_url);
      audio.loop = true;
      audio.muted = muted;
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.play().catch(() => null);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [current, muted]);

  if (!current) return null;

  const react = async (emoji) => {
    setReacted(emoji);
    storiesApi.react(current.id, emoji).catch(() => null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex gap-1 px-3 pt-3">
        {stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded bg-white/25">
            <div
              className="h-full bg-white transition-[width] duration-100"
              style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-4 py-2">
        <img src={group.author_avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        <span className="text-sm font-semibold text-white">{group.author_name}</span>
        <span className="text-[10px] text-white/60">
          {new Date(current.created_date).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
        </span>
        {current.music_url && (
          <button type="button" onClick={() => setMuted((m) => !m)} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white">
            {muted ? "♪ wyciszone" : "♪ gra"}
          </button>
        )}
        <button type="button" onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex-1" onClick={() => (idx + 1 < stories.length ? setIdx(idx + 1) : onClose?.())}>
        {current.media_type === "video" ? (
          <video src={current.media_url} autoPlay playsInline className="h-full w-full object-contain" style={{ filter: filterCss(current.filter) }} />
        ) : (
          <img src={current.media_url} alt="" className="h-full w-full object-contain" style={{ filter: filterCss(current.filter) }} />
        )}
        {current.overlay_text && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <span className="rounded-lg bg-black/35 px-3 py-1.5 text-center text-base font-semibold text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}>
              {current.overlay_text}
            </span>
          </div>
        )}
        {current.caption && (
          <p className="absolute bottom-20 left-0 right-0 px-6 text-center text-sm text-white drop-shadow">{current.caption}</p>
        )}
        {(current.music_title || current.music_url) && (
          <p className="absolute bottom-32 left-4 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-[10px] text-white">
            ♫ {current.music_title || "Muzyka"}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 pb-8">
        {["❤️", "😂", "😮", "🔥"].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              react(emoji);
            }}
            className={cn("grid h-11 w-11 place-items-center rounded-full bg-white/10 text-xl transition", reacted === emoji && "bg-aura/40 scale-110")}
          >
            {emoji}
          </button>
        ))}
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[10px] text-white/70">
          <Send className="h-3 w-3" /> {current.views ?? 0} wyświetleń
        </div>
      </div>
    </div>
  );
}
