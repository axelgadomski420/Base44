import { Component, Input, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface ListingDto {
  id: number; breederId: number; title: string; description: string; species: string; breed?: string;
  price?: number; currency?: string; city?: string; region?: string; status: string; featuredUntil?: string;
  media: { id: number; mediaType: string; url: string; tag?: string; cover: boolean }[];
}

@Component({
  selector: 'purre-listing-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
  @if (listing(); as l) {
    <article class="pb-24">
      <div class="relative">
        <img [src]="active().url" [alt]="l.title" class="w-full h-[55vh] object-cover cursor-zoom-in" (click)="toggleLightbox()">
        <a routerLink="/discover" class="absolute top-4 left-4 purre-card px-3 py-1 text-sm">←</a>
      </div>
      <div class="px-5 mt-4 flex gap-2 overflow-x-auto">
        @for (m of l.media; track m.id) {
          <img [src]="m.url" (click)="active.set(m)" class="h-16 w-16 object-cover rounded-lg cursor-pointer"
               [style.outline]="active().id === m.id ? '2px solid var(--accent)' : 'none'">
        }
      </div>
      <div class="px-5 mt-4 space-y-2">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold">{{ l.title }}</h1>
          @if (isFeatured(l)) { <span class="purre-badge">⭐ {{ i18n.t('ad.sponsored') }}</span> }
        </div>
        <p class="text-xl font-bold" style="color: var(--accent-2)">
          {{ l.price ? (l.price | number:'.2') + ' ' + l.currency : '' }}
        </p>
        <p class="purre-muted text-sm">{{ l.breed }} · {{ l.city }} {{ l.region ? '· ' + l.region : '' }}</p>
        <p class="text-sm leading-relaxed whitespace-pre-line">{{ l.description }}</p>
        @if (l.status === 'SOLD') { <p class="purre-badge">✅ {{ i18n.t('listing.sold') }}</p> }
      </div>
    </article>
    @if (lightbox()) {
      <div class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" (click)="toggleLightbox()">
        <img [src]="active().url" class="max-h-full max-w-full object-contain">
      </div>
    }
  }
  `
})
export class ListingDetailPage implements OnInit {

  @Input() id = 0;
  readonly listing = signal<ListingDto | null>(null);
  readonly active = signal<{ id: number; url: string; mediaType: string; cover: boolean }>({ id: 0, url: '', mediaType: 'IMAGE', cover: false });
  readonly lightbox = signal(false);

  constructor(private route: ActivatedRoute, private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get<ListingDto>('/listings/' + id).subscribe({
      next: (l) => {
        this.listing.set(l);
        const first = l.media.find(m => m.cover) ?? l.media[0];
        if (first) this.active.set(first);
      }
    });
  }

  toggleLightbox(): void { this.lightbox.update(v => !v); }
  isFeatured(l: ListingDto): boolean { return !!l.featuredUntil && new Date(l.featuredUntil).getTime() > Date.now(); }
}