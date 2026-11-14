import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_app/_authed/video-editor/")({
  component: VideoEditorPage,
});

function VideoEditorPage() {
  const { user } = useAuth();
  return (
    <div className="p-4 lg:p-8">
      <h1 className="font-display text-4xl aura-text">Edytor wideo</h1>
      <p className="mt-2 text-muted-foreground">TikTok-style: trim, filtry, efekty, napisy AI, muzyka. Nieograniczona liczba filmów.</p>
      <div className="mt-8 rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center">
        <p className="text-lg">Przeciągnij wideo lub kliknij aby wybrać</p>
        <p className="mt-2 text-sm text-muted-foreground">Wkrótce: pełny edytor z FFmpeg.wasm / Remotion</p>
        {user && <p className="mt-4 text-xs">Zalogowany jako {user.email}</p>}
      </div>
    </div>
  );
}
