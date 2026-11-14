import { Link } from "@tanstack/react-router";
import { ExternalLink, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact sponsored / partner card for feed & explore grids.
 * variant: "feed" | "banner" | "compact" | "interstitial"
 */
export default function AdSlot({
  ad,
  variant = "feed",
  onDismiss,
  className,
}) {
  if (!ad) return null;

  const isExternal = typeof ad.href === "string" && ad.href.startsWith("http");
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/90">
          {ad.badge || "Reklama"}
        </span>
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            className="grid h-6 w-6 place-items-center rounded-full bg-black/30 text-white/70 hover:text-white"
            aria-label="Ukryj reklamę"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-3">
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-black/25 ring-1 ring-white/10">
            <Sparkles className="h-5 w-5 text-aura" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm leading-snug text-white">{ad.title}</p>
          {ad.subtitle && (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-white/65">{ad.subtitle}</p>
          )}
          {ad.price != null && (
            <p className="mt-1 text-[11px] font-semibold text-aura">
              {Number(ad.price).toLocaleString("pl-PL")} zł
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
          {ad.cta || "Zobacz"}
          {isExternal && <ExternalLink className="h-3 w-3" />}
        </span>
        <span className="text-[9px] text-white/40">Reklama · RODO</span>
      </div>
    </>
  );

  const shellClass = cn(
    "block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition hover:border-aura/30",
    ad.accent || "from-violet/25 to-aura/10",
    variant === "banner" && "w-full",
    variant === "compact" && "p-3",
    variant === "interstitial" && "mx-auto max-w-md p-5",
    className
  );

  if (isExternal) {
    return (
      <a href={ad.href} target="_blank" rel="noopener noreferrer sponsored" className={shellClass}>
        {inner}
      </a>
    );
  }

  if (ad.href && ad.href.startsWith("/")) {
    return (
      <Link to={ad.href} className={shellClass}>
        {inner}
      </Link>
    );
  }

  return <div className={shellClass}>{inner}</div>;
}

/** Full-screen style interstitial after arcade games */
export function AdInterstitial({ ad, onClose, onContinue }) {
  if (!ad) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <AdSlot ad={ad} variant="interstitial" />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onContinue || onClose}
            className="btn-aura flex-1 rounded-xl px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
          >
            Kontynuuj
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Zamknij
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          PURRE Premium wyłącza reklamy w Arcade i feedzie.
        </p>
      </div>
    </div>
  );
}
