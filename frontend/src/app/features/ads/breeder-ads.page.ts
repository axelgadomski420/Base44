import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, ApiError } from '../../core/api.service';

interface MyAd { id: number; title: string; imageUrl?: string; targetUrl: string; type: string; impressions: number; clicks: number; }

/** Panel hodowcy (0.3.1 / 0.5.0): reklamy sponsorowane z CTR + statystyki (PRO+). */
@Component({
  selector: 'purre-breeder-ads',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">📣 Panel hodowcy</h1>

    <div class="purre-card p-4">
      <p class="text-sm font-semibold">📊 Statystyki (PRO/ULTIMATE/PREMIUM)</p>
      @if (stats(); as s) {
        <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
          <span class="purre-badge">🐾 Aktywne ogłoszenia: {{ s.activeListings }}</span>
          <span class="purre-badge">✅ Sprzedane: {{ s.soldListings }}</span>
          <span class="purre-badge">❤️ Polubienia postów: {{ s.postLikes }}</span>
          <span class="purre-badge">👥 Obserwujący: {{ s.followers }}</span>
        </div>
      } @else {
        <p class="text-xs purre-muted mt-1">Dostępne w pakietach PRO/ULTIMATE/PREMIUM — <a routerLink="/paywall">wybierz pakiet</a>.</p>
      }
    </div>

    <p class="purre-muted text-sm">Twoja reklama pojawi się rotacyjnie w Discover, HoloFeed, Arcade i panelu hodowcy —
      oznaczona „Sponsorowane", bez zasłaniania treści. Niewidoczna dla użytkowników Premium.</p>

    <form (ngSubmit)="create()" class="purre-card p-5 space-y-3">
      <input class="purre-input" placeholder="Tytuł reklamy (max 160 znaków)" [(ngModel)]="title" name="title" required maxlength="160">
      <input class="purre-input" placeholder="URL baneru (opcjonalnie)" [(ngModel)]="imageUrl" name="imageUrl">
      <input class="purre-input" placeholder="URL docelowy (np. twoje ogłoszenie)" [(ngModel)]="targetUrl" name="targetUrl" required>
      <div class="flex gap-2">
        <select class="purre-input" [(ngModel)]="days" name="days">
          <option [ngValue]="1">1 dzień — 50 🪙</option>
          <option [ngValue]="7">7 dni — 200 🪙</option>
        </select>
        <button class="purre-btn shrink-0" [disabled]="busy()">Opublikuj</button>
      </div>
      @if (msg()) { <p class="text-sm" style="color: var(--accent-2)">{{ msg() }}</p> }
      @if (error()) { <p class="purre-error">{{ error() }}</p> }
      @if (needCoins()) { <a routerLink="/wallet" class="purre-badge">💰 Dołóż coins w portfelu</a> }
    </form>

    <h2 class="font-bold">Moje reklamy (CTR)</h2>
    @for (a of items(); track a.id) {
      <div class="purre-card p-4 flex items-center gap-3">
        @if (a.imageUrl) { <img [src]="a.imageUrl" class="h-12 w-12 rounded-lg object-cover shrink-0" alt=""> }
        @else { <span class="text-2xl shrink-0">📣</span> }
        <div class="min-w-0">
          <p class="font-semibold truncate">{{ a.title }}</p>
          <p class="text-xs purre-muted truncate">{{ a.targetUrl }}</p>
          <p class="text-xs purre-badge mt-1">👁️ {{ a.impressions }} · 🖱️ {{ a.clicks }} · CTR {{ ctr(a) }}%</p>
        </div>
      </div>
    } @empty { <p class="purre-muted text-sm">—</p> }
  </div>
  `
})
export class BreederAdsPage implements OnInit {
  title = ''; imageUrl = ''; targetUrl = ''; days = 1;
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly error = signal('');
  readonly needCoins = signal(false);
  readonly items = signal<MyAd[]>([]);
  readonly stats = signal<{ activeListings: number; soldListings: number; postLikes: number; followers: number } | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<MyAd[]>('/ads/mine').subscribe({
      next: (l) => this.items.set(l), error: () => this.items.set([])
    });
    this.api.get<any>('/breeders/me/stats').subscribe({
      next: (s) => this.stats.set(s), error: () => this.stats.set(null)
    });
  }

  ctr(a: MyAd): string {
    if (!a.impressions) return '0.0';
    return ((a.clicks / a.impressions) * 100).toFixed(1);
  }

  create(): void {
    this.busy.set(true); this.msg.set(''); this.error.set(''); this.needCoins.set(false);
    this.api.post<MyAd>('/ads/sponsored', {
      title: this.title, imageUrl: this.imageUrl || undefined, targetUrl: this.targetUrl, days: this.days
    }).subscribe({
      next: () => {
        this.msg.set('Kampania aktywna — reklama wchodzi do rotacji.');
        this.title = ''; this.imageUrl = ''; this.targetUrl = '';
        this.busy.set(false);
        this.load();
      },
      error: (e) => {
        this.error.set(e instanceof ApiError ? e.message : 'Nie udało się utworzyć kampanii.');
        this.needCoins.set(e instanceof ApiError && e.code === 'INSUFFICIENT_COINS');
        this.busy.set(false);
      }
    });
  }
}
