/**
 * PURRE PETS — ads helpers
 * Frequency: 1 ad per 5–7 organic items. Premium / ads_disabled skips all.
 * Partner placeholders + sponsored listings (boosted). No real AdSense keys required for local/demo.
 */

export const PARTNER_ADS = [
  {
    id: "partner-royal-canin",
    kind: "partner",
    title: "Royal Canin — żywienie rasowe",
    subtitle: "Dopasowane karmy dla szczeniąt i kotów rasowych",
    cta: "Sprawdź ofertę",
    href: "https://www.royalcanin.com/pl",
    badge: "Partner",
    accent: "from-violet/30 to-aura/10",
  },
  {
    id: "partner-vet",
    kind: "partner",
    title: "Lecznica 24h — kontakt z weterynarzem",
    subtitle: "Teleporada i szczepienia dla hodowli",
    cta: "Umów wizytę",
    href: "#",
    badge: "Partner",
    accent: "from-aura/25 to-violet/15",
  },
  {
    id: "partner-accessories",
    kind: "partner",
    title: "Purre Accessories",
    subtitle: "Smycze, legowiska i legitymacje hodowlane",
    cta: "Zobacz sklep",
    href: "#",
    badge: "Sponsor",
    accent: "from-chart-4/20 to-aura/10",
  },
  {
    id: "partner-insurance",
    kind: "partner",
    title: "Ubezpieczenie szczeniąt",
    subtitle: "Pakiety dla hodowców i nowych właścicieli",
    cta: "Poznaj pakiety",
    href: "#",
    badge: "Partner",
    accent: "from-violet/20 to-chart-4/10",
  },
];

const INTERVAL_MIN = 5;
const INTERVAL_MAX = 7;

/** Deterministic interval in [5,7] from a seed (e.g. user id or day). */
export function adInterval(seed = "purre") {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return INTERVAL_MIN + (h % (INTERVAL_MAX - INTERVAL_MIN + 1));
}

/**
 * Insert ad slots into a list of items.
 * Returns mixed array: { type: 'item', data } | { type: 'ad', ad }
 */
export function interleaveAds(items, { seed = "purre", ads = PARTNER_ADS, enabled = true } = {}) {
  if (!enabled || !items?.length || !ads?.length) {
    return (items || []).map((data) => ({ type: "item", data }));
  }
  const every = adInterval(seed);
  const out = [];
  let adIdx = 0;
  for (let i = 0; i < items.length; i++) {
    out.push({ type: "item", data: items[i] });
    if ((i + 1) % every === 0) {
      out.push({ type: "ad", ad: ads[adIdx % ads.length] });
      adIdx += 1;
    }
  }
  return out;
}

/** Map boosted listings to sponsored ad cards. */
export function listingToSponsoredAd(listing) {
  if (!listing) return null;
  return {
    id: `sponsored-${listing.id}`,
    kind: "sponsored",
    title: listing.title,
    subtitle: [listing.breed, listing.city].filter(Boolean).join(" · ") || listing.description?.slice(0, 80),
    cta: "Zobacz ogłoszenie",
    href: `/listings/${listing.id}`,
    badge: "Wyróżnione",
    accent: "from-aura/30 to-violet/15",
    image_url: listing.image_urls?.[0],
    listing_id: listing.id,
    price: listing.price,
  };
}

const PREMIUM_KEY = "purre_ads_disabled";

export function readAdsDisabledLocal() {
  try {
    return localStorage.getItem(PREMIUM_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAdsDisabledLocal(value) {
  try {
    if (value) localStorage.setItem(PREMIUM_KEY, "1");
    else localStorage.removeItem(PREMIUM_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Premium = wallet has badge "premium" OR local toggle OR boost_until in future (legacy).
 */
export function isAdsDisabled(wallet) {
  if (readAdsDisabledLocal()) return true;
  if (!wallet) return false;
  if (Array.isArray(wallet.badges) && wallet.badges.includes("premium")) return true;
  if (wallet.boost_until && new Date(wallet.boost_until) > new Date()) return true;
  return false;
}
