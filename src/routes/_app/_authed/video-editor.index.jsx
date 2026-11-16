import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ensureProfile } from "@/lib/useProfile";
import { renderStudioFrame, STUDIO_FILTERS } from "@/lib/purre-studio";

export const Route = createFileRoute("/_app/_authed/video-editor/")({
  head: () => ({ meta: [{ title: "PURRE PETS — Edytor wideo" }] }),
  component: VideoEditorPage,
});

const FILTERS = STUDIO_FILTERS;

const SPEEDS = [0.5, 1, 1.5, 2];

function VideoEditorPage() {
  const navigate = useNavigate();
  const { user, navigateToLogin } = useAuth();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const urlRef = useRef("");
  const exportingRef = useRef(false);

  const [src, setSrc] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [filter, setFilter] = useState(FILTERS[1]);
  const [caption, setCaption] = useState("");
  const [speed, setSpeed] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const choose = (file) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Wybierz plik wideo.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Film może mieć maksymalnie 100 MB.");
      return;
    }

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);

    const url = URL.createObjectURL(file);
    urlRef.current = url;

    setSrc(url);
    setStart(0);
    setEnd(0);
    setDuration(0);
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
    if (!video || exportingRef.current || !end) return;

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
    video.play().catch(() => toast.error("Nie udało się odtworzyć filmu."));
  };

  const drawFrame = (video, context, width, height) => {
    if (!video?.videoWidth || !video?.videoHeight || !context?.canvas) return;

    renderStudioFrame(video, context.canvas, {
      width,
      height,
      format: "reel",
      filter: filter.id,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      text: caption.trim().slice(0, 120),
      textOptions: {
        fontSize: 36,
        fontFamily: "Georgia, serif",
        fontWeight: 700,
        position: "bottom",
        background: true,
        backgroundColor: "rgba(5,5,7,0.58)",
        color: "#f6f3ee",
      },
    });
  };

  const cover = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth) {
      toast.error("Najpierw wybierz film.");
      return;
    }

    canvas.width = 720;
    canvas.height = 1280;

    drawFrame(video, canvas.getContext("2d"), canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Nie udało się przygotować okładki.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "purre-cover.jpg";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Okładka została zapisana.");
    }, "image/jpeg", 0.92);
  };

  const exportClip = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!user) {
      navigateToLogin();
      return;
    }

    if (!video || !canvas || !video.videoWidth || !duration) {
      toast.error("Najpierw wybierz poprawny film.");
      return;
    }

    if (typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      toast.error("Ta przeglądarka nie obsługuje eksportu wideo.");
      return;
    }

    const clipStart = Math.max(0, start);
    const clipEnd = Math.min(end, duration);

    if (clipEnd - clipStart < 0.2) {
      toast.error("Wybierz fragment filmu o długości co najmniej 0,2 sekundy.");
      return;
    }

    exportingRef.current = true;
    setExporting(true);

    let outputStream;
    let audioStream;
    let recorder;
    let animationId;

    try {
      canvas.width = 720;
      canvas.height = 1280;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Nie można uruchomić eksportu obrazu.");

      video.pause();

      if (Math.abs(video.currentTime - clipStart) > 0.01) {
        await new Promise((resolve, reject) => {
          const onSeeked = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("Nie udało się ustawić początku filmu."));
          };
          const cleanup = () => {
            video.removeEventListener("seeked", onSeeked);
            video.removeEventListener("error", onError);
          };

          video.addEventListener("seeked", onSeeked, { once: true });
          video.addEventListener("error", onError, { once: true });
          video.currentTime = clipStart;
        });
      }

      drawFrame(video, context, canvas.width, canvas.height);

      outputStream = canvas.captureStream(30);

      // Obraz pochodzi z canvas, a dźwięk z oryginalnego filmu.
      const captureAudio = video.captureStream || video.mozCaptureStream;
      if (captureAudio) {
        try {
          audioStream = captureAudio.call(video);
          for (const track of audioStream.getAudioTracks()) {
            outputStream.addTrack(track);
          }
        } catch {
          audioStream = null;
        }
      }

      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];

      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("Przeglądarka nie obsługuje formatu WebM.");

      recorder = new MediaRecorder(outputStream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };

      const recordingDone = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () => reject(new Error("Błąd podczas kodowania filmu."));
      });

      recorder.start(250);
      video.playbackRate = speed;

      await video.play();

      await new Promise((resolve, reject) => {
        let stopped = false;

        const finish = () => {
          if (stopped) return;
          stopped = true;
          if (animationId) cancelAnimationFrame(animationId);
          video.pause();
          if (recorder.state !== "inactive") recorder.stop();
          resolve();
        };

        const paint = () => {
          if (stopped) return;

          if (video.currentTime >= clipEnd || video.ended) {
            finish();
            return;
          }

          drawFrame(video, context, canvas.width, canvas.height);
          animationId = requestAnimationFrame(paint);
        };

        const onPlaybackError = () => {
          if (stopped) return;
          stopped = true;
          if (animationId) cancelAnimationFrame(animationId);
          if (recorder.state !== "inactive") recorder.stop();
          reject(new Error("Nie udało się odtworzyć filmu podczas eksportu."));
        };

        video.addEventListener("error", onPlaybackError, { once: true });
        animationId = requestAnimationFrame(paint);
      });

      await recordingDone;

      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      if (!blob.size) throw new Error("Eksport filmu jest pusty.");

      toast.message("Przesyłanie filmu na serwer…");

      const file = new File([blob], `purre-reel-${Date.now()}.webm`, {
        type: blob.type,
      });

      const uploadResult = await base44.integrations.Core.UploadPublicFile({ file });
      const videoUrl = uploadResult?.file_url || uploadResult?.url;

      if (!videoUrl) {
        throw new Error("Serwer nie zwrócił adresu przesłanego filmu.");
      }

      const profile = await ensureProfile(user);

      await base44.entities.Post.create({
        author_id: user.id,
        author_name: profile?.kennel_name || profile?.display_name || user.full_name || "Użytkownik PURRE PETS",
        author_handle: profile?.handle,
        author_avatar: profile?.avatar_url,
        author_verified: !!profile?.verified,
        caption: caption.trim(),
        image_url: "",
        image_urls: [],
        video_url: videoUrl,
        tags: [],
        likes: 0,
        comment_count: 0,
        status: "published",
      });

      toast.success("Reel został opublikowany w PURRE PETS!");
      navigate({ to: "/" });
    } catch (error) {
      console.error("PURRE PETS Reel export:", error);
      toast.error(error?.message || "Nie udało się opublikować Reels.");
    } finally {
      if (animationId) cancelAnimationFrame(animationId);

      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch { /* Recorder mógł już zostać zatrzymany przez przeglądarkę. */ }
      }

      if (outputStream) {
        outputStream.getTracks().forEach((track) => track.stop());
      }

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }

      if (video) {
        video.pause();
        video.playbackRate = 1;
      }

      exportingRef.current = false;
      setExporting(false);
    }
  };

  return (
    <div>
      <TopBar title="Edytor" />

      <div className="px-4 pb-12 pt-6 lg:px-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          reels studio
        </p>

        <h1 className="mt-2 font-display text-4xl">
          <span className="aura-text">Edytor wideo</span>
        </h1>

        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Przytnij film, wybierz filtr i dodaj napis. Gotowy materiał zostanie przesłany
          i opublikowany jako Reel. Dźwięk oryginału jest zachowywany, jeśli przeglądarka
          udostępnia przechwytywanie ścieżki audio.
        </p>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center">
          <span className="text-sm">Wybierz wideo z telefonu lub komputera</span>
          <span className="mt-1 text-[11px] text-muted-foreground">
            MP4, WebM, MOV · maksymalnie 100 MB
          </span>
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={exporting}
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
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
                <p className="-mt-16 px-4 pb-6 text-center font-display text-xl text-white drop-shadow">
                  {caption}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Początek: {start.toFixed(1)} s
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration - 0.2, 0.1)}
                  step={0.1}
                  value={Math.min(start, Math.max(duration - 0.2, 0))}
                  disabled={exporting}
                  onChange={(event) => setStart(
                    Math.min(Number(event.target.value), Math.max(end - 0.2, 0))
                  )}
                  className="mt-2 w-full"
                />
              </label>

              <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Koniec: {end.toFixed(1)} s
                <input
                  type="range"
                  min={Math.min(start + 0.2, duration)}
                  max={Math.max(duration, 0.2)}
                  step={0.1}
                  value={Math.max(end, Math.min(start + 0.2, duration))}
                  disabled={exporting}
                  onChange={(event) => setEnd(
                    Math.max(Number(event.target.value), start + 0.2)
                  )}
                  className="mt-2 w-full"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {SPEEDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={exporting}
                    onClick={() => {
                      setSpeed(value);
                      if (videoRef.current) videoRef.current.playbackRate = value;
                    }}
                    className={`rounded-full px-3 py-1.5 text-[11px] ${
                      speed === value ? "bg-foreground text-background" : "border border-border/70"
                    }`}
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
                    disabled={exporting}
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-3 py-1.5 text-[11px] ${
                      filter.id === item.id ? "bg-aura text-background" : "border border-border/70"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <input
                value={caption}
                maxLength={42}
                disabled={exporting}
                placeholder="Napis na klipie"
                onChange={(event) => setCaption(event.target.value)}
                className="w-full rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-sm"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={playTrim}
                  className="rounded-xl border border-border/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                >
                  Odtwórz fragment
                </button>

                <button
                  type="button"
                  disabled={exporting}
                  onClick={cover}
                  className="rounded-xl border border-border/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                >
                  Okładka JPG
                </button>

                <button
                  type="button"
                  disabled={exporting || !duration}
                  onClick={exportClip}
                  className="btn-aura rounded-xl px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
                >
                  {exporting ? "Eksport i publikacja…" : "Opublikuj Reel"}
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
