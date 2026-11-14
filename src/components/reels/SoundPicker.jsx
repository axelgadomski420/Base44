import { useRef, useState } from "react";
import { Music2, Pause, Play, Volume2 } from "lucide-react";
import { FREE_SFX, FREE_TRACKS, playBeep } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export default function SoundPicker({ value, onChange, className }) {
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [tab, setTab] = useState("music");
  const list = tab === "music" ? FREE_TRACKS : FREE_SFX;

  const preview = async (track) => {
    try {
      if (playingId === track.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(track.url);
      audio.volume = 0.55;
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      await audio.play();
      setPlayingId(track.id);
    } catch {
      playBeep(tab === "sfx" ? 660 : 440, 150);
      setPlayingId(null);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card/50 p-3", className)}>
      <div className="flex items-center gap-2">
        <Music2 className="h-4 w-4 text-aura" />
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Dźwięk · darmowy</p>
      </div>
      <div className="mt-2 flex gap-2">
        {[
          { id: "music", label: "Muzyka" },
          { id: "sfx", label: "SFX" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-3 py-1 text-[10px] uppercase tracking-wider",
              tab === t.id ? "bg-foreground text-background" : "border border-border/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
        {list.map((track) => {
          const selected = value?.id === track.id;
          const isPlaying = playingId === track.id;
          return (
            <li
              key={track.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-2 text-sm",
                selected ? "bg-aura/15 ring-1 ring-aura/40" : "hover:bg-secondary/40"
              )}
            >
              <button type="button" className="grid h-8 w-8 place-items-center rounded-full border border-border/60" onClick={() => preview(track)}>
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onChange?.(track)}>
                <p className="truncate font-medium">{track.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {track.mood || "sfx"} {track.duration ? `· ${track.duration}` : ""} · Mixkit
                </p>
              </button>
              {selected && <Volume2 className="h-3.5 w-3.5 shrink-0 text-aura" />}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[9px] text-muted-foreground">Źródło: Mixkit (free stock) — bez opłat licencyjnych.</p>
    </div>
  );
}
