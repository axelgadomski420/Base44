import { useEffect, useRef } from "react";
import {
  getAdSenseClient,
  getAdSenseSlot,
  isAdSenseEnabled,
  loadAdSenseScript,
  pushAdSense,
} from "@/lib/adsense";
import { cn } from "@/lib/utils";

/**
 * Real Google AdSense unit. Renders nothing if client/slot missing.
 * format: "auto" | "rectangle" | "horizontal"
 */
export default function AdSenseUnit({
  slotName = "feed",
  format = "auto",
  className,
  fullWidth = true,
}) {
  const ref = useRef(null);
  const pushed = useRef(false);
  const client = getAdSenseClient();
  const slot = getAdSenseSlot(slotName);

  useEffect(() => {
    if (!client || !slot || pushed.current) return undefined;
    let cancelled = false;
    loadAdSenseScript().then((ok) => {
      if (!ok || cancelled || pushed.current) return;
      pushed.current = true;
      pushAdSense();
    });
    return () => {
      cancelled = true;
    };
  }, [client, slot]);

  if (!isAdSenseEnabled() || !slot) return null;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2", className)}>
      <p className="mb-1 text-center text-[9px] uppercase tracking-[0.2em] text-white/40">Reklama</p>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidth ? "true" : "false"}
      />
    </div>
  );
}
