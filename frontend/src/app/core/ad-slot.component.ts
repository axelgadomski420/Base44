import { Component, Input, OnInit, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface AdDto { id: number; title: string; imageUrl?: string; targetUrl: string; type: string; }

/**
 * Slot reklamowy (0.3.1): pobiera /ads/serve dla placementu i renderuje baner.
 * Premium → backend zwraca null → slot się nie renderuje. Klik → POST /ads/{id}/click.
 * Capping: przy everyN > 1 slot pokazuje się co N-te montowanie (licznik w sessionStorage).
 */
@Component({
  selector: 'purre-ad-slot',
  standalone: true,
  template: `
  @if (ad(); as a) {
    <a [href]="a.targetUrl" target="_blank" rel="noopener nofollow sponsored" (click)="onClick()"
       class="purre-card p-3 flex items-center gap-3">
      @if (a.imageUrl) {
        <img [src]="a.imageUrl" [alt]="a.title" class="h-12 w-12 rounded-lg object-cover shrink-0">
      } @else {
        <span class="text-2xl shrink-0">📣</span>
      }
      <span class="min-w-0">
        <span class="purre-badge">Sponsorowane</span>
        <span class="block text-sm font-semibold truncate">{{ a.title }}</span>
      </span>
    </a>
  }
  `
})
export class AdSlotComponent implements OnInit {
  /** Placement: GAME_INTERSTITIAL | HOLOFEED | DISCOVER | BREEDER_PANEL | FOOTER */
  @Input({ required: true }) placement!: string;
  /** Capping: pokazuj co N-te montowanie slotu (1 = zawsze). */
  @Input() everyN = 1;

  readonly ad = signal<AdDto | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    if (!this.shouldShow()) return;
    this.api.get<AdDto | null>('/ads/serve', { placement: this.placement })
      .subscribe({ next: (ad) => this.ad.set(ad ?? null), error: () => this.ad.set(null) });
  }

  onClick(): void {
    const ad = this.ad();
    if (ad) this.api.post('/ads/' + ad.id + '/click', {}).subscribe({ error: () => undefined });
  }

  private shouldShow(): boolean {
    if (!this.everyN || this.everyN <= 1) return true;
    const key = 'purre_ad_views';
    const n = (Number(sessionStorage.getItem(key)) || 0) + 1;
    sessionStorage.setItem(key, String(n));
    return n % this.everyN === 0;
  }
}
