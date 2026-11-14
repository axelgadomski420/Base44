import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface WalletDto { balance: number; packs: { id: string; coins: number; pricePln: number }[]; }
interface TransactionDto { id: number; type: string; amount: number; reason: string; balanceAfter: number; createdAt: string; }
interface PurchaseDto { id: number; packId: string; coins: number; pricePln: number; status: string; createdAt: string; }

@Component({
  selector: 'purre-wallet',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-6">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('wallet.title') }}</h1>

    <div class="purre-card p-6 text-center">
      <p class="purre-muted text-sm">{{ i18n.t('wallet.balance') }}</p>
      <p class="text-5xl font-extrabold mt-1" style="background: linear-gradient(135deg, var(--accent), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent;">
        🪙 {{ wallet()?.balance ?? 0 }}
      </p>
    </div>

    <section>
      <h2 class="font-bold mb-2">Pakiety</h2>
      <div class="grid grid-cols-2 gap-3">
        @for (pack of wallet()?.packs ?? []; track pack.id) {
          <button class="purre-card p-4 text-left" (click)="buy(pack.id)" [disabled]="busy()">
            <div class="text-lg font-bold">🪙 {{ pack.coins }}</div>
            <div class="text-sm purre-muted">{{ pack.pricePln | number:'.2' }} zł</div>
            <div class="purre-btn mt-2 text-xs">{{ i18n.t('wallet.buy') }}</div>
          </button>
        }
      </div>
      @if (error()) { <p class="purre-error mt-2">{{ error() }}</p> }
    </section>

    <section>
      <h2 class="font-bold mb-2">{{ i18n.t('wallet.purchases') }}</h2>
      @for (p of purchases(); track p.id) {
        <div class="purre-card p-3 flex justify-between text-sm">
          <span>🪙 {{ p.coins }} · {{ p.pricePln | number:'.2' }} zł</span>
          <span class="purre-muted">{{ p.status }} · {{ p.createdAt | date:'short' }}</span>
        </div>
      } @empty { <p class="purre-muted text-sm">—</p> }
    </section>

    <section>
      <h2 class="font-bold mb-2">{{ i18n.t('wallet.transactions') }}</h2>
      @for (tx of transactions(); track tx.id) {
        <div class="purre-card p-3 flex justify-between text-sm">
          <span [style.color]="tx.type === 'CREDIT' ? 'var(--accent-2)' : 'var(--danger)'">
            {{ tx.type === 'CREDIT' ? '+' : '−' }}{{ tx.amount }} 🪙
          </span>
          <span class="purre-muted">{{ tx.reason }} · {{ tx.createdAt | date:'short' }}</span>
        </div>
      } @empty { <p class="purre-muted text-sm">—</p> }
    </section>
  </div>
  `
})
export class WalletPage implements OnInit {
  readonly wallet = signal<WalletDto | null>(null);
  readonly transactions = signal<TransactionDto[]>([]);
  readonly purchases = signal<PurchaseDto[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor(private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.get<WalletDto>('/coins/wallet').subscribe({ next: (w) => this.wallet.set(w) });
    this.api.get<TransactionDto[]>('/coins/transactions').subscribe({ next: (t) => this.transactions.set(t.content ?? []) });
    this.api.get<PurchaseDto[]>('/purchases/me').subscribe({ next: (p) => this.purchases.set(p) });
  }

  buy(packId: string): void {
    this.busy.set(true); this.error.set('');
    this.api.post<{ checkoutUrl: string }>('/coins/purchase', { packId }).subscribe({
      next: (res) => { window.location.href = res.checkoutUrl; },
      error: (e) => { this.error.set(e instanceof ApiError ? e.message : 'Błąd płatności.'); this.busy.set(false); }
    });
  }
}