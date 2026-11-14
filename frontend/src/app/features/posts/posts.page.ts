import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AdSlotComponent } from '../../core/ad-slot.component';
import { SoundLibraryService } from '../../core/sounds';
import { filterCss } from '../../core/media-filters';

interface MediaDto { url: string; mediaType: string; }
interface PostDto {
  id: number; userId: number; userName: string; caption: string; postType: string;
  media: MediaDto[]; soundId?: string | null; filterId?: string | null; planBadge?: string;
  likes: number; likedByMe: boolean; createdAt: string;
}

const BADGES: Record<string, string> = { PRO: '⭐ PRO', ULTIMATE: '💎 ULTIMATE', PREMIUM: '👑 Premium' };

/** 0.5.0: feed postów i Reels z dźwiękiem 🔊, filtrami i badge pakietu autora. */
@Component({
  selector: 'purre-posts',
  standalone: true,
  imports: [RouterLink, DatePipe, AdSlotComponent],
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
            <p class="font-semibold text-sm truncate">{{ p.userName }}
              @if (p.planBadge && p.planBadge !== 'FREE') { <span class="purre-badge">{{ badges[p.planBadge] }}</span> }
            </p>
            <p class="text-xs purre-muted">{{ p.createdAt | date:'short' }} @if (p.postType === 'REEL') { · 🎬 Reels }</p>
          </div>
          @if (p.soundId) {
            <button class="purre-badge ml-auto" (click)="toggleSound(p)">{{ playingId() === p.id ? '🔇' : '🔊' }}</button>
          }
        </div>
        @if (p.media?.length) {
          <div class="grid gap-1" [class.grid-cols-1]="p.media.length === 1" [class.grid-cols-2]="p.media.length > 1">
            @for (m of p.media; track $index) {
              @if (m.mediaType === 'VIDEO') {
                <video [src]="m.url" controls preload="metadata" [style.filter]="filterCss(p.filterId)"
                       class="w-full max-h-[60vh] object-cover bg-black"></video>
              } @else {
                <img [src]="m.url" (click)="lightbox.set(m.url)" loading="lazy" [style.filter]="filterCss(p.filterId)"
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
      @if ($index === 1) { <purre-ad-slot placement="DISCOVER" [everyN]="5" class="block" /> }
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
export class PostsPage implements OnInit, OnDestroy {
  readonly items = signal<PostDto[]>([]);
  readonly lightbox = signal<string | null>(null);
  readonly playingId = signal<number | null>(null);
  readonly badges = BADGES;
  readonly filterCss = filterCss;

  constructor(private api: ApiService, readonly auth: AuthService, private lib: SoundLibraryService) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.lib.stop(); }

  load(): void {
    this.api.get<PostDto[]>('/posts/feed').subscribe({
      next: (l) => this.items.set(l), error: () => this.items.set([])
    });
  }

  toggleSound(p: PostDto): void {
    if (this.playingId() === p.id) {
      this.lib.stop();
      this.playingId.set(null);
      return;
    }
    this.lib.stop();
    this.lib.playLoop(p.soundId!);
    this.playingId.set(p.id);
  }

  like(p: PostDto): void {
    this.api.post<PostDto>('/posts/' + p.id + '/like', {}).subscribe({
      next: (updated) => this.items.update(list => list.map(x => x.id === updated.id ? updated : x)),
      error: () => undefined
    });
  }
}
