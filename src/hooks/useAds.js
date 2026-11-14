import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PARTNER_ADS,
  interleaveAds,
  isAdsDisabled,
  listingToSponsoredAd,
  readAdsDisabledLocal,
  writeAdsDisabledLocal,
} from "@/lib/ads";
import { useWallet } from "@/lib/useWallet";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

/**
 * Hook: whether ads are shown + helpers to mix feed/explore lists.
 */
export function useAds() {
  const { user } = useAuth();
  const { wallet, reload } = useWallet();
  const [localDisabled, setLocalDisabled] = useState(false);
  const [boosted, setBoosted] = useState([]);

  useEffect(() => {
    setLocalDisabled(readAdsDisabledLocal());
  }, []);

  useEffect(() => {
    let active = true;
    base44.entities.Listing.filter(
      { status: "active", boosted_until: { $gte: new Date().toISOString() } },
      { limit: 12, sort: "-boosted_until" }
    )
      .then((page) => {
        if (active) setBoosted(page.items ?? []);
      })
      .catch(() => {
        // Fallback: any active listings as soft sponsors
        base44.entities.Listing.filter({ status: "active" }, { limit: 6, sort: "-created_date" })
          .then((page) => {
            if (active) setBoosted(page.items ?? []);
          })
          .catch(() => null);
      });
    return () => {
      active = false;
    };
  }, []);

  const disabled = isAdsDisabled(wallet) || localDisabled;

  const partnerPool = useMemo(() => {
    const sponsored = boosted.map(listingToSponsoredAd).filter(Boolean);
    // Mix: prefer real boosted first, then partners
    return [...sponsored, ...PARTNER_ADS];
  }, [boosted]);

  const mix = useCallback(
    (items, seed) =>
      interleaveAds(items, {
        seed: seed || user?.id || "purre",
        ads: partnerPool,
        enabled: !disabled,
      }),
    [partnerPool, disabled, user?.id]
  );

  const setAdsDisabled = useCallback((value) => {
    writeAdsDisabledLocal(value);
    setLocalDisabled(value);
  }, []);

  /** One random ad for interstitial (arcade end) */
  const randomAd = useCallback(() => {
    if (disabled || !partnerPool.length) return null;
    return partnerPool[Math.floor(Math.random() * partnerPool.length)];
  }, [disabled, partnerPool]);

  return {
    adsEnabled: !disabled,
    disabled,
    mix,
    randomAd,
    partnerPool,
    setAdsDisabled,
    reloadWallet: reload,
  };
}
