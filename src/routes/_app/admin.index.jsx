import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <div className="p-8 text-center">Brak uprawnień administratora.</div>;
  }
  return (
    <div className="p-4 lg:p-8">
      <h1 className="font-display text-4xl aura-text">Panel administratora</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white/5 p-6">Moderacja ogłoszeń</div>
        <div className="rounded-2xl border bg-white/5 p-6">Weryfikacja hodowców</div>
        <div className="rounded-2xl border bg-white/5 p-6">Zarządzanie użytkownikami</div>
      </div>
    </div>
  );
}
