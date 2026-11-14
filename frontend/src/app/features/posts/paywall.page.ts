import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService, ApiError } from '../../core/api.service';

interface MembershipStatus {
  plan: string; planUntil?: string; active: boolean; premiumActive: boolean;
  canReel: boolean; proCoins: number; ultimateCoins: number;
}

interface FeatureRow { label: string; pro: boolean; ultimate: boolean; premium: boolean; }

/** 0.5.0: Paywall — pełna macierz funkcji FREE / PRO / ULTIMATE / PREMIUM. */
@Component({
  selector: 'purre-paywall',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">💎 Wybierz pakiet</h1>
    @if (status()?.active) {
      <p class="purre-badge">Aktywny: {{ status()!.plan }} do {{ (status()!.planUntil || '') | date:'mediumDate' }}</p>
    }
    @if (status()?.premiumActive) { <p class="purre-badge">👑 Premium aktywne</p> }

    <div class="purre-card p-4 overflow-x-auto">
      <table class="w-full text-sm" style="min-width: 420px;">
        <thead>
          <tr class="text-left">
            <th class="py-2">Funkcja</th>
            <th class="py-2 text-center">⭐ PRO</th>
            <th class="py-2 text-center">💎 ULTIMATE</th>
            <th class="py-2 text-center">👑 PREMIUM</th>
          </tr>
        </thead>
        <tbody>
          @for (row of features; track row.label) {
            <tr style="border-top: 1px solid rgba(255,255,255,0.08);">
              <td class="py-2">{{ row.label }}</td>
              <td class="text-center">{{ row.pro ? '✅' : '—' }}</td>
              <td class="text-center">{{ row.ultimate ? '✅' : '—' }}</td>
              <td class="text-center">{{ row.premium ? '✅' : '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="purre-card p-5 space-y-2" [style.outline]="status()?.plan === 'PRO' ? '2px solid var(--accent)' : 'none'">
      <h2 class="font-bold text-lg">⭐ PRO — {{ status()?.proCoins ?? 300 }} 🪙 / 30 dni</h2>
      <p class="text-sm purre-muted">Reels 🎬, badge PRO, statystyki hodowcy 📊.</p>
      <button class="purre-btn w-full" [disabled]="buying()" (click)="buy('PRO')">Kup PRO</button>
    </div>

    <div class="purre-card p-5 space-y-2" [style.outline]="status()?.plan === 'ULTIMATE' ? '2px solid var(--accent)' : 'none'">
      <h2 class="font-bold text-lg">💎 ULTIMATE — {{ status()?.ultimateCoins ?? 800 }} 🪙 / 30 dni</h2>
      <p class="text-sm purre-muted">Wszystko z PRO + cotygodniowy boost profilu 🚀 + badge ULTIMATE.</p>
      <button class="purre-btn w-full" [disabled]="buying()" (click)="buy('ULTIMATE')">Kup ULTIMATE</button>
    </div>

    <div class="purre-card p-5 space-y-2" [style.outline]="status()?.premiumActive ? '2px solid var(--accent)' : 'none'">
      <h2 class="font-bold text-lg">👑 PURRE Premium — 500 🪙 / 30 dni</h2>
      <p class="text-sm purre-muted">Zero reklam + Reels + statystyki + badge Premium. Najpełniejsze doświadczenie.</p>
      <button class="purre-btn w-full" [disabled]="buying()" (click)="buyPremium()">Kup Premium</button>
    </div>

    @if (msg()) { <p class="text-sm" style="color: var(--accent-2)">{{ msg() }}</p> }
    @if (error()) { <p class="purre-error">{{ error() }}</p> }
    <a routerLink="/wallet" class="purre-card p-4 block text-center">🪙 Brakuje coins? Doładuj portfel (Stripe)</a>
  </div>
  `
})
export class PaywallPage implements OnInit {
  readonly features: FeatureRow[] = [
    { label: '📝 Posty społeczności', pro: true, ultimate: true, premium: true },
    { label: '🎬 Publikacja Reels + dźwięki i filtry', pro: true, ultimate: true, premium: true },
    { label: '⭐ Badge pakietu przy postach i profilu', pro: true, ultimate: true, premium: true },
    { label: '📊 Statystyki hodowcy (ogłoszenia, ❤️, obserwujący)', pro: true, ultimate: true, premium: true },
    { label: '🚀 Cotygodniowy boost profilu', pro: false, ultimate: true, premium: true },
    { label: '📣 Priorytet w rotacji reklam', pro: false, ultimate: true, premium: true },
    { label: '🚫 Całkowity brak reklam', pro: false, ultimate: false, premium: true }
  ];
  readonly status = signal<MembershipStatus | null>(null);
  readonly buying = signal(false);
  readonly msg = signal('');
  readonly error = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<MembershipStatus>('/membership/status').subscribe({
      next: (s) => this.status.set(s), error: () => this.status.set(null)
    });
  }

  buy(plan: string): void {
    this.buying.set(true); this.msg.set(''); this.error.set('');
    this.api.post<MembershipStatus>('/membership/purchase', { plan }).subscribe({
      next: (s) => { this.status.set(s); this.buying.set(false); this.msg.set('✅ Pakiet ' + plan + ' aktywny!'); },
      error: (e) => { this.buying.set(false); this.error.set(e instanceof ApiError ? e.message : 'Nie udało się aktywować pakietu.'); }
    });
  }

  buyPremium(): void {
    this.buying.set(true); this.msg.set(''); this.error.set('');
    this.api.post<any>('/premium/purchase', {}).subscribe({
      next: () => { this.buying.set(false); this.msg.set('👑 Premium aktywne!'); this.load(); },
      error: (e) => { this.buying.set(false); this.error.set(e instanceof ApiError ? e.message : 'Nie udało się aktywować Premium.'); }
    });
  }
}
