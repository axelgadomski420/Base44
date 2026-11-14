import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/auth.service';
import { AdSlotComponent } from './core/ad-slot.component';
import { ApiService } from './core/api.service';
import { I18nService } from './core/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AdSlotComponent],
  template: `
    <div class="min-h-screen pb-20">
      <a routerLink="/notifications" class="fixed top-3 right-3 z-40 purre-card px-2.5 py-1.5 text-sm" title="Powiadomienia">
        🔔@if (unread() > 0) { <span class="font-bold" style="color: var(--accent-2)">{{ unread() }}</span> }
      </a>
      <router-outlet />
      <purre-ad-slot placement="FOOTER" class="block mx-auto max-w-2xl px-4 mb-2" />
      <nav class="fixed bottom-0 inset-x-0 z-40 purre-card border-t" style="border-radius: 1.25rem 1.25rem 0 0;">
        <div class="mx-auto max-w-2xl grid grid-cols-6 text-center text-[11px]">
          <a routerLink="/discover" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">🐾<br>{{ i18n.t('nav.discover') }}</a>
          <a routerLink="/explore" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">🔍<br>{{ i18n.t('nav.explore') }}</a>
          <a routerLink="/create" routerLinkActive="font-bold" class="py-3" style="color: var(--accent)">➕<br>{{ i18n.t('nav.add') }}</a>
          <a routerLink="/messenger" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">💬<br>{{ i18n.t('nav.messenger') }}</a>
          <a routerLink="/arcade" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">🎮<br>{{ i18n.t('nav.arcade') }}</a>
          <a routerLink="/profile" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">👤<br>{{ i18n.t('nav.profile') }}</a>
        </div>
      </nav>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  readonly unread = signal(0);
  private poll: ReturnType<typeof setInterval> | null = null;

  constructor(readonly auth: AuthService, readonly i18n: I18nService, private api: ApiService) {}

  ngOnInit(): void {
    this.auth.loadMe();
    this.refreshUnread();
    this.poll = setInterval(() => this.refreshUnread(), 60000);
  }

  private refreshUnread(): void {
    if (!this.auth.user()) { this.unread.set(0); return; }
    this.api.get<{ count: number }>('/notifications/unread-count')
      .subscribe({ next: (r) => this.unread.set(r.count), error: () => undefined });
  }

  ngOnDestroy(): void { if (this.poll) clearInterval(this.poll); }
}
