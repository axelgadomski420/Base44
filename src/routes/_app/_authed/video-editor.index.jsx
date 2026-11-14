import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";

export const Route = createFileRoute("/_app/_authed/video-editor/")({
  head: () => ({ meta: [{ title: "PURRE PETS — Edytor wideo" }] }),
  component: VideoEditorPage,
});

const FILTERS = [
  { id: "none", label: "Oryginał", css: "none" },
  { id: "aurora", label: "Aurora", css: "saturate(1.35) contrast(1.08) hue-rotate(18deg)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.15)" },
  { id: "warm", label: "Warm", css: "sepia(0.35) saturate(1.25)" },
  { id: "cool", label: "Cool", css: "saturate(0.95) hue-rotate(190deg) brightness(1.05)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.7) contrast(1.12)" },
  { id: "dream", label: "Dream", css: "contrast(0.92) brightness(1.08) saturate(0.8)" },
];

const SPEEDS = [0.5, 1, 1.5, 2];

function VideoEditorPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const urlRef = useRef("");
  const [src, setSrc] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [filter, setFilter] = useState(FILTERS[1]);
  const [caption, setCaption] = useState("");
  const [speed, setSpeed] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(urlRef.current), []);

  const choose = (file) => {
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setSrc(url);
    setStart(0);
    setEnd(0);
  };

  const onLoaded = () => {
    const video = videoRef.current;
    if (!video) return;
    const length = Number.isFinite(video.duration) ? video.duration : 0;
    setDuration(length);
    setEnd(length);
    video.playbackRate = speed;
  };

  const onTime = () => {
    const video = videoRef.current;
    if (!video || !end) return;
    if (video.currentTime >= end) {
      video.pause();
      video.currentTime = start;
    }
  };

  const playTrim = () => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    video.currentTime = start;
    video.play().catch(() => toast.error("Przeglądarka zablokowała odtwarzanie"));
  };

  const drawFrame = (video, context, width, height) => {
    context.filter = filter.css;
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const dw = video.videoWidth * scale;
    const dh = video.videoHeight * scale;
    context.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh);
    context.filter = "none";
    if (caption.trim()) {
      context.fillStyle = "rgba(5,5,7,0.55)";
      context.fillRect(24, height - 140, width - 48, 88);
      context.fillStyle = "#f6f3ee";
      context.font = "700 36px Georgia, serif";
      context.fillText(caption.trim().slice(0, 42), 44, height - 86);
    }
  };

  const cover = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = 720;
    canvas.height = 1280;
    drawFrame(video, canvas.getContext("2d"), canvas.width, canvas.height);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.download = "purre-cover.jpg";
    link.click();
  };

  const exportClip = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      toast.error("Ta przeglądarka nie umie zapisać WebM — zostaje podgląd i okładka.");
      return;
    }
    setExporting(true);
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext("2d");
    video.pause();
    video.currentTime = start;
    await new Promise((resolve) => {
      video.onseeked = () => resolve();
    });
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const done = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    video.playbackRate = speed;
    await video.play();
    const paint = () => {
      if (video.currentTime >= end || video.ended) {
        video.pause();
        recorder.stop();
        return;
      }
      drawFrame(video, context, canvas.width, canvas.height);
      requestAnimationFrame(paint);
    };
    paint();
    await done;
    const blob = new Blob(chunks, { type: "video/webm" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "purre-reel.webm";
    link.click();
    setExporting(false);
    toast.success("Klip zapisany jako WebM");
  };

  return (
    <div>
      <TopBar title="Edytor" />
      <div className="px-4 pb-12 pt-6 lg:px-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">reels studio</p>
        <h1 className="mt-2 font-display text-4xl">
          <span className="aura-text">Edytor wideo</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Przytnij początek i koniec, nałóż filtr i napis, zapisz okładkę albo krótki pionowy WebM. Dźwięk oryginału zostaje w podglądzie.
        </p>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center">
          <span className="text-sm">Wybierz wideo z telefonu lub komputera</span>
          <span className="mt-1 text-[11px] text-muted-foreground">MP4, WebM, MOV</span>
          <input type="file" accept="video/*" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} />
        </label>

        {src && (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[320px_1fr]">
            <div className="overflow-hidden rounded-[var(--radius)] border border-border/70 bg-black">
              <video
                ref={videoRef}
                src={src}
                playsInline
                controls={false}
                onLoadedMetadata={onLoaded}
                onTimeUpdate={onTime}
                className="aspect-[9/16] w-full object-cover"
                style={{ filter: filter.css }}
              />
              {caption && (
                <p className="-mt-16 px-4 pb-6 text-center font-display text-xl text-white drop-shadow">{caption}</p>
              )}
            </div>
            <div className="space-y-4">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Start {start.toFixed(1)} s
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step={0.1}
                  value={start}
                  onChange={(event) => setStart(Math.min(Number(event.target.value), end - 0.2))}
                  className="mt-2 w-full"
                />
              </label>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Koniec {end.toFixed(1)} s
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step={0.1}
                  value={end}
                  onChange={(event) => setEnd(Math.max(Number(event.target.value), start + 0.2))}
                  className="mt-2 w-full"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {SPEEDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSpeed(value);
                      if (videoRef.current) videoRef.current.playbackRate = value;
                    }}
                    className={`rounded-full px-3 py-1.5 text-[11px] ${speed === value ? "bg-foreground text-background" : "border border-border/70"}`}
                  >
                    {value}×
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-3 py-1.5 text-[11px] ${filter.id === item.id ? "bg-aura text-background" : "border border-border/70"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <input
                value={caption}
                maxLength={42}
                placeholder="Napis na klipie"
                onChange={(event) => setCaption(event.target.value)}
                className="w-full rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={playTrim} className="rounded-xl border border-border/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  Odtwórz fragment
                </button>
                <button type="button" onClick={cover} className="rounded-xl border border-border/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  Okładka JPG
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={exportClip}
                  className="btn-aura rounded-xl px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                >
                  {exporting ? "Eksport…" : "Zapisz WebM"}
                </button>
              </div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
