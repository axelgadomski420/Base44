import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';

interface ReportRow {
  id: number; reporterId: number; listingId?: number; reportedUserId?: number;
  reason: string; description?: string; status: string; resolutionNote?: string; createdAt: string;
}

const REASON_LABEL: Record<string, string> = {
  SPAM: 'Spam', FAKE_LISTING: 'Fałszywe ogłoszenie', PSEUDO_BREEDER: 'Pseudohodowla',
  CRUELTY: 'Okrucieństwo', SCAM: 'Oszustwo', OTHER: 'Inne'
};

@Component({
  selector: 'purre-moderation',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">⚖️ Panel moderatora</h1>

    <div class="flex gap-2">
      @for (s of statuses; track s) {
        <button class="purre-badge" [style.outline]="filter === s ? '2px solid var(--accent)' : 'none'"
                (click)="filter = s; load()">{{ label(s) }}</button>
      }
    </div>

    @for (r of items(); track r.id) {
      <div class="purre-card p-5 space-y-2">
        <div class="flex justify-between items-start">
          <p class="font-bold">{{ REASON_LABEL[r.reason] ?? r.reason }}</p>
          <span class="purre-badge">{{ r.status }}</span>
        </div>
        <p class="text-xs purre-muted">Zgłoszono: {{ r.createdAt | date:'short' }} · reporter #{{ r.reporterId }}</p>
        @if (r.listingId) { <p class="text-sm">Ogłoszenie #{{ r.listingId }} — <a class="underline" [href]="'/listing/' + r.listingId">otwórz</a></p> }
        @if (r.reportedUserId) { <p class="text-sm">Użytkownik #{{ r.reportedUserId }}</p> }
        @if (r.description) { <p class="text-sm">{{ r.description }}</p> }
        @if (r.status === 'PENDING') {
          <textarea class="purre-input" rows="2" [(ngModel)]="notes[r.id]" placeholder="Notatka (opcjonalna)"></textarea>
          <div class="flex gap-2">
            <button class="purre-btn flex-1" (click)="resolve(r.id, true)">✅ Potwierdź naruszenie</button>
            <button class="purre-btn flex-1" (click)="resolve(r.id, false)">🚫 Odrzuć zgłoszenie</button>
          </div>
        } @else if (r.resolutionNote) {
          <p class="text-xs purre-muted">Notatka: {{ r.resolutionNote }}</p>
        }
      </div>
    } @empty {
      <p class="purre-muted p-6 text-center">Brak zgłoszeń w tej zakładce.</p>
    }
  </div>
  `
})
export class ModerationPage implements OnInit {
  readonly statuses = ['PENDING', 'RESOLVED', 'DISMISSED'] as const;
  readonly REASON_LABEL = REASON_LABEL;
  filter = 'PENDING';
  readonly items = signal<ReportRow[]>([]);
  readonly notes: Record<number, string> = {};

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<{ content: ReportRow[] }>('/reports', { status: this.filter })
      .subscribe({ next: (p) => this.items.set(p.content ?? []), error: () => this.items.set([]) });
  }

  resolve(id: number, upheld: boolean): void {
    this.api.post('/reports/' + id + '/resolve', { upheld, note: this.notes[id] ?? '' })
      .subscribe({ next: () => this.load() });
  }

  label(s: string): string {
    return s === 'PENDING' ? '⏳ Oczekujące' : s === 'RESOLVED' ? '✅ Rozpatrzone' : '🚫 Odrzucone';
  }
}