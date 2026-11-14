import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/community/")({
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <div className="p-4 lg:p-8">
      <h1 className="font-display text-4xl aura-text">Społeczność</h1>
      <p className="mt-2 text-muted-foreground">Grupy rasowe, regionalne i tematyczne.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl">Grupy rasowe</h3>
          <p className="mt-1 text-sm text-muted-foreground">Maine Coon, British Shorthair, Samoyed...</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl">Regionalne</h3>
          <p className="mt-1 text-sm text-muted-foreground">Warszawa, Kraków, Wrocław...</p>
        </div>
      </div>
    </div>
  );
}
