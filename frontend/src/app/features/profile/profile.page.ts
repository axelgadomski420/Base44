import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, ApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { I18nService } from '../../core/i18n.service';

interface ListingDto { id: number; title: string; status: string; price?: number; }
interface PremiumStatus { active: boolean; premiumUntil?: string; balance: number; priceCoins: number; }

@Component({
  selector: 'purre-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-5">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('nav.profile') }}</h1>

    <!-- Nagłówek + zdjęcie profilowe -->
    <div class="purre-card p-5 flex items-center gap-4">
      <div class="relative">
        @if (auth.user()?.avatarUrl) {
          <img [src]="auth.user()!.avatarUrl" alt="Zdjęcie profilowe"
               class="h-20 w-20 rounded-full object-cover" style="border: 2px solid var(--accent)">
        } @else {
          <div class="h-20 w-20 rounded-full flex items-center justify-center text-3xl"
               style="background: linear-gradient(135deg, var(--accent), var(--accent-2));">🐾</div>
        }
        <label class="absolute -bottom-1 -right-1 purre-btn !px-2 !py-1 text-xs cursor-pointer" title="Zmień zdjęcie">
          @if (uploadingAvatar()) { ⏳ } @else { 📷 }
          <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" (change)="onAvatarPick($event)">
        </label>
      </div>
      <div class="min-w-0">
        <p class="font-bold truncate">{{ auth.user()?.displayName }}</p>
        <p class="text-sm purre-muted truncate">{{ auth.user()?.email }}</p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span class="purre-badge">{{ roleLabel() }}</span>
          @if (auth.user()?.verifiedBadge) { <span class="purre-badge">✅ Zweryfikowany hodowca</span> }
          @if (premium()?.active) { <span class="purre-badge">👑 Premium</span> }
        </div>
      </div>
    </div>
    @if (profileMsg()) { <p class="text-sm" style="color: var(--accent-2)">{{ profileMsg() }}</p> }

    <!-- PURRE Premium -->
    <section class="purre-card p-5 space-y-2">
      <h2 class="font-bold">👑 PURRE Premium</h2>
      @if (premium()?.active) {
        <p class="text-sm">Aktywne do <b>{{ (premium()?.premiumUntil || '') | date:'mediumDate' }}</b> — bez reklam w aplikacji.</p>
      } @else {
        <p class="text-sm purre-muted">Brak reklam, badge Premium w profilu. {{ premium()?.priceCoins }} 🪙 / 30 dni.</p>
        <button class="purre-btn w-full" [disabled]="buyingPremium()" (click)="buyPremium()">
          {{ buyingPremium() ? 'Przetwarzanie…' : 'Kup Premium — ' + (premium()?.priceCoins ?? 500) + ' 🪙' }}
        </button>
      }
    </section>

    <!-- Edycja profilu -->
    <section class="purre-card p-5 space-y-3">
      <h2 class="font-bold">✏️ Edytuj profil</h2>
      <label class="block text-sm">Nazwa wyświetlana
        <input class="purre-input mt-1" [(ngModel)]="form.displayName" name="displayName" maxlength="120">
      </label>
      <label class="block text-sm">O mnie
        <textarea class="purre-input mt-1" rows="3" [(ngModel)]="form.bio" name="bio" maxlength="500"
                  placeholder="Np. Hodowla rasowych kotów brytyjskich…"></textarea>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm">Miasto
          <input class="purre-input mt-1" [(ngModel)]="form.city" name="city">
        </label>
        <label class="block text-sm">Region
          <input class="purre-input mt-1" [(ngModel)]="form.region" name="region">
        </label>
      </div>
      <label class="block text-sm">Strona WWW
        <input class="purre-input mt-1" [(ngModel)]="form.website" name="website" placeholder="https://…">
      </label>
      <label class="block text-sm">Instagram
        <input class="purre-input mt-1" [(ngModel)]="form.instagram" name="instagram" placeholder="@login">
      </label>
      <button class="purre-btn w-full" [disabled]="savingProfile()" (click)="saveProfile()">
        {{ savingProfile() ? 'Zapisywanie…' : '💾 Zapisz profil' }}
      </button>
    </section>

    <!-- Zmiana hasła -->
    <section class="purre-card p-5 space-y-3">
      <h2 class="font-bold">🔒 Zmiana hasła</h2>
      <label class="block text-sm">Obecne hasło
        <input class="purre-input mt-1" type="password" [(ngModel)]="pwd.currentPassword" name="currentPassword" autocomplete="current-password">
      </label>
      <label class="block text-sm">Nowe hasło (min. 8 znaków)
        <input class="purre-input mt-1" type="password" [(ngModel)]="pwd.newPassword" name="newPassword" autocomplete="new-password">
      </label>
      <button class="purre-btn w-full" [disabled]="savingPwd()" (click)="changePassword()">
        {{ savingPwd() ? 'Zapisywanie…' : 'Zmień hasło' }}
      </button>
      @if (pwdMsg()) { <p class="text-sm" style="color: var(--accent-2)">{{ pwdMsg() }}</p> }
    </section>

    <!-- Wygląd -->
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

    <!-- Panele i skróty -->
    @if (isAdmin()) {
      <a routerLink="/admin" class="purre-card p-4 block">🛡️ Panel administratora</a>
      <a routerLink="/admin/verifications" class="purre-card p-4 block">📋 Weryfikacje — kolejka</a>
      <a routerLink="/admin/ads" class="purre-card p-4 block">📢 Reklamy — zarządzanie</a>
    }
    @if (isModerator()) {
      <a routerLink="/moderation" class="purre-card p-4 block">🚩 Panel moderatora — zgłoszenia</a>
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

    <!-- RODO -->
    <button class="purre-card p-4 w-full text-left" (click)="exportData()">
      📦 Eksport moich danych (RODO, art. 15)
    </button>

    <button class="purre-card p-4 w-full text-left" style="color: var(--danger)" (click)="logout()">🚪 Wyloguj</button>
  </div>
  `
})
export class ProfilePage implements OnInit {
  readonly listings = signal<ListingDto[]>([]);
  readonly premium = signal<PremiumStatus | null>(null);
  readonly profileMsg = signal('');
  readonly pwdMsg = signal('');
  readonly savingProfile = signal(false);
  readonly savingPwd = signal(false);
  readonly uploadingAvatar = signal(false);
  readonly buyingPremium = signal(false);

  form = { displayName: '', bio: '', city: '', region: '', website: '', instagram: '' };
  pwd = { currentPassword: '', newPassword: '' };

  constructor(
    private api: ApiService, readonly auth: AuthService, private router: Router,
    readonly theme: ThemeService, readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) {
      this.form = {
        displayName: u.displayName ?? '', bio: u.bio ?? '', city: u.city ?? '',
        region: u.region ?? '', website: (u as any).website ?? '', instagram: (u as any).instagram ?? ''
      };
    }
    if (this.isBreeder()) {
      this.api.get<ListingDto[]>('/listings/mine').subscribe({
        next: (l) => this.listings.set(Array.isArray(l) ? l : (l as any).content ?? []),
        error: () => this.listings.set([])
      });
    }
    this.api.get<PremiumStatus>('/premium/status').subscribe({
      next: (p) => this.premium.set(p), error: () => this.premium.set(null)
    });
  }

  isAdmin(): boolean { return this.auth.user()?.role === 'ADMIN'; }
  isModerator(): boolean { return this.auth.user()?.role === 'MODERATOR' || this.isAdmin(); }
  isBreeder(): boolean { return this.auth.user()?.role === 'BREEDER'; }
  roleLabel(): string {
    const r = this.auth.user()?.role;
    return r === 'BREEDER' ? '🐕 Hodowca' : r === 'ADMIN' ? '🛡️ Admin' : r === 'MODERATOR' ? '🚩 Moderator' : '🐾 Kupujący';
  }

  onAvatarPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.profileMsg.set('Zdjęcie profilowe: maksymalnie 5 MB.'); return; }
    this.uploadingAvatar.set(true);
    this.profileMsg.set('');
    const fd = new FormData();
    fd.append('file', file);
    this.api.postMultipart<any>('/users/me/avatar', fd).subscribe({
      next: (user) => {
        this.auth.patchUser({ avatarUrl: user.avatarUrl });
        this.uploadingAvatar.set(false);
        this.profileMsg.set('✅ Zdjęcie profilowe zaktualizowane.');
      },
      error: (e) => {
        this.uploadingAvatar.set(false);
        this.profileMsg.set(e instanceof ApiError ? e.message : 'Nie udało się wgrać zdjęcia.');
      }
    });
  }

  saveProfile(): void {
    if (!this.form.displayName || this.form.displayName.trim().length < 2) {
      this.profileMsg.set('Nazwa wyświetlana musi mieć min. 2 znaki.');
      return;
    }
    this.savingProfile.set(true);
    this.profileMsg.set('');
    this.api.patch<any>('/users/me', {
      displayName: this.form.displayName.trim(),
      bio: this.form.bio || undefined,
      city: this.form.city || undefined,
      region: this.form.region || undefined,
      website: this.form.website || undefined,
      instagram: this.form.instagram || undefined
    }).subscribe({
      next: (user) => {
        this.auth.patchUser(user);
        this.savingProfile.set(false);
        this.profileMsg.set('✅ Profil zapisany.');
      },
      error: (e) => {
        this.savingProfile.set(false);
        this.profileMsg.set(e instanceof ApiError ? e.message : 'Nie udało się zapisać profilu.');
      }
    });
  }

  changePassword(): void {
    if (!this.pwd.currentPassword || this.pwd.newPassword.length < 8) {
      this.pwdMsg.set('Nowe hasło musi mieć min. 8 znaków.');
      return;
    }
    this.savingPwd.set(true);
    this.pwdMsg.set('');
    this.api.post('/users/me/password', this.pwd).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.pwd.set({ currentPassword: '', newPassword: '' });
        this.pwdMsg.set('✅ Hasło zmienione.');
      },
      error: (e) => {
        this.savingPwd.set(false);
        this.pwdMsg.set(e instanceof ApiError ? e.message : 'Nie udało się zmienić hasła.');
      }
    });
  }

  buyPremium(): void {
    this.buyingPremium.set(true);
    this.api.post<PremiumStatus>('/premium/purchase', {}).subscribe({
      next: (p) => {
        this.premium.set(p);
        this.auth.patchUser({ premiumUntil: p.premiumUntil });
        this.buyingPremium.set(false);
        this.profileMsg.set('👑 PURRE Premium aktywowane!');
      },
      error: (e) => {
        this.buyingPremium.set(false);
        this.profileMsg.set(e instanceof ApiError ? e.message : 'Nie udało się aktywować Premium.');
      }
    });
  }

  exportData(): void {
    this.api.getBlob('/users/me/export').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'purre-pets-dane.json';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.profileMsg.set('Nie udało się wygenerować eksportu.')
    });
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