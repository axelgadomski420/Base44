import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

interface UserRow {
  id: number; email: string; displayName: string; role: string;
  city?: string; verifiedBadge: boolean; premiumUntil?: string; createdAt: string;
}

@Component({
  selector: 'purre-admin-hub',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">🛡️ Panel administratora</h1>

    <div class="grid grid-cols-3 gap-2">
      <a routerLink="/admin/verifications" class="purre-card p-4 text-center">📋 Weryfikacje</a>
      <a routerLink="/admin/ads" class="purre-card p-4 text-center">📣 Reklamy</a>
      <a routerLink="/moderation" class="purre-card p-4 text-center">⚖️ Zgłoszenia</a>
    </div>

    <section class="purre-card p-5 space-y-3">
      <h2 class="font-bold">Użytkownicy</h2>
      <input class="purre-input" placeholder="Szukaj: e-mail, nazwa, miasto…" [(ngModel)]="query" (ngModelChange)="load()">
      <div class="max-h-[60vh] overflow-y-auto space-y-2">
        @for (u of users(); track u.id) {
          <div class="flex items-center justify-between gap-2 text-sm border-b border-white/5 pb-2">
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ u.displayName }} @if (u.verifiedBadge) {<span>✅</span>}</p>
              <p class="purre-muted text-xs truncate">{{ u.email }} · {{ u.city }}</p>
            </div>
            <select class="purre-input w-36 text-xs" [ngModel]="u.role" (ngModelChange)="setRole(u.id, $event)">
              <option value="BUYER">KUPUJĄCY</option>
              <option value="BREEDER">HODOWCA</option>
              <option value="MODERATOR">MODERATOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        }
      </div>
    </section>
  </div>
  `
})
export class AdminHubPage implements OnInit {
  query = '';
  readonly users = signal<UserRow[]>([]);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiService, readonly auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<{ content: UserRow[] }>('/admin/users', { query: this.query || undefined })
      .subscribe({ next: (p) => this.users.set(p.content ?? []), error: () => this.users.set([]) });
  }

  setRole(id: number, role: string): void {
    this.api.post('/admin/users/' + id + '/role', { role }).subscribe({ next: () => this.load() });
  }
}