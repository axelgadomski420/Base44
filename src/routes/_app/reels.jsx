import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Film } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReelVideo from "@/components/reels/ReelVideo";

export const Route = createFileRoute("/_app/reels")({
  head: () => ({
    meta: [
      { title: "PURRE PETS — Holo Reels" },
      { name: "description", content: "Pionowy feed wideo od polskich hodowli psów i kotów rasowych." },
    ],
  }),
  component: ReelsPage,
});

function ReelsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Post.filter({ status: "published" }, { sort: "-created_date", limit: 50 })
      .then((page) => setPosts((page.items ?? []).filter((post) => !!post.video_url)))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative h-[calc(100dvh-96px)] w-full bg-black lg:h-screen">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="grid h-9 w-9 place-items-center rounded-xl bg-black/40 text-white backdrop-blur"
          aria-label="Wróć"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-sm tracking-wide text-white">Holo Reels</p>
        <Link
          to="/create"
          className="ml-auto rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur"
        >
          Dodaj wideo
        </Link>
      </div>

      {loading ? (
        <div className="grid h-full place-items-center text-[11px] uppercase tracking-[0.24em] text-white/60">
          Wczytywanie…
        </div>
      ) : posts.length === 0 ? (
        <div className="grid h-full place-items-center px-8 text-center">
          <div>
            <Film className="mx-auto h-7 w-7 text-white/50" />
            <p className="mt-3 text-sm text-white/80">Nie ma jeszcze nagrań hodowli.</p>
            <p className="mt-1 text-[11px] text-white/50">
              Dodaj pierwszy film z miotu — pojawi się tutaj w pionowym feedzie.
            </p>
            <Link
              to="/create"
              className="btn-aura mt-4 inline-flex rounded-xl px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
            >
              Dodaj wideo
            </Link>
          </div>
        </div>
      ) : (
        <div className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain">
          {posts.map((post) => (
            <div key={post.id} className="h-full w-full">
              <ReelVideo post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
