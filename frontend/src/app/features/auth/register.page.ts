import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { ApiError } from '../../core/api.service';

@Component({
  selector: 'purre-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="min-h-screen flex items-center justify-center p-6">
    <form (ngSubmit)="submit()" class="purre-card w-full max-w-md p-8 space-y-4">
      <h1 class="text-2xl font-bold tracking-tight">PURRE PETS</h1>
      <p class="purre-muted text-sm">{{ i18n.t('auth.register') }}</p>

      <div class="grid grid-cols-2 gap-2">
        <button type="button" (click)="role = 'BREEDER'"
          class="purre-card p-4 text-left"
          [style.borderColor]="role === 'BREEDER' ? 'var(--accent)' : 'var(--border)'">
          <div class="font-bold">🐕 {{ i18n.t('auth.role.breeder') }}</div>
          <div class="text-xs purre-muted mt-1">{{ i18n.t('auth.role.breeder.hint') }}</div>
        </button>
        <button type="button" (click)="role = 'BUYER'"
          class="purre-card p-4 text-left"
          [style.borderColor]="role === 'BUYER' ? 'var(--accent)' : 'var(--border)'">
          <div class="font-bold">🐾 {{ i18n.t('auth.role.buyer') }}</div>
          <div class="text-xs purre-muted mt-1">{{ i18n.t('auth.role.buyer.hint') }}</div>
        </button>
      </div>

      <label class="block text-sm">{{ i18n.t('auth.displayName') }}
        <input class="purre-input mt-1" name="displayName" [(ngModel)]="displayName" required>
      </label>
      <label class="block text-sm">{{ i18n.t('auth.email') }}
        <input class="purre-input mt-1" type="email" name="email" [(ngModel)]="email" required>
      </label>
      <label class="block text-sm">{{ i18n.t('auth.password') }}
        <input class="purre-input mt-1" type="password" name="password" [(ngModel)]="password" required minlength="8">
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-sm">{{ i18n.t('auth.city') }}
          <input class="purre-input mt-1" name="city" [(ngModel)]="city">
        </label>
        <label class="block text-sm">{{ i18n.t('auth.region') }}
          <input class="purre-input mt-1" name="region" [(ngModel)]="region">
        </label>
      </div>
      <label class="flex items-start gap-2 text-sm">
        <input type="checkbox" name="rodo" [(ngModel)]="rodo" [required]="true">
        <span>{{ i18n.t('auth.rodo') }}</span>
      </label>

      @if (error()) { <p class="purre-error">{{ error() }}</p> }
      <button class="purre-btn w-full" [disabled]="busy()">{{ i18n.t('auth.register') }}</button>
      <p class="text-sm purre-muted">{{ i18n.t('auth.hasAccount') }}
        <a routerLink="/login" class="underline" style="color: var(--accent)">{{ i18n.t('auth.login') }}</a>
      </p>
    </form>
  </div>
  `
})
export class RegisterPage {
  role: 'BREEDER' | 'BUYER' = 'BUYER';
  displayName = ''; email = ''; password = ''; city = ''; region = '';
  rodo = false;
  readonly busy = signal(false);
  readonly error = signal('');

  constructor(private auth: AuthService, private router: Router, readonly i18n: I18nService) {}

  async submit(): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      const user = await this.auth.register({
        email: this.email, password: this.password, role: this.role,
        displayName: this.displayName, city: this.city, region: this.region, rodoConsent: this.rodo
      });
      this.router.navigate([user.role === 'BREEDER' ? '/verification' : '/discover']);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Błąd rejestracji.');
    } finally {
      this.busy.set(false);
    }
  }
}