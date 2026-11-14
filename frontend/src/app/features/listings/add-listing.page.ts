import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, ApiError } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface UploadedMedia { url: string; mediaType: 'IMAGE' | 'VIDEO'; }

@Component({
  selector: 'purre-add-listing',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('listing.add') }}</h1>

    <form (ngSubmit)="submit()" class="space-y-4">
      <label class="block text-sm">{{ i18n.t('listing.title') }}
        <input class="purre-input mt-1" name="title" [(ngModel)]="title" required>
      </label>
      <label class="block text-sm">{{ i18n.t('listing.description') }}
        <textarea class="purre-input mt-1" name="description" rows="5" [(ngModel)]="description" required></textarea>
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-sm">Gatunek
          <select class="purre-input mt-1" name="species" [(ngModel)]="species">
            <option value="DOG">🐶 Pies</option>
            <option value="CAT">🐱 Kot</option>
          </select>
        </label>
        <label class="block text-sm">Rasa
          <input class="purre-input mt-1" name="breed" [(ngModel)]="breed">
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-sm">Płeć
          <select class="purre-input mt-1" name="gender" [(ngModel)]="gender">
            <option value="">—</option>
            <option value="MALE">♂ Samiec</option>
            <option value="FEMALE">♀ Samica</option>
          </select>
        </label>
        <label class="block text-sm">Data urodzenia
          <input class="purre-input mt-1" type="date" name="birthDate" [(ngModel)]="birthDate">
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="block text-sm">Kolor
          <input class="purre-input mt-1" name="color" [(ngModel)]="color">
        </label>
        <label class="block text-sm">Umaszczenie
          <input class="purre-input mt-1" name="coat" [(ngModel)]="coat">
        </label>
      </div>
      <label class="block text-sm">Charakter
        <textarea class="purre-input mt-1" name="characterDesc" rows="2" [(ngModel)]="characterDesc"
                  placeholder="Temperament, potrzeby, warunki życia…"></textarea>
      </label>
      <label class="block text-sm">Rodzice / rodowód
        <input class="purre-input mt-1" name="parents" [(ngModel)]="parents" placeholder="np. CH. Azor z Doliny x Fela">
      </label>
      <div class="flex gap-4 text-sm">
        <label><input type="checkbox" name="pedigree" [(ngModel)]="pedigree"> 📜 Rodowód</label>
        <label><input type="checkbox" name="vaccinated" [(ngModel)]="vaccinated"> 💉 Szczepienia</label>
        <label><input type="checkbox" name="chipped" [(ngModel)]="chipped"> 🔖 Chip</label>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <label class="block text-sm">Cena (PLN)
          <input class="purre-input mt-1" type="number" step="0.01" name="price" [(ngModel)]="price">
        </label>
        <label class="block text-sm">Miasto
          <input class="purre-input mt-1" name="city" [(ngModel)]="city" required>
        </label>
        <label class="block text-sm">Województwo
          <input class="purre-input mt-1" name="region" [(ngModel)]="region">
        </label>
      </div>

      <div class="purre-card p-4" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
        <p class="text-sm font-semibold">{{ i18n.t('listing.photos') }}</p>
        <p class="text-xs purre-muted mt-1">Przeciągnij i upuść lub wybierz pliki. Pierwsze zdjęcie = okładka.</p>
        <input class="mt-2 text-sm" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
               (change)="onFiles($event)">
        <div class="flex flex-wrap gap-2 mt-3">
          @for (m of media(); track $index) {
            <div class="relative">
              <img [src]="m.url" class="h-16 w-16 object-cover rounded-lg" alt="">
              <button type="button" (click)="removeAt($index)"
                class="absolute -top-1 -right-1 text-xs px-1.5 rounded-full" style="background: var(--danger); color: #fff;">×</button>
            </div>
          }
        </div>
        @if (uploading()) { <p class="text-xs purre-muted mt-2">Upload {{ progress() }}/{{ total() }}…</p> }
      </div>

      @if (error()) {
        <div class="purre-card p-4" style="border-color: var(--danger)">
          <p class="purre-error">{{ error() }}</p>
          @if (needCoins()) {
            <a routerLink="/wallet" class="purre-btn mt-2">💰 {{ i18n.t('wallet.buy') }}</a>
          }
        </div>
      }
      <button class="purre-btn w-full" [disabled]="busy() || uploading()">{{ i18n.t('listing.publish') }}</button>
      <a routerLink="/my-ads" class="purre-badge block text-center mt-2">📣 Promuj — reklama sponsorowana (1 dzień 50 🪙 / 7 dni 200 🪙)</a>
    </form>
  </div>
  `
})
export class AddListingPage {
  title = ''; description = ''; species = 'DOG'; breed = '';
  gender = ''; birthDate = ''; color = ''; coat = '';
  characterDesc = ''; parents = '';
  pedigree = false; vaccinated = false; chipped = false;
  price: number | null = null; city = ''; region = '';
  readonly media = signal<UploadedMedia[]>([]);
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly total = signal(0);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly needCoins = signal(false);

  constructor(private api: ApiService, private router: Router, readonly i18n: I18nService) {}

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) this.addFiles(Array.from(event.dataTransfer.files));
  }

  removeAt(index: number): void {
    this.media.update(list => list.filter((_, i) => i !== index));
  }

  private async addFiles(files: File[]): Promise<void> {
    const images = this.media().filter(m => m.mediaType === 'IMAGE').length + files.filter(f => f.type.startsWith('image/')).length;
    const videos = this.media().filter(m => m.mediaType === 'VIDEO').length + files.filter(f => f.type.startsWith('video/')).length;
    if (files.length + this.media().length > 23) { this.error.set('Maksymalnie 20 zdjęć i 3 wideo.'); return; }
    if (images > 20) { this.error.set('Maksymalnie 20 zdjęć.'); return; }
    if (videos > 3) { this.error.set('Maksymalnie 3 wideo.'); return; }
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { this.error.set('Plik ' + file.name + ' przekracza 10 MB.'); continue; }
    }
    this.uploading.set(true); this.total.set(files.length); this.progress.set(0);
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await new Promise<UploadedMedia>((resolve, reject) => {
          this.api.postMultipart<{ url: string; mediaType: 'IMAGE' | 'VIDEO' }>('/media/upload', form)
            .subscribe({ next: resolve, error: reject });
        });
        this.media.update(list => [...list, res]);
      } catch (e) {
        this.error.set(e instanceof ApiError ? e.message : 'Błąd uploadu.');
      }
      this.progress.update(p => p + 1);
    }
    this.uploading.set(false);
  }

  async submit(): Promise<void> {
    this.busy.set(true); this.error.set(''); this.needCoins.set(false);
    const coords = await this.geolocate();
    try {
      const created = await new Promise<{ id: number }>((resolve, reject) => {
        this.api.post<{ id: number }>('/listings', {
          title: this.title, description: this.description, species: this.species, breed: this.breed,
          gender: this.gender || undefined, birthDate: this.birthDate || undefined,
          color: this.color || undefined, coat: this.coat || undefined,
          characterDesc: this.characterDesc || undefined, parents: this.parents || undefined,
          pedigree: this.pedigree, vaccinated: this.vaccinated, chipped: this.chipped,
          price: this.price, city: this.city, region: this.region,
          latitude: coords.lat, longitude: coords.lng,
          media: this.media().map((m, i) => ({ url: m.url, mediaType: m.mediaType, isCover: i === 0 }))
        }).subscribe({ next: resolve, error: reject });
      });
      this.router.navigate(['/listing', created.id]);
    } catch (e) {
      if (e instanceof ApiError) {
        this.error.set(e.message);
        this.needCoins.set(e.code === 'INSUFFICIENT_COINS' || e.code === 'NOT_VERIFIED');
      } else {
        this.error.set('Nie udało się opublikować ogłoszenia.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  private geolocate(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve({ lat: 52.2297, lng: 21.0122 }); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 52.2297, lng: 21.0122 }),
        { timeout: 5000 }
      );
    });
  }
}
