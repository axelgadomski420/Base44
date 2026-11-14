import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface ListingDto {
  id: number; title: string; breed?: string; price?: number; currency?: string;
  city?: string; distanceKm?: number; featuredUntil?: string; status: string;
  media: { id: number; mediaType: string; url: string; cover: boolean }[];
}
interface AdDto { id: number; title: string; imageUrl?: string; targetUrl: string; type: string; }

@Component({
  selector: 'purre-discover',
  standalone: true,
  imports: [RouterLink],
  template: `
  <header class="px-5 pt-6 pb-2">
    <h1 class="text-3xl font-extrabold tracking-tight">PURRE <span style="color: var(--accent)">PETS</span></h1>
    <p class="purre-muted text-sm mt-1">{{ i18n.t('discover.nearby') }} · {{ radius }} km</p>
  </header>

  <section class="px-5 grid grid-cols-2 md:grid-cols-3 gap-3">
    @for (item of items(); track $index) {
      @if ($index > 0 && $index % 6 === 0 && ad()) {
        <a [href]="ad()!.targetUrl" target="_blank" rel="noopener nofollow"
           class="purre-card p-4 col-span-2 md:col-span-3 flex items-center gap-3">
          <span class="purre-badge">{{ i18n.t('ad.sponsored') }}</span>
          <span class="text-sm font-semibold">{{ ad()!.title }}</span>
        </a>
      }
      <a [routerLink]="['/listing', item.id]" class="purre-card overflow-hidden">
        @if (cover(item); as img) {
          <img [src]="img" [alt]="item.title" class="w-full h-40 object-cover">
        } @else {
          <div class="w-full h-40 flex items-center justify-center text-3xl">🐾</div>
        }
        <div class="p-3">
          <div class="text-sm font-semibold truncate">{{ item.title }}</div>
          <div class="text-xs purre-muted truncate">{{ item.breed }} · {{ item.city }}</div>
          <div class="text-sm font-bold mt-1" style="color: var(--accent-2)">
            {{ item.price ? (item.price | number:'.2') + ' ' + item.currency : '' }}
          </div>
          @if (item.distanceKm != null) { <div class="text-xs purre-muted mt-1">📍 {{ item.distanceKm }} km</div> }
          @if (isFeatured(item)) { <span class="purre-badge mt-1">⭐ {{ i18n.t('ad.sponsored') }}</span> }
        </div>
      </a>
    } @empty {
      <p class="purre-muted col-span-full p-6 text-center">{{ i18n.t('discover.empty') }}</p>
    }
  </section>
  `
})
export class DiscoverPage implements OnInit {
  readonly items = signal<ListingDto[]>([]);
  readonly ad = signal<AdDto | null>(null);
  radius = 50;

  constructor(private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    if (!navigator.geolocation) { this.load(52.2297, 21.0122); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => this.load(pos.coords.latitude, pos.coords.longitude),
      () => this.load(52.2297, 21.0122),
      { timeout: 5000 }
    );
  }

  cover(item: ListingDto): string | null {
    const media = item.media?.find(m => m.cover && m.mediaType === 'IMAGE') ?? item.media?.find(m => m.mediaType === 'IMAGE');
    return media ? media.url : null;
  }

  isFeatured(item: ListingDto): boolean {
    return !!item.featuredUntil && new Date(item.featuredUntil).getTime() > Date.now();
  }

  private load(lat: number, lng: number): void {
    this.api.get<ListingDto[]>('/listings', { lat, lng, lng2: undefined, radiusKm: this.radius })
      .subscribe({ next: (items) => this.items.set(items), error: () => this.items.set([]) });
    this.api.get<AdDto>('/ads/serve', { placement: 'DISCOVER' })
      .subscribe({ next: (ad) => this.ad.set(ad), error: () => this.ad.set(null) });
  }
}