import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_app/events/")({
  component: EventsPage,
});

function EventsPage() {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);

  // TODO: load events from base44.entities.Event.list()
  return (
    <div className="p-4 lg:p-8">
      <h1 className="font-display text-4xl aura-text">Wydarzenia</h1>
      <p className="mt-2 text-muted-foreground">Kalendarz wystaw, Event Radar, bilety za PURRE Coins.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Wkrótce</p>
          <h3 className="mt-2 text-xl font-semibold">Event Radar</h3>
          <p className="mt-1 text-sm text-muted-foreground">Wyszukiwanie wydarzeń w okolicy.</p>
        </div>
      </div>
    </div>
  );
}
