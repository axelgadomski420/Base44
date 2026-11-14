import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/auth.service';
import { I18nService } from './core/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen pb-20">
      <router-outlet />
      <nav class="fixed bottom-0 inset-x-0 z-40 purre-card border-t" style="border-radius: 1.25rem 1.25rem 0 0;">
        <div class="mx-auto max-w-2xl grid grid-cols-6 text-center text-[11px]">
          <a routerLink="/discover" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">🐾<br>{{ i18n.t('nav.discover') }}</a>
          <a routerLink="/explore" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">🔍<br>{{ i18n.t('nav.explore') }}</a>
          <a routerLink="/add" routerLinkActive="font-bold" class="py-3" style="color: var(--accent)">➕<br>{{ i18n.t('nav.add') }}</a>
          <a routerLink="/messenger" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">💬<br>{{ i18n.t('nav.messenger') }}</a>
          <a routerLink="/arcade" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">🎮<br>{{ i18n.t('nav.arcade') }}</a>
          <a routerLink="/profile" routerLinkActive="font-bold" class="py-3" style="color: var(--muted)">👤<br>{{ i18n.t('nav.profile') }}</a>
        </div>
      </nav>
    </div>
  `
})
export class AppComponent implements OnInit {

  constructor(readonly auth: AuthService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.auth.loadMe();
  }
}