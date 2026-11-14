import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';

interface EventDto {
  id: number; title: string; description?: string; kind: string;
  city?: string; region?: string; startsAt: string; endsAt?: string;
  ticketCost: number; going: number;
}

/** 0.5.0 M12: Wydarzenia — kalendarz wystaw i spotkań, Event Radar, bilety za PURRE Coins. */
@Component({
  selector: 'purre-events',
  standalone: true,
  imports: [DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">📅 Wydarzenia</h1>
      <button class="purre-badge" (click)="view.set(view() === 'all' ? 'mine' : 'all'); load()">
        {{ view() === 'all' ? '🎟️ Moje bilety' : '📋 Kalendarz' }}
      </button>
    </header>

    @for (e of items(); track e.id) {
      <article class="purre-card p-4 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-bold">{{ kindIcon(e.kind) }} {{ e.title }}</p>
            <p class="text-xs purre-muted">
              {{ e.startsAt | date:'EEEE, d MMMM y, HH:mm' }}
              @if (e.city) { · 📍 {{ e.city }}@if (e.region) {, {{ e.region }}} }
            </p>
          </div>
          <span class="purre-badge">{{ kindLabel(e.kind) }}</span>
        </div>
        @if (e.description) { <p class="text-sm purre-muted">{{ e.description }}</p> }
        <div class="flex items-center justify-between">
          <p class="text-xs purre-muted">👥 {{ e.going }} uczestników
            @if (e.ticketCost > 0) { · 🎟️ {{ e.ticketCost }} 🪙 } @else { · wstęp wolny }
          </p>
          <button class="purre-btn" (click)="toggle(e)">
            {{ e.registered ? '✔️ Zapisany — rezygnuj' : (e.ticketCost > 0 ? 'Kup bilet' : 'Zapisz się') }}
          </button>
        </div>
      </article>
    } @empty {
      <p class="purre-muted text-sm">{{ view() === 'mine' ? 'Nie masz jeszcze biletów.' : 'Brak nadchodzących wydarzeń.' }}</p>
    }
  </div>
  `
})
export class EventsPage implements OnInit {
  readonly view = signal<'all' | 'mine'>('all');
  readonly items = signal<(EventDto & { registered?: boolean })[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const path = this.view() === 'mine' ? '/events/mine' : '/events';
    this.api.get<EventDto[]>(path).subscribe({
      next: (list) => {
        if (this.view() === 'mine') {
          this.items.set(list.map(e => ({ ...e, registered: true })));
        } else {
          this.items.set(list);
        }
      },
      error: () => this.items.set([])
    });
  }

  toggle(e: EventDto & { registered?: boolean }): void {
    if (e.registered) {
      this.api.delete('/events/' + e.id + '/register').subscribe({
        next: () => this.load(),
        error: () => undefined
      });
    } else {
      this.api.post<EventDto>('/events/' + e.id + '/register', {}).subscribe({
        next: () => this.load(),
        error: () => undefined
      });
    }
  }

  kindIcon(kind: string): string {
    return kind === 'SHOW' ? '🏆' : kind === 'MEET' ? '🤝' : '💻';
  }

  kindLabel(kind: string): string {
    return kind === 'SHOW' ? 'Wystawa' : kind === 'MEET' ? 'Spotkanie' : 'Online';
  }
}
