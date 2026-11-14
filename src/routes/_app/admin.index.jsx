import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_app/admin/")({
  ssr: false,
  head: () => ({ meta: [{ title: "PURRE PETS — Admin" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = () => {
    base44.admin
      .overview()
      .then((payload) => {
        setData(payload);
        setError("");
      })
      .catch((err) => setError(err?.message ?? "Brak dostępu"));
  };

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user?.role]);

  const decide = async (id, status) => {
    setBusy(id + status);
    try {
      await base44.admin.reviewVerification(id, { status });
      toast.success(status === "approved" ? "Hodowca zweryfikowany" : "Wniosek odrzucony");
      load();
    } catch (err) {
      toast.error(err?.message ?? "Nie udało się zapisać decyzji");
    } finally {
      setBusy("");
    }
  };

  const moderate = async (id, status) => {
    setBusy(id + status);
    try {
      await base44.admin.reviewListing(id, { status });
      toast.success(status === "active" ? "Ogłoszenie opublikowane" : "Ogłoszenie zarchiwizowane");
      load();
    } catch (err) {
      toast.error(err?.message ?? "Nie udało się zmienić ogłoszenia");
    } finally {
      setBusy("");
    }
  };

  if (isLoadingAuth) return <div className="p-8 text-sm text-muted-foreground">Ładowanie…</div>;
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div>
        <TopBar title="Admin" />
        <div className="p-8 text-center text-sm text-muted-foreground">Brak uprawnień administratora.</div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Admin" />
      <div className="px-4 pb-12 pt-6 lg:px-8">
        <h1 className="font-display text-4xl">
          <span className="aura-text">Panel administratora</span>
        </h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Konta" value={data?.users ?? "—"} />
          <Stat label="Wydarzenia" value={data?.events ?? "—"} />
          <Stat label="Do decyzji" value={(data?.verifications?.length ?? 0) + (data?.listings?.length ?? 0)} />
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <section className="mt-8">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Weryfikacja hodowców</h2>
          <div className="mt-3 space-y-3">
            {(data?.verifications ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Brak oczekujących wniosków.</p>
            )}
            {(data?.verifications ?? []).map((item) => (
              <article key={item.id} className="rounded-[var(--radius)] border border-border/70 bg-card/60 p-4">
                <p className="font-display text-xl">{item.kennel_name}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {item.city || "—"} · {item.species || "gatunek niepodany"} · rej. {item.registry_no || "brak"}
                </p>
                {item.note && <p className="mt-2 text-sm">{item.note}</p>}
                {item.document_url && (
                  <a href={item.document_url} className="mt-2 inline-block text-[11px] text-aura" target="_blank" rel="noreferrer">
                    Dokument
                  </a>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy.startsWith(item.id)}
                    onClick={() => decide(item.id, "approved")}
                    className="btn-aura rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  >
                    Zatwierdź
                  </button>
                  <button
                    type="button"
                    disabled={busy.startsWith(item.id)}
                    onClick={() => decide(item.id, "rejected")}
                    className="rounded-xl border border-border/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  >
                    Odrzuć
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Ogłoszenia w moderacji</h2>
          <div className="mt-3 space-y-3">
            {(data?.listings ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Kolejka pusta.</p>
            )}
            {(data?.listings ?? []).map((listing) => (
              <article key={listing.id} className="rounded-[var(--radius)] border border-border/70 bg-card/60 p-4">
                <p className="font-display text-xl">{listing.title}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {listing.city} · {listing.breed || listing.species || "—"} · ryzyko {listing.risk ?? 0}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moderate(listing.id, "active")}
                    className="btn-aura rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  >
                    Publikuj
                  </button>
                  <button
                    type="button"
                    onClick={() => moderate(listing.id, "archived")}
                    className="rounded-xl border border-border/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  >
                    Archiwizuj
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[var(--radius)] border border-border/70 bg-card/60 p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}
