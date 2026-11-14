import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService, THEMES } from '../../core/theme.service';
import { I18nService, LANGS } from '../../core/i18n.service';

interface UserDto { id: number; email: string; displayName: string; role: string; city?: string; region?: string; }
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
        <p class="font-bold">{{ user()?.displayName }}</p>
        <p class="text-sm purre-muted">{{ user()?.email }}</p>
        <span class="purre-badge mt-1">{{ roleLabel() }}</span>
      </div>
    </div>

    <section class="purre-card p-5 space-y-3">
      <h2 class="font-bold">Wygląd</h2>
      <label class="block text-sm">Motyw
        <select class="purre-input mt-1" [ngModel]="theme.current()" (ngModelChange)="theme.set($event)">
          @for (t of themes; track t) { <option [value]="t">{{ t }}</option> }
        </select>
      </label>
      <label class="block text-sm">Język
        <select class="purre-input mt-1" [ngModel]="i18n.current()" (ngModelChange)="i18n.set($event)">
          @for (l of langs; track l) { <option [value]="l">{{ l }}</option> }
        </select>
      </label>
    </section>

    @if (isAdmin()) {
      <a routerLink="/admin/verifications" class="purre-card p-4 block">🛡️ Panel administratora — weryfikacje</a>
    }
    <a routerLink="/wallet" class="purre-card p-4 block">🪙 PURRE Coins — portfel</a>

    @if (isBreeder()) {
      <section class="purre-card p-5 space-y-2">
        <h2 class="font-bold">Moje ogłoszenia</h2>
        @for (l of listings(); track l.id) {
          <div class="flex items-center justify-between text-sm">
            <a [routerLink]="['/listing', l.id]" class="underline">{{ l.title }}</a>
            <div class="flex gap-2">
              <button class="purre-badge" (click)="feature(l.id)">⭐ 100</button>
              <button class="purre-badge" (click)="sold(l.id)">✅</button>
              <button class="purre-badge" (click)="remove(l.id)">🗑️</button>
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
  readonly themes = THEMES;
  readonly langs = LANGS;
  readonly user = signal<UserDto | null>(null);
  readonly listings = signal<ListingDto[]>([]);

  constructor(
    private api: ApiService, private auth: AuthService, private router: Router,
    readonly theme: ThemeService, readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.api.get<UserDto>('/auth/me').subscribe({ next: (u) => this.user.set(u) });
    this.api.get<ListingDto[]>('/listings/mine').subscribe({
      next: (l) => this.listings.set(l.content ?? l), error: () => this.listings.set([])
    });
  }

  isAdmin(): boolean { return this.user()?.role === 'ADMIN'; }
  isBreeder(): boolean { return this.user()?.role === 'BREEDER'; }
  roleLabel(): string {
    const r = this.user()?.role;
    return r === 'BREEDER' ? '🐕 Hodowca' : r === 'ADMIN' ? '🛡️ Admin' : '🐾 Kupujący';
  }

  feature(id: number): void {
    this.api.post('/listings/' + id + '/feature', {}).subscribe({ next: () => this.ngOnInit() });
  }
  sold(id: number): void {
    this.api.post('/listings/' + id + '/sold', {}).subscribe({ next: () => this.ngOnInit() });
  }
  remove(id: number): void {
    this.api.delete('/listings/' + id).subscribe({ next: () => this.ngOnInit() });
  }
  boost(): void {
    this.api.post('/listings/boost-profile', {}).subscribe({ next: () => this.ngOnInit() });
  }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}