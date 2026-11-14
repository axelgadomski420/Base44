import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AdSlotComponent } from '../../core/ad-slot.component';
import { I18nService } from '../../core/i18n.service';

interface ListingDto {
  id: number; breederId: number; title: string; description: string; species: string; breed?: string;
  gender?: string; birthDate?: string; color?: string; coat?: string;
  characterDesc?: string; parents?: string;
  pedigree?: boolean; vaccinated?: boolean; chipped?: boolean;
  price?: number; currency?: string; city?: string; region?: string; status: string; featuredUntil?: string;
  sponsoredUntil?: string;
  listingType?: string;
  media: { id: number; mediaType: string; url: string; tag?: string; cover: boolean }[];
}

/** 0.5.0: profil zwierzaka — pełny ekran mediów, dane, badania, akcje. */
@Component({
  selector: 'purre-listing-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, AdSlotComponent],
  template: `
  @if (listing(); as l) {
    <article class="pb-24">
      <div class="relative">
        @if (active().mediaType === 'VIDEO') {
          <video [src]="active().url" controls class="w-full h-[55vh] object-cover bg-black"></video>
        } @else {
          <img [src]="active().url" [alt]="l.title" class="w-full h-[55vh] object-cover cursor-zoom-in" (click)="toggleLightbox()">
        }
        <a routerLink="/discover" class="absolute top-4 left-4 purre-card px-3 py-1 text-sm">←</a>
        <button class="absolute top-4 right-4 purre-card px-3 py-1 text-sm" (click)="reportOpen.set(!reportOpen())">🚩</button>
      </div>
      <div class="px-5 mt-4 flex gap-2 overflow-x-auto">
        @for (m of l.media; track m.id) {
          @if (m.mediaType === 'IMAGE') {
            <img [src]="m.url" (click)="active.set(m)" class="h-16 w-16 object-cover rounded-lg cursor-pointer"
                 [style.outline]="active().id === m.id ? '2px solid var(--accent)' : 'none'">
          } @else {
            <div (click)="active.set(m)" class="h-16 w-16 rounded-lg cursor-pointer flex items-center justify-center bg-white/10"
                 [style.outline]="active().id === m.id ? '2px solid var(--accent)' : 'none'">▶️</div>
          }
        }
      </div>
      <div class="px-5 mt-4 space-y-2">
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="text-2xl font-bold">{{ l.title }}</h1>
          @if (l.listingType === 'ADOPTION') { <span class="purre-badge">❤️ Adopcja</span> }
          @if (isFeatured(l.featuredUntil)) { <span class="purre-badge">⭐ {{ i18n.t('ad.sponsored') }}</span> }
          @if (isFeatured(l.sponsoredUntil)) { <span class="purre-badge">📣 Sponsorowane</span> }
          @if (l.status === 'OPTION') { <span class="purre-badge">🔒 Opcja</span> }
          @if (l.status === 'RESERVED') { <span class="purre-badge">🔒 Zarezerwowany</span> }
          @if (l.status === 'PLANNED') { <span class="purre-badge">🐾 Planowany miot</span> }
        </div>
        @if (l.listingType !== 'ADOPTION') {
          <p class="text-xl font-bold" style="color: var(--accent-2)">
            {{ l.price ? (l.price | number:'.2') + ' ' + l.currency : '' }}
          </p>
        }
        <p class="purre-muted text-sm">{{ l.breed }} · {{ l.city }} {{ l.region ? '· ' + l.region : '' }}</p>

        <section class="purre-card p-4 mt-3 space-y-1 text-sm">
          <p class="font-semibold mb-1">🐾 Profil zwierzaka</p>
          @if (l.gender) { <p><span class="purre-muted">Płeć:</span> {{ l.gender === 'MALE' ? '♂ samiec' : '♀ samica' }}</p> }
          @if (l.birthDate) { <p><span class="purre-muted">Wiek:</span> {{ ageLabel(l.birthDate) }} <span class="purre-muted">({{ l.birthDate }})</span></p> }
          @if (l.color) { <p><span class="purre-muted">Kolor:</span> {{ l.color }}</p> }
          @if (l.coat) { <p><span class="purre-muted">Umaszczenie:</span> {{ l.coat }}</p> }
          <div class="flex gap-2 flex-wrap mt-2">
            @if (l.pedigree) { <span class="purre-badge">📜 Rodowód</span> }
            @if (l.vaccinated) { <span class="purre-badge">💉 Szczepienia</span> }
            @if (l.chipped) { <span class="purre-badge">🔖 Chip</span> }
          </div>
          @if (l.characterDesc) { <p class="mt-2 leading-relaxed"><span class="purre-muted">Charakter:</span> {{ l.characterDesc }}</p> }
          @if (l.parents) { <p class="leading-relaxed"><span class="purre-muted">Rodzice / rodowód:</span> {{ l.parents }}</p> }
        </section>

        <p class="text-sm leading-relaxed whitespace-pre-line">{{ l.description }}</p>
        @if (l.status === 'SOLD') { <p class="purre-badge">✅ {{ i18n.t('listing.sold') }}</p> }
        <div class="flex gap-2 mt-2 flex-wrap">
          <a [routerLink]="['/messenger']" [queryParams]="{ to: l.breederId }" class="purre-btn flex-1 text-center">💬 Napisz do hodowcy</a>
          @if (l.status === 'ACTIVE') {
            <a [routerLink]="['/messenger']" [queryParams]="{ to: l.breederId, subject: 'reservation-' + l.id }" class="purre-btn flex-1 text-center" style="background: rgba(255,255,255,0.08)">🔒 Zarezerwuj</a>
          }
          <button class="purre-btn" style="background: rgba(255,255,255,0.08)" (click)="share(l)">🔗 Udostępnij</button>
        </div>
        <purre-ad-slot placement="BREEDER_PANEL" class="block mt-3" />
      </div>
    </article>

    @if (reportOpen()) {
      <div class="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" (click)="reportOpen.set(false)">
        <div class="purre-card p-5 w-full max-w-md space-y-3" (click)="$event.stopPropagation()">
          <h2 class="font-bold">🚩 Zgłoś ogłoszenie</h2>
          <select class="purre-input" [(ngModel)]="reportReason">
            <option value="SPAM">Spam</option>
            <option value="FAKE_LISTING">Fałszywe ogłoszenie</option>
            <option value="PSEUDO_BREEDER">Pseudohodowla</option>
            <option value="CRUELTY">Okrucieństwo wobec zwierząt</option>
            <option value="SCAM">Oszustwo</option>
            <option value="OTHER">Inne</option>
          </select>
          <textarea class="purre-input" rows="3" [(ngModel)]="reportDesc" placeholder="Opis (opcjonalny)"></textarea>
          @if (reportMsg()) { <p class="text-sm" style="color: var(--accent-2)">{{ reportMsg() }}</p> }
          <button class="purre-btn w-full" (click)="sendReport()">Wyślij zgłoszenie</button>
        </div>
      </div>
    }

    @if (lightbox()) {
      <div class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" (click)="toggleLightbox()">
        <img [src]="active().url" class="max-h-full max-w-full object-contain">
      </div>
    }
  }
  `
})
export class ListingDetailPage implements OnInit {

  readonly listing = signal<ListingDto | null>(null);
  readonly active = signal<{ id: number; url: string; mediaType: string; cover: boolean }>({ id: 0, url: '', mediaType: 'IMAGE', cover: false });
  readonly lightbox = signal(false);
  readonly reportOpen = signal(false);
  readonly reportMsg = signal('');
  reportReason = 'SPAM';
  reportDesc = '';

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

  sendReport(): void {
    const l = this.listing();
    if (!l) return;
    this.api.post('/reports', { listingId: l.id, reason: this.reportReason, description: this.reportDesc })
      .subscribe({
        next: () => { this.reportMsg.set('Dziękujemy — zgłoszenie trafiło do moderatorów.'); },
        error: () => this.reportMsg.set('Nie udało się wysłać zgłoszenia.')
      });
  }

  toggleLightbox(): void { this.lightbox.update(v => !v); }
  isFeatured(until?: string): boolean { return !!until && new Date(until).getTime() > Date.now(); }

  ageLabel(birthDate: string): string {
    const months = Math.max(0, Math.floor((Date.now() - new Date(birthDate).getTime()) / (30.44 * 24 * 3600 * 1000)));
    if (months < 12) return months + ' mies.';
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return years + ' ' + (years === 1 ? 'rok' : (years < 5 ? 'lata' : 'lat')) + (rest ? ' ' + rest + ' mies.' : '');
  }

  share(l: ListingDto): void {
    const url = window.location.origin + '/listing/' + l.id;
    if (navigator.share) {
      navigator.share({ title: l.title, url }).catch(() => undefined);
    } else {
      navigator.clipboard?.writeText(url);
      this.reportMsg.set('');
      alert('Link skopiowany: ' + url);
    }
  }
}
