import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { I18nService } from '../../core/i18n.service';

interface ListingDto { id: number; title: string; status: string; price?: number; }

@Component({
  selector: 'purre-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-5">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('nav.profile') }}</h1>

    <div class="purre-card p-5 flex items-center gap-4">
      <div class="h-16 w-16 rounded-full flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, var(--accent), var(--accent-2));">🐾</div>
      <div>
        <p class="font-bold">{{ auth.user()?.displayName }}</p>
        <p class="text-sm purre-muted">{{ auth.user()?.email }}</p>
        <div class="flex gap-1 mt-1">
          <span class="purre-badge">{{ roleLabel() }}</span>
          @if (auth.user()?.verifiedBadge) { <span class="purre-badge">✅ Zweryfikowany hodowca</span> }
        </div>
      </div>
    </div>

    <section class="purre-card p-5 space-y-3">
      <h2 class="font-bold">Wygląd</h2>
      <label class="block text-sm">Motyw
        <select class="purre-input mt-1" [ngModel]="theme.current()" (ngModelChange)="theme.set($event)">
          @for (t of theme.themes; track t.id) { <option [value]="t.id">{{ t.label }}</option> }
        </select>
      </label>
      <label class="block text-sm">Język
        <select class="purre-input mt-1" [ngModel]="i18n.lang()" (ngModelChange)="i18n.set($event)">
          @for (l of i18n.languages; track l.id) { <option [value]="l.id">{{ l.label }}</option> }
        </select>
      </label>
    </section>

    @if (isAdmin()) {
      <a routerLink="/admin/verifications" class="purre-card p-4 block">🛡️ Panel administratora — weryfikacje</a>
    }
    <a routerLink="/wallet" class="purre-card p-4 block">🪙 PURRE Coins — portfel</a>
    @if (isBreeder() && !auth.user()?.verifiedBadge) {
      <a routerLink="/verification" class="purre-card p-4 block">📋 Weryfikacja hodowli</a>
    }

    @if (isBreeder()) {
      <section class="purre-card p-5 space-y-2">
        <h2 class="font-bold">Moje ogłoszenia</h2>
        @for (l of listings(); track l.id) {
          <div class="flex items-center justify-between text-sm">
            <a [routerLink]="['/listing', l.id]" class="underline">{{ l.title }}</a>
            <div class="flex gap-2">
              <button class="purre-badge" (click)="feature(l.id)" title="Wyróżnij (100 🪙)">⭐</button>
              <button class="purre-badge" (click)="sold(l.id)" title="Oznacz sprzedane">✅</button>
              <button class="purre-badge" (click)="remove(l.id)" title="Usuń">🗑️</button>
            </div>
          </div>
        } @empty { <p class="purre-muted text-sm">—</p> }
        <button class="purre-btn w-full" (click)="boost()">🚀 Boost profilu — 200 🪙</button>
      </section>
    }

    <button class="purre-card p-4 w-full text-left" style="color: var(--danger)" (click)="logout()">🚪 Wyloguj</button>
  </div>
  `
})
export class ProfilePage implements OnInit {
  readonly listings = signal<ListingDto[]>([]);

  constructor(
    private api: ApiService, readonly auth: AuthService, private router: Router,
    readonly theme: ThemeService, readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    if (this.isBreeder()) {
      this.api.get<ListingDto[]>('/listings/mine').subscribe({
        next: (l) => this.listings.set(Array.isArray(l) ? l : (l as any).content ?? []),
        error: () => this.listings.set([])
      });
    }
  }

  isAdmin(): boolean { return this.auth.user()?.role === 'ADMIN'; }
  isBreeder(): boolean { return this.auth.user()?.role === 'BREEDER'; }
  roleLabel(): string {
    const r = this.auth.user()?.role;
    return r === 'BREEDER' ? '🐕 Hodowca' : r === 'ADMIN' ? '🛡️ Admin' : '🐾 Kupujący';
  }

  feature(id: number): void {
    this.api.post('/listings/' + id + '/feature', {}).subscribe({ next: () => this.ngOnInit() });
  }
  sold(id: number): void {
    this.api.patch('/listings/' + id + '/sold', {}).subscribe({ next: () => this.ngOnInit() });
  }
  remove(id: number): void {
    this.api.delete('/listings/' + id).subscribe({ next: () => this.ngOnInit() });
  }
  boost(): void {
    this.api.post('/listings/boost-profile', {}).subscribe({ next: () => this.ngOnInit() });
  }
  logout(): void { this.auth.logout(); }
}