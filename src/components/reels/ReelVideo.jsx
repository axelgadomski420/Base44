import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Heart, MapPin, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { openConversation } from "@/lib/conversations";
import { cn } from "@/lib/utils";

export default function ReelVideo({ post }) {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes ?? 0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(() => null);
    else video.pause();
  }, [active]);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Like.filter({ post_id: post.id, user_id: user.id }, { limit: 1 })
      .then((page) => setLiked(!!page.items?.length))
      .catch(() => null);
  }, [post.id, user?.id]);

  const toggleLike = async () => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    if (liked) {
      const page = await base44.entities.Like.filter({ post_id: post.id, user_id: user.id }, { limit: 5 });
      await Promise.all((page.items ?? []).map((item) => base44.entities.Like.delete(item.id)));
      setLiked(false);
      setLikes((value) => Math.max(0, value - 1));
    } else {
      await base44.entities.Like.create({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLikes((value) => value + 1);
    }
  };

  const message = async () => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    if (!post.author_id || post.author_id === user?.id) return;
    setStarting(true);
    try {
      const conversation = await openConversation({
        me: user,
        otherId: post.author_id,
        otherName: post.author_name,
      });
      if (conversation) navigate({ to: "/messages/$id", params: { id: conversation.id } });
    } finally {
      setStarting(false);
    }
  };

  return (
    <section ref={sectionRef} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={post.video_url}
        className="h-full w-full object-cover"
        loop
        playsInline
        muted={muted}
        preload="metadata"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 pb-6">
        <div className="min-w-0 flex-1 text-white">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="truncate">{post.author_name || "Hodowca PURRE"}</span>
            {post.author_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-aura" />}
          </p>
          <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-white/85">{post.caption}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/60">
            {post.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {post.city}
              </span>
            )}
            {post.breed && <span>{post.breed}</span>}
          </p>
          {post.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={toggleLike}
            className="flex flex-col items-center gap-1 text-white"
            aria-pressed={liked}
            aria-label="Polub"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur">
              <Heart className={cn("h-5 w-5", liked && "fill-destructive text-destructive")} />
            </span>
            <span className="text-[10px]">{likes}</span>
          </button>

          <button
            type="button"
            onClick={message}
            disabled={starting}
            className="flex flex-col items-center gap-1 text-white disabled:opacity-60"
            aria-label="Napisz wiadomość"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-[10px]">Napisz</span>
          </button>

          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur"
            aria-label={muted ? "Włącz dźwięk" : "Wycisz"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </section>
  );
}
