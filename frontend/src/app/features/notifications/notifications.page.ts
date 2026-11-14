import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

interface NotificationDto {
  id: number; type: string; title: string; body?: string; link?: string; read: boolean; createdAt: string;
}

@Component({
  selector: 'purre-notifications',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-3">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">🔔 Powiadomienia</h1>
      <button class="purre-badge" (click)="readAll()">✔️ Odczytaj wszystkie</button>
    </header>
    @for (n of items(); track n.id) {
      <div class="purre-card p-4" [style.opacity]="n.read ? 0.6 : 1">
        <div class="flex justify-between gap-2">
          <div class="min-w-0">
            <p class="font-semibold text-sm">{{ n.title }}</p>
            @if (n.body) { <p class="text-xs purre-muted mt-0.5">{{ n.body }}</p> }
            <p class="text-[11px] purre-muted mt-1">{{ n.createdAt | date:'dd.MM HH:mm' }}</p>
          </div>
          @if (n.link) {
            <a [routerLink]="n.link" class="purre-badge shrink-0" (click)="markRead(n)">Otwórz</a>
          } @else if (!n.read) {
            <button class="purre-badge shrink-0" (click)="markRead(n)">✔️</button>
          }
        </div>
      </div>
    } @empty {
      <p class="purre-muted text-sm">Brak powiadomień.</p>
    }
  </div>
  `
})
export class NotificationsPage implements OnInit {
  readonly items = signal<NotificationDto[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<NotificationDto[]>('/notifications').subscribe({ next: (n) => this.items.set(n), error: () => undefined });
  }

  markRead(n: NotificationDto): void {
    if (n.read) return;
    this.api.post('/notifications/' + n.id + '/read', {}).subscribe({ next: () => { n.read = true; }, error: () => undefined });
  }

  readAll(): void {
    this.api.post('/notifications/read-all', {}).subscribe({ next: () => this.load(), error: () => undefined });
  }
}
