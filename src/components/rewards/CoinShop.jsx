import { useEffect, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function CoinShop() {
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [catalog, setCatalog] = useState({ configured: false, packages: [] });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    base44.billing
      .packages()
      .then(setCatalog)
      .catch(() => setCatalog({ configured: false, packages: [] }));
  }, []);

  const buy = async (packageId) => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    setBusy(packageId);
    try {
      const session = await base44.billing.checkout(packageId);
      if (session?.url) window.location.assign(session.url);
    } catch (error) {
      toast.error(error?.message ?? "Płatność Stripe nie jest jeszcze włączona");
    } finally {
      setBusy("");
    }
  };

  if (!catalog.packages?.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Dokup PURRE Coins</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {catalog.configured
          ? "Płatność Stripe. Monety księgują się po potwierdzeniu webhooka."
          : "Pakiety są gotowe. Płatność ruszy, gdy w backendzie pojawi się STRIPE_SECRET_KEY."}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {catalog.packages.map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={busy === pack.id}
            onClick={() => buy(pack.id)}
            className="rounded-[var(--radius)] border border-border/70 bg-gradient-to-br from-violet/15 to-aura/10 p-4 text-left"
          >
            <p className="font-display text-2xl">{pack.coins}</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">monet</p>
            <p className="mt-3 text-sm">{(pack.amount / 100).toFixed(2)} zł</p>
          </button>
        ))}
      </div>
    </section>
  );
}
