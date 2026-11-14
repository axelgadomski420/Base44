import { Component, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, ApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { SoundLibraryService } from '../../core/sounds';
import { PURRE_FILTERS, filterCss } from '../../core/media-filters';

interface UploadedMedia { url: string; mediaType: 'IMAGE' | 'VIDEO'; }

/** 0.5.0 Reels Studio: dźwięki (PURRE Sounds), filtry CSS i edycja wideo jak TikTok. */
@Component({
  selector: 'purre-create-post',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">✨ Nowy post</h1>

    <section class="flex gap-2">
      <button class="purre-badge" [style.outline]="postType === 'POST' ? '2px solid var(--accent)' : 'none'"
              (click)="postType = 'POST'">📝 Post — dla każdego</button>
      <button class="purre-badge" [style.outline]="postType === 'REEL' ? '2px solid var(--accent)' : 'none'"
              (click)="postType = 'REEL'">🎬 Reels — PRO/ULTIMATE/PREMIUM</button>
    </section>

    <form (ngSubmit)="submit()" class="purre-card p-5 space-y-3">
      <textarea class="purre-input" rows="4" maxlength="2000" [(ngModel)]="caption" name="caption"
                placeholder="Co słychać w Twojej hodowli?"></textarea>

      <div class="purre-card p-4">
        <p class="text-sm font-semibold">Zdjęcia / wideo (max 4)</p>
        <input class="mt-2 text-sm" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
               (change)="onFiles($event)">
        <div class="flex flex-wrap gap-2 mt-3">
          @for (m of media(); track $index) {
            <div class="relative">
              @if (m.mediaType === 'VIDEO') {
                <video [src]="m.url" class="h-16 w-16 object-cover rounded-lg"></video>
              } @else {
                <img [src]="m.url" [style.filter]="filterCss(filterId())" class="h-16 w-16 object-cover rounded-lg" alt="">
              }
              <button type="button" (click)="removeAt($index)"
                class="absolute -top-1 -right-1 text-xs px-1.5 rounded-full" style="background: var(--danger); color: #fff;">×</button>
            </div>
          }
        </div>
        @if (uploading()) { <p class="text-xs purre-muted mt-2">Upload {{ progress() }}/{{ total() }}…</p> }
        <a routerLink="/video-editor" class="purre-badge mt-3 inline-block">✂️ Edytuj wideo — trim, muzyka, tempo</a>
      </div>

      @if (postType === 'REEL') {
        <div class="purre-card p-4">
          <p class="text-sm font-semibold">🎵 Dźwięk (PURRE Sounds)</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <button type="button" class="purre-badge" [style.outline]="!soundId() ? '2px solid var(--accent)' : 'none'"
                    (click)="pickSound('')">🔇 Bez dźwięku</button>
            @for (t of lib.tracks; track t.id) {
              <button type="button" class="purre-badge" [style.outline]="soundId() === t.id ? '2px solid var(--accent)' : 'none'"
                      (click)="pickSound(t.id)">{{ t.emoji }} {{ t.name }} ▶</button>
            }
          </div>
          <p class="text-xs purre-muted mt-2">Dotknij, aby usłyszeć podgląd (2 s). Dźwięk zagra w feedzie po dotknięciu 🔊.</p>
        </div>

        <div class="purre-card p-4">
          <p class="text-sm font-semibold">🎨 Filtr</p>
          <div class="flex flex-wrap gap-2 mt-2">
            @for (f of filters; track f.id) {
              <button type="button" class="purre-badge" [style.outline]="filterId() === f.id ? '2px solid var(--accent)' : 'none'"
                      (click)="filterId.set(f.id)">{{ f.name }}</button>
            }
          </div>
        </div>
      }

      @if (error()) { <p class="purre-error">{{ error() }}</p> }
      <button class="purre-btn w-full" [disabled]="busy() || uploading()">
        {{ postType === 'REEL' ? '🎬 Opublikuj Reels' : '📝 Opublikuj post' }}
      </button>
    </form>
  </div>
  `
})
export class CreatePostPage implements OnDestroy {
  postType = 'POST';
  caption = '';
  readonly filters = PURRE_FILTERS;
  readonly media = signal<UploadedMedia[]>([]);
  readonly soundId = signal<string>('');
  readonly filterId = signal<string>('NONE');
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly total = signal(0);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly filterCss = filterCss;

  constructor(private api: ApiService, private router: Router, readonly auth: AuthService, readonly lib: SoundLibraryService) {}

  pickSound(id: string): void {
    this.soundId.set(id);
    if (id) this.lib.preview(id);
  }

  ngOnDestroy(): void { this.lib.stop(); }

  removeAt(index: number): void {
    this.media.update(list => list.filter((_, i) => i !== index));
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    const combined = this.media().length + files.length;
    if (combined > 4) { this.error.set('Maksymalnie 4 pliki na post.'); return; }
    this.uploading.set(true); this.total.set(files.length); this.progress.set(0); this.error.set('');
    (async () => {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { this.error.set('Plik ' + file.name + ' przekracza 10 MB.'); continue; }
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await new Promise<UploadedMedia>((resolve, reject) => {
            this.api.postMultipart<UploadedMedia>('/media/upload', fd).subscribe({ next: resolve, error: reject });
          });
          this.media.update(list => [...list, res]);
        } catch (e) {
          this.error.set(e instanceof ApiError ? e.message : 'Błąd uploadu.');
        }
        this.progress.update(p => p + 1);
      }
      this.uploading.set(false);
    })();
  }

  submit(): void {
    if (!this.caption.trim()) { this.error.set('Dodaj opis posta.'); return; }
    this.busy.set(true); this.error.set('');
    this.api.post('/posts', {
      caption: this.caption.trim(),
      postType: this.postType,
      media: this.media().map(m => ({ url: m.url, mediaType: m.mediaType })),
      soundId: this.soundId() || null,
      filterId: this.filterId() === 'NONE' ? null : this.filterId()
    }).subscribe({
      next: () => { this.lib.stop(); this.router.navigate(['/posts']); },
      error: (e) => {
        this.busy.set(false);
        if (e instanceof ApiError && (e.code === 'PAYWALL_REQUIRED' || e.status === 403)) {
          this.router.navigate(['/paywall']);
          return;
        }
        this.error.set(e instanceof ApiError ? e.message : 'Nie udało się opublikować.');
      }
    });
  }
}
