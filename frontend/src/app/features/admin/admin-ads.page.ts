import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';

interface Campaign {
  id: number; advertiserId?: number; title: string; imageUrl?: string; targetUrl: string;
  type: string; priceCoins?: number; active: boolean; impressions?: number; activeUntil?: string;
}

@Component({
  selector: 'purre-admin-ads',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">📣 Reklamy — panel admina</h1>

    <form (ngSubmit)="create()" class="purre-card p-5 space-y-3">
      <h2 class="font-bold">Nowa kampania (partner / AdSense)</h2>
      <input class="purre-input" placeholder="Tytuł" [(ngModel)]="title" name="title" required>
      <input class="purre-input" placeholder="URL baneru (opcjonalnie)" [(ngModel)]="imageUrl" name="imageUrl">
      <input class="purre-input" placeholder="URL docelowy" [(ngModel)]="targetUrl" name="targetUrl" required>
      <div class="flex gap-2">
        <select class="purre-input" [(ngModel)]="type" name="type">
          <option value="PARTNER">Partner</option>
          <option value="ADSENSE">AdSense</option>
          <option value="SPONSORED_LISTING">Sponsorowane ogłoszenie</option>
        </select>
        <select class="purre-input w-32" [(ngModel)]="days" name="days">
          <option [ngValue]="1">1 dzień</option>
          <option [ngValue]="7">7 dni</option>
          <option [ngValue]="30">30 dni</option>
        </select>
      </div>
      <button class="purre-btn w-full">Utwórz kampanię</button>
    </form>

    @for (c of items(); track c.id) {
      <div class="purre-card p-4 flex justify-between items-center gap-3">
        <div class="min-w-0">
          <p class="font-semibold truncate">{{ c.title }}</p>
          <p class="text-xs purre-muted">{{ c.type }} · wyświetlenia: {{ c.impressions ?? 0 }}
             @if (c.activeUntil) { · do {{ c.activeUntil | date:'shortDate' }} }</p>
        </div>
        <button class="purre-badge" (click)="toggle(c)">{{ c.active ? '⏸️ Wyłącz' : '▶️ Włącz' }}</button>
      </div>
    } @empty { <p class="purre-muted text-center p-4">Brak kampanii.</p> }
  </div>
  `
})
export class AdminAdsPage implements OnInit {
  title = ''; imageUrl = ''; targetUrl = ''; type = 'PARTNER'; days: number = 7;
  readonly items = signal<Campaign[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<Campaign[]>('/ads/managed/list').subscribe({
      next: (l) => this.items.set(l), error: () => this.items.set([])
    });
  }

  create(): void {
    this.api.post('/ads/managed', { title: this.title, imageUrl: this.imageUrl, targetUrl: this.targetUrl, type: this.type, days: this.days })
      .subscribe({ next: () => { this.title = ''; this.imageUrl = ''; this.load(); } });
  }

  toggle(c: Campaign): void {
    this.api.post('/ads/managed/' + c.id + '/toggle', { active: !c.active }).subscribe({ next: () => this.load() });
  }
}