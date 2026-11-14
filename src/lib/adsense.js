/**
 * Google AdSense integration for PURRE PETS.
 * Set VITE_ADSENSE_CLIENT (e.g. ca-pub-XXXXXXXX) and optional VITE_ADSENSE_SLOT_*.
 * Without keys, AdSlot falls back to partner/sponsored cards.
 */

export function getAdSenseClient() {
  try {
    return import.meta.env.VITE_ADSENSE_CLIENT || "";
  } catch {
    return "";
  }
}

export function getAdSenseSlot(name = "feed") {
  try {
    const map = {
      feed: import.meta.env.VITE_ADSENSE_SLOT_FEED,
      explore: import.meta.env.VITE_ADSENSE_SLOT_EXPLORE,
      reels: import.meta.env.VITE_ADSENSE_SLOT_REELS,
      arcade: import.meta.env.VITE_ADSENSE_SLOT_ARCADE,
    };
    return map[name] || import.meta.env.VITE_ADSENSE_SLOT_FEED || "";
  } catch {
    return "";
  }
}

export function isAdSenseEnabled() {
  return Boolean(getAdSenseClient());
}

let scriptPromise = null;

/** Load adsbygoogle.js once. Safe to call multiple times. */
export function loadAdSenseScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  const client = getAdSenseClient();
  if (!client) return Promise.resolve(false);
  if (window.adsbygoogle && document.querySelector(`script[data-purre-adsense]`)) {
    return Promise.resolve(true);
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[data-purre-adsense]`);
    if (existing) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    s.crossOrigin = "anonymous";
    s.dataset.purreAdsense = "1";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function pushAdSense() {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* ignore */
  }
}
