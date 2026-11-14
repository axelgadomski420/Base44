import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

interface ListingDto {
  id: number; title: string; breed?: string; city?: string; breederId: number; listingType?: string;
  media: { id: number; mediaType: string; url: string; cover: boolean }[];
}

/** HoloFeed (faza 3): pionowy feed wideo z ogloszen — wzorzec TikTok. */
@Component({
  selector: 'purre-feed',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="h-[100dvh] overflow-y-auto snap-y snap-mandatory">
    @for (item of items(); track item.id) {
      @for (video of videos(item); track video.id) {
        <section class="h-[100dvh] snap-start relative flex items-center justify-center bg-black">
          <video [src]="video.url" loop muted playsinline preload="metadata"
                 class="h-full w-full object-contain"
                 (click)="togglePlay($event)"></video>
          <div class="absolute bottom-24 left-5 right-20 text-white drop-shadow">
            <h2 class="text-lg font-bold">{{ item.title }}</h2>
            <p class="text-sm opacity-80">{{ item.breed }} · {{ item.city }}</p>
            @if (item.listingType === 'ADOPTION') { <span class="purre-badge mt-1">❤️ Adopcja</span> }
            <div class="mt-2 flex gap-2">
              <a [routerLink]="['/listing', item.id]" class="purre-btn text-sm">Zobacz ogloszenie</a>
              <a [routerLink]="['/messenger']" [queryParams]="{ to: item.breederId }" class="purre-card px-3 py-1 text-sm text-white">💬</a>
            </div>
          </div>
          <p class="absolute top-4 right-5 text-white/60 text-xs">HoloFeed</p>
        </section>
      }
    } @empty {
      <div class="h-[100dvh] flex flex-col items-center justify-center gap-2">
        <p class="text-4xl">🎬</p>
        <p class="purre-muted">Brak wideo w feedzie — wroc wkrotce!</p>
        <a routerLink="/discover" class="purre-btn">← Discover</a>
      </div>
    }
  </div>
  `
})
export class FeedPage implements OnInit {
  readonly items = signal<ListingDto[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<ListingDto[]>('/listings/feed', { limit: 20 })
      .subscribe({ next: (l) => this.items.set(l), error: () => this.items.set([]) });
  }

  videos(item: ListingDto) {
    return (item.media ?? []).filter(m => m.mediaType === 'VIDEO');
  }

  togglePlay(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.paused) { video.play().catch(() => undefined); } else { video.pause(); }
  }
}