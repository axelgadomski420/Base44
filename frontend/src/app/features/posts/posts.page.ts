import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

interface MediaDto { url: string; mediaType: string; }
interface PostDto {
  id: number; userId: number; userName: string; caption: string; postType: string;
  media: MediaDto[]; likes: number; likedByMe: boolean; createdAt: string;
}

/** 0.4.0: feed postów i Reels. */
@Component({
  selector: 'purre-posts',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">📝 Posty</h1>
      <a routerLink="/create" class="purre-badge">✨ Dodaj</a>
    </header>

    @for (p of items(); track p.id) {
      <article class="purre-card overflow-hidden">
        <div class="p-4 flex items-center gap-3">
          <div class="h-10 w-10 rounded-full flex items-center justify-center"
               style="background: linear-gradient(135deg, var(--accent), var(--accent-2));">🐾</div>
          <div class="min-w-0">
            <p class="font-semibold text-sm truncate">{{ p.userName }}</p>
            <p class="text-xs purre-muted">{{ p.createdAt | date:'short' }} @if (p.postType === 'REEL') { · 🎬 Reels }</p>
          </div>
        </div>
        @if (p.media?.length) {
          <div class="grid gap-1" [class.grid-cols-1]="p.media.length === 1" [class.grid-cols-2]="p.media.length > 1">
            @for (m of p.media; track $index) {
              @if (m.mediaType === 'VIDEO') {
                <video [src]="m.url" controls preload="metadata" class="w-full max-h-[60vh] object-cover bg-black"></video>
              } @else {
                <img [src]="m.url" (click)="lightbox.set(m.url)" loading="lazy"
                     class="w-full max-h-[60vh] object-cover cursor-zoom-in" alt="">
              }
            }
          </div>
        }
        <div class="p-4">
          <p class="text-sm whitespace-pre-line">{{ p.caption }}</p>
          <button class="purre-badge mt-2" (click)="like(p)">
            {{ p.likedByMe ? '❤️' : '🤍' }} {{ p.likes }}
          </button>
        </div>
      </article>
    } @empty {
      <p class="purre-muted text-center p-6">Brak postów — bądź pierwszy! ✨</p>
    }
  </div>

  @if (lightbox()) {
    <div class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" (click)="lightbox.set(null)">
      <img [src]="lightbox()!" class="max-h-full max-w-full object-contain">
    </div>
  }
  `
})
export class PostsPage implements OnInit {
  readonly items = signal<PostDto[]>([]);
  readonly lightbox = signal<string | null>(null);

  constructor(private api: ApiService, readonly auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<PostDto[]>('/posts/feed').subscribe({
      next: (l) => this.items.set(l), error: () => this.items.set([])
    });
  }

  like(p: PostDto): void {
    this.api.post<PostDto>('/posts/' + p.id + '/like', {}).subscribe({
      next: (updated) => this.items.update(list => list.map(x => x.id === updated.id ? updated : x)),
      error: () => undefined
    });
  }
}
