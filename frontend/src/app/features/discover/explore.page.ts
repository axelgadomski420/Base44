import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface ListingDto {
  id: number; title: string; breed?: string; city?: string; price?: number; currency?: string;
  media: { id: number; mediaType: string; url: string; cover: boolean }[];
}

@Component({
  selector: 'purre-explore',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <header class="px-5 pt-6 pb-3">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('nav.explore') }}</h1>
  </header>
  <section class="px-5 flex gap-2">
    <input class="purre-input" [placeholder]="i18n.t('discover.radius') + ' — rasa'" [(ngModel)]="breed">
    <select class="purre-input w-32" [(ngModel)]="species">
      <option value="">—</option>
      <option value="DOG">🐶</option>
      <option value="CAT">🐱</option>
    </select>
    <button class="purre-btn" (click)="search()">🔍</button>
  </section>
  <section class="px-5 mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
    @for (item of items(); track item.id) {
      <a [routerLink]="['/listing', item.id]" class="purre-card overflow-hidden">
        @if (item.media?.length) { <img [src]="item.media[0].url" [alt]="item.title" class="w-full h-36 object-cover"> }
        <div class="p-3">
          <div class="text-sm font-semibold truncate">{{ item.title }}</div>
          <div class="text-xs purre-muted">{{ item.city }}</div>
        </div>
      </a>
    } @empty {
      <p class="purre-muted col-span-full p-6 text-center">{{ i18n.t('discover.empty') }}</p>
    }
  </section>
  `
})
export class ExplorePage implements OnInit {
  breed = ''; species = '';
  readonly items = signal<ListingDto[]>([]);

  constructor(private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void { this.search(); }

  search(): void {
    this.api.get<ListingDto[]>('/listings', {
      lat: 52.2297, lng: 21.0122, radiusKm: 500,
      species: this.species || undefined, breed: this.breed || undefined
    }).subscribe({ next: (items) => this.items.set(items), error: () => this.items.set([]) });
  }
}