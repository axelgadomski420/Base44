import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface ListingDto {
  id: number; title: string; breed?: string; city?: string; price?: number; currency?: string;
  listingType?: string; gender?: string; birthDate?: string; distanceKm?: number;
  media: { id: number; mediaType: string; url: string; cover: boolean }[];
}
interface SuggestDto { breeds: string[]; cities: string[]; }
interface SavedSearchDto {
  id: number; name: string; species?: string; breed?: string; city?: string; listingType?: string;
  gender?: string; maxAgeMonths?: number; minPrice?: number; maxPrice?: number; radiusKm: number; sort?: string;
}

/** 0.4.0/0.5.0: wyszukiwarka — debounce, podpowiedzi, filtry, sortowanie + zapisane wyszukiwania (M9). */
@Component({
  selector: 'purre-explore',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <header class="px-5 pt-6 pb-3 flex items-center justify-between">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('nav.explore') }}</h1>
    <div class="flex gap-2">
      <button class="purre-badge" (click)="saveSearch()">💾 Zapisz</button>
      <a routerLink="/feed" class="purre-badge">🎬 HoloFeed</a>
    </div>
  </header>

  @if (saved(); as s) { <p class="px-5 text-xs" style="color: var(--accent-2)">{{ s }}</p> }

  @if (mySearches().length) {
    <section class="px-5 mt-2 flex flex-wrap gap-1">
      @for (s of mySearches(); track s.id) {
        <span class="purre-badge" style="outline: 1px solid var(--accent)">
          <button (click)="applySaved(s)">⭐ {{ s.name }}</button>
          <button class="ml-1" (click)="deleteSaved(s.id)">×</button>
        </span>
      }
    </section>
  }

  <section class="px-5 flex gap-2 mt-2">
    <input class="purre-input flex-1" placeholder="Rasa…" [(ngModel)]="breed" (ngModelChange)="onQuery()">
    <select class="purre-input w-24" [(ngModel)]="species" (ngModelChange)="search()">
      <option value="">—</option>
      <option value="DOG">🐶</option>
      <option value="CAT">🐱</option>
    </select>
  </section>

  @if (suggestions(); as s) {
    <section class="px-5 mt-2 flex flex-wrap gap-1">
      @for (b of s.breeds; track b) {
        <button class="purre-badge" (click)="applyBreed(b)">🐾 {{ b }}</button>
      }
      @for (c of s.cities; track c) {
        <button class="purre-badge" (click)="applyCity(c)">📍 {{ c }}</button>
      }
    </section>
  }

  <section class="px-5 mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
    <input class="purre-input" placeholder="Miasto" [(ngModel)]="city" (ngModelChange)="onQuery()">
    <input class="purre-input" type="number" min="0" placeholder="Cena od" [(ngModel)]="minPrice" (ngModelChange)="onQuery()">
    <input class="purre-input" type="number" min="0" placeholder="Cena do" [(ngModel)]="maxPrice" (ngModelChange)="onQuery()">
    <select class="purre-input" [(ngModel)]="sort" (ngModelChange)="search()">
      <option value="NEWEST">Najnowsze</option>
      <option value="PRICE_ASC">Cena ↑</option>
      <option value="PRICE_DESC">Cena ↓</option>
      <option value="DISTANCE">Najbliżej</option>
    </select>
  </section>

  <section class="px-5 mt-2 flex gap-2 flex-wrap">
    <select class="purre-input w-24 text-sm" [(ngModel)]="gender" (ngModelChange)="search()">
      <option value="">Płeć</option>
      <option value="MALE">♂</option>
      <option value="FEMALE">♀</option>
    </select>
    <select class="purre-input w-28 text-sm" [(ngModel)]="maxAgeMonths" (ngModelChange)="search()">
      <option [ngValue]="null">Wiek</option>
      <option [ngValue]="3">do 3 mies.</option>
      <option [ngValue]="6">do 6 mies.</option>
      <option [ngValue]="12">do 12 mies.</option>
      <option [ngValue]="24">do 24 mies.</option>
    </select>
    @for (t of types; track t.value) {
      <button class="purre-badge" [style.outline]="type === t.value ? '2px solid var(--accent)' : 'none'"
              (click)="type = t.value; search()">{{ t.label }}</button>
    }
    <select class="purre-input w-28 text-sm" [(ngModel)]="radius" (ngModelChange)="search()">
      <option [ngValue]="25">25 km</option>
      <option [ngValue]="50">50 km</option>
      <option [ngValue]="100">100 km</option>
      <option [ngValue]="500">Cała PL</option>
    </select>
  </section>

  <section class="px-5 mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
    @for (item of items(); track item.id) {
      <a [routerLink]="['/listing', item.id]" class="purre-card overflow-hidden">
        @if (item.media?.length) { <img [src]="item.media[0].url" [alt]="item.title" class="w-full h-36 object-cover"> }
        <div class="p-3">
          <div class="text-sm font-semibold truncate">{{ item.title }}</div>
          <div class="text-xs purre-muted truncate">{{ item.breed }} · {{ item.city }}</div>
          @if (item.price) { <div class="text-sm font-bold" style="color: var(--accent-2)">{{ item.price }} {{ item.currency }}</div> }
          @if (item.listingType === 'ADOPTION') { <span class="purre-badge mt-1">❤️ Adopcja</span> }
          @if (item.distanceKm != null) { <div class="text-xs purre-muted">📍 {{ item.distanceKm }} km</div> }
        </div>
      </a>
    } @empty {
      <p class="purre-muted col-span-full p-6 text-center">{{ i18n.t('discover.empty') }}</p>
    }
  </section>
  `
})
export class ExplorePage implements OnInit {
  breed = ''; species = ''; type = ''; city = ''; gender = '';
  maxAgeMonths: number | null = null;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  sort = 'NEWEST';
  radius = 100;
  readonly types = [
    { value: '', label: 'Wszystkie' },
    { value: 'SALE', label: 'Sprzedaż' },
    { value: 'ADOPTION', label: '❤️ Adopcje' }
  ];
  readonly items = signal<ListingDto[]>([]);
  readonly suggestions = signal<SuggestDto | null>(null);
  readonly mySearches = signal<SavedSearchDto[]>([]);
  readonly saved = signal('');
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private suggestDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.search();
    this.loadSaved();
  }

  loadSaved(): void {
    this.api.get<SavedSearchDto[]>('/saved-searches')
      .subscribe({ next: (s) => this.mySearches.set(s), error: () => undefined });
  }

  saveSearch(): void {
    const name = (this.breed || this.city || 'Wyszukiwanie') + (this.species ? ' · ' + (this.species === 'DOG' ? 'psy' : 'koty') : '');
    this.api.post<SavedSearchDto>('/saved-searches', {
      name, species: this.species || null, breed: this.breed || null, city: this.city || null,
      listingType: this.type || null, gender: this.gender || null, maxAgeMonths: this.maxAgeMonths,
      minPrice: this.minPrice, maxPrice: this.maxPrice, radiusKm: this.radius, sort: this.sort
    }).subscribe({
      next: () => { this.saved.set('💾 Zapisano wyszukiwanie „' + name + '”.'); this.loadSaved(); },
      error: () => this.saved.set('Nie udało się zapisać wyszukiwania.')
    });
  }

  applySaved(s: SavedSearchDto): void {
    this.species = s.species ?? ''; this.breed = s.breed ?? ''; this.city = s.city ?? '';
    this.type = s.listingType ?? ''; this.gender = s.gender ?? '';
    this.maxAgeMonths = s.maxAgeMonths ?? null;
    this.minPrice = s.minPrice ?? null; this.maxPrice = s.maxPrice ?? null;
    this.radius = s.radiusKm ?? 50; this.sort = s.sort ?? 'NEWEST';
    this.search();
  }

  deleteSaved(id: number): void {
    this.api.delete('/saved-searches/' + id).subscribe({ next: () => this.loadSaved(), error: () => undefined });
  }

  /** Debounce 300 ms — szukamy dopiero po chwili bez wpisywania. */
  onQuery(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.search(), 300);
    if (this.suggestDebounce) clearTimeout(this.suggestDebounce);
    this.suggestDebounce = setTimeout(() => this.fetchSuggest(), 200);
  }

  fetchSuggest(): void {
    const q = (this.breed || this.city || '').trim();
    if (q.length < 2) { this.suggestions.set(null); return; }
    this.api.get<SuggestDto>('/listings/suggest', { q }).subscribe({
      next: (s) => this.suggestions.set(s.breeds.length || s.cities.length ? s : null),
      error: () => this.suggestions.set(null)
    });
  }

  applyBreed(b: string): void { this.breed = b; this.suggestions.set(null); this.search(); }
  applyCity(c: string): void { this.city = c; this.suggestions.set(null); this.search(); }

  search(): void {
    this.api.get<ListingDto[]>('/listings', {
      lat: 52.2297, lng: 21.0122, radiusKm: this.radius,
      species: this.species || undefined, breed: this.breed || undefined,
      city: this.city || undefined, listingType: this.type || undefined,
      gender: this.gender || undefined, maxAgeMonths: this.maxAgeMonths ?? undefined,
      minPrice: this.minPrice ?? undefined, maxPrice: this.maxPrice ?? undefined,
      sort: this.sort
    }).subscribe({ next: (items) => this.items.set(items), error: () => this.items.set([]) });
  }
}
