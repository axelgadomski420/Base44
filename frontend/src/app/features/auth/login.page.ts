import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { ApiError } from '../../core/api.service';

@Component({
  selector: 'purre-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="min-h-screen flex items-center justify-center p-6">
    <form (ngSubmit)="submit()" class="purre-card w-full max-w-md p-8 space-y-4">
      <h1 class="text-2xl font-bold tracking-tight">PURRE PETS</h1>
      <p class="purre-muted text-sm">{{ i18n.t('auth.login') }}</p>
      <label class="block text-sm">{{ i18n.t('auth.email') }}
        <input class="purre-input mt-1" type="email" name="email" [(ngModel)]="email" required>
      </label>
      <label class="block text-sm">{{ i18n.t('auth.password') }}
        <input class="purre-input mt-1" type="password" name="password" [(ngModel)]="password" required>
      </label>
      @if (error()) { <p class="purre-error">{{ error() }}</p> }
      <button class="purre-btn w-full" [disabled]="busy()">{{ i18n.t('auth.login') }}</button>
      <p class="text-sm purre-muted">{{ i18n.t('auth.noAccount') }}
        <a routerLink="/register" class="underline" style="color: var(--accent)">{{ i18n.t('auth.register') }}</a>
      </p>
    </form>
  </div>
  `
})
export class LoginPage {
  email = ''; password = '';
  readonly busy = signal(false);
  readonly error = signal('');

  constructor(private auth: AuthService, private router: Router, readonly i18n: I18nService) {}

  async submit(): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      const user = await this.auth.login(this.email, this.password);
      this.router.navigate([user.role === 'ADMIN' ? '/admin/verifications' : '/discover']);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Błąd logowania.');
    } finally {
      this.busy.set(false);
    }
  }
}