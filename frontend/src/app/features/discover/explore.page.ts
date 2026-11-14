import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface ListingDto {
  id: number; title: string; breed?: string; city?: string; price?: number; currency?: string;
  listingType?: string;
  media: { id: number; mediaType: string; url: string; cover: boolean }[];
}

@Component({
  selector: 'purre-explore',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <header class="px-5 pt-6 pb-3 flex items-center justify-between">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('nav.explore') }}</h1>
    <a routerLink="/feed" class="purre-badge">🎬 HoloFeed</a>
  </header>
  <section class="px-5 flex gap-2">
    <input class="purre-input flex-1" placeholder="Rasa" [(ngModel)]="breed">
    <select class="purre-input w-24" [(ngModel)]="species">
      <option value="">—</option>
      <option value="DOG">🐶</option>
      <option value="CAT">🐱</option>
    </select>
    <button class="purre-btn" (click)="search()">🔍</button>
  </section>
  <section class="px-5 mt-2 flex gap-2">
    @for (t of types; track t.value) {
      <button class="purre-badge" [style.outline]="type === t.value ? '2px solid var(--accent)' : 'none'"
              (click)="type = t.value; search()">{{ t.label }}</button>
    }
  </section>
  <section class="px-5 mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
    @for (item of items(); track item.id) {
      <a [routerLink]="['/listing', item.id]" class="purre-card overflow-hidden">
        @if (item.media?.length) { <img [src]="item.media[0].url" [alt]="item.title" class="w-full h-36 object-cover"> }
        <div class="p-3">
          <div class="text-sm font-semibold truncate">{{ item.title }}</div>
          <div class="text-xs purre-muted">{{ item.city }}</div>
          @if (item.listingType === 'ADOPTION') { <span class="purre-badge mt-1">❤️ Adopcja</span> }
        </div>
      </a>
    } @empty {
      <p class="purre-muted col-span-full p-6 text-center">{{ i18n.t('discover.empty') }}</p>
    }
  </section>
  `
})
export class ExplorePage implements OnInit {
  breed = ''; species = ''; type = '';
  readonly types = [
    { value: '', label: 'Wszystkie' },
    { value: 'SALE', label: 'Sprzedaz' },
    { value: 'ADOPTION', label: '❤️ Adopcje' }
  ];
  readonly items = signal<ListingDto[]>([]);

  constructor(private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void { this.search(); }

  search(): void {
    this.api.get<ListingDto[]>('/listings', {
      lat: 52.2297, lng: 21.0122, radiusKm: 500,
      species: this.species || undefined, breed: this.breed || undefined,
      listingType: this.type || undefined
    }).subscribe({ next: (items) => this.items.set(items), error: () => this.items.set([]) });
  }
}