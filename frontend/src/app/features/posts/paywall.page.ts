import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService, ApiError } from '../../core/api.service';

interface MembershipStatus {
  plan: string; planUntil?: string; active: boolean; premiumActive: boolean;
  canReel: boolean; proCoins: number; ultimateCoins: number;
}

/** 0.4.0: Paywall — wybór pakietu PRO / ULTIMATE / PREMIUM (PURRE Coins, Stripe pośrednio). */
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

    <div class="purre-card p-5 space-y-2" [style.outline]="status()?.plan === 'PRO' ? '2px solid var(--accent)' : 'none'">
      <h2 class="font-bold text-lg">⭐ PRO — {{ status()?.proCoins ?? 300 }} 🪙 / 30 dni</h2>
      <p class="text-sm purre-muted">Publikacja Reels 🎬, badge PRO w profilu.</p>
      <button class="purre-btn w-full" [disabled]="buying()" (click)="buy('PRO')">Kup PRO</button>
    </div>

    <div class="purre-card p-5 space-y-2" [style.outline]="status()?.plan === 'ULTIMATE' ? '2px solid var(--accent)' : 'none'">
      <h2 class="font-bold text-lg">💎 ULTIMATE — {{ status()?.ultimateCoins ?? 800 }} 🪙 / 30 dni</h2>
      <p class="text-sm purre-muted">Wszystko z PRO + badge ULTIMATE + priorytet w rotacji reklam hodowcy.</p>
      <button class="purre-btn w-full" [disabled]="buying()" (click)="buy('ULTIMATE')">Kup ULTIMATE</button>
    </div>

    <div class="purre-card p-5 space-y-2">
      <h2 class="font-bold text-lg">👑 PURRE Premium — 500 🪙 / 30 dni</h2>
      <p class="text-sm purre-muted">Bez reklam + publikacja Reels + badge Premium.</p>
      <button class="purre-btn w-full" [disabled]="buying()" (click)="buyPremium()">Kup Premium</button>
    </div>

    @if (msg()) { <p class="text-sm" style="color: var(--accent-2)">{{ msg() }}</p> }
    @if (error()) { <p class="purre-error">{{ error() }}</p> }
    <a routerLink="/wallet" class="purre-card p-4 block text-center">🪙 Brakuje coins? Doładuj portfel (Stripe)</a>
  </div>
  `
})
export class PaywallPage implements OnInit {
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
