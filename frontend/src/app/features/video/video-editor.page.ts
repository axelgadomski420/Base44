import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ApiError } from '../../core/api.service';

/** Edytor wideo (faza 4): przycinanie, wyciszanie, tempo, podkład muzyczny (FFmpeg po stronie serwera). */
@Component({
  selector: 'purre-video-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">🎬 Edytor wideo</h1>
    <p class="purre-muted text-sm">Przytnij, wycisz, zmień tempo lub dodaj podkład muzyczny. Wynik: MP4 gotowy do HoloFeed.</p>

    <section class="purre-card p-5 space-y-3">
      <h2 class="font-bold">1. Wybierz wideo</h2>
      <label class="block text-sm">Plik (MP4/WEBM, maks. 10 MB)
        <input type="file" accept="video/mp4,video/webm" class="purre-input mt-1" (change)="onVideoPick($event)">
      </label>
      <label class="block text-sm">…lub adres już wgranego wideo (/api/media/…)
        <input class="purre-input mt-1" [(ngModel)]="videoUrl" name="videoUrl" placeholder="/api/media/2026/11/plik.mp4">
      </label>
      @if (videoUrl()) {
        <video [src]="videoUrl()" controls class="w-full rounded-xl max-h-72" #player></video>
      }
    </section>

    @if (videoUrl()) {
      <section class="purre-card p-5 space-y-3">
        <h2 class="font-bold">2. Montaż</h2>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-sm">Trim — start (s)
            <input class="purre-input mt-1" type="number" min="0" step="0.1" [(ngModel)]="trimStart" name="trimStart">
          </label>
          <label class="block text-sm">Trim — koniec (s, puste = do końca)
            <input class="purre-input mt-1" type="number" min="0" step="0.1" [(ngModel)]="trimEnd" name="trimEnd">
          </label>
        </div>
        <div class="flex gap-2">
          <button class="purre-badge" (click)="useCurrent(player, 'start')">Start = tu</button>
          <button class="purre-badge" (click)="useCurrent(player, 'end')">Koniec = tu</button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="block text-sm">Tempo (0.5–2)
            <select class="purre-input mt-1" [(ngModel)]="speed" name="speed">
              <option value="0.5">0.5× — zwolnij</option>
              <option value="1">1× — normalne</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2× — przyspiesz</option>
            </select>
          </label>
          <label class="block text-sm">Głośność wideo (0–1)
            <input class="purre-input mt-1" type="number" min="0" max="1" step="0.1" [(ngModel)]="videoVolume" name="videoVolume">
          </label>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" [(ngModel)]="mute" name="mute"> 🔇 Wycisz wideo
        </label>
        <label class="block text-sm">🎵 Podkład muzyczny (MP3/WAV/M4A/OGG)
          <input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg" class="purre-input mt-1" (change)="onMusicPick($event)">
        </label>
        @if (musicFile()) {
          <label class="block text-sm">Głośność podkładu (0–1)
            <input class="purre-input mt-1" type="number" min="0" max="1" step="0.1" [(ngModel)]="musicVolume" name="musicVolume">
          </label>
        }
      </section>

      <section class="purre-card p-5 space-y-3">
        <h2 class="font-bold">3. Renderuj</h2>
        <button class="purre-btn w-full" [disabled]="rendering()" (click)="render()">
          {{ rendering() ? '⏳ Renderowanie (do 2 min)…' : '✂️ Renderuj wideo' }}
        </button>
        @if (msg()) { <p class="text-sm" style="color: var(--accent-2)">{{ msg() }}</p> }
        @if (resultUrl()) {
          <video [src]="resultUrl()" controls class="w-full rounded-xl max-h-72"></video>
          <p class="text-sm purre-muted break-all">Adres wyniku: {{ resultUrl() }}</p>
          <button class="purre-btn w-full" (click)="copy()">📋 Skopiuj adres wyniku</button>
        }
      </section>
    }
  </div>
  `
})
export class VideoEditorPage {
  readonly videoUrl = signal('');
  readonly musicFile = signal<File | null>(null);
  readonly resultUrl = signal('');
  readonly rendering = signal(false);
  readonly msg = signal('');

  trimStart = 0;
  trimEnd: number | null = null;
  speed = '1';
  videoVolume = 1;
  musicVolume = 0.5;
  mute = false;

  constructor(private api: ApiService) {}

  onVideoPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { this.msg.set('Wideo: maksymalnie 10 MB.'); return; }
    this.msg.set('Wgrywam wideo…');
    const fd = new FormData();
    fd.append('file', file);
    this.api.postMultipart<{ url: string }>('/media/upload', fd).subscribe({
      next: (res) => { this.videoUrl.set(res.url); this.msg.set('✅ Wideo wgrane.'); },
      error: (e) => this.msg.set(e instanceof ApiError ? e.message : 'Nie udało się wgrać wideo.')
    });
  }

  onMusicPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) { this.msg.set('Audio: maksymalnie 10 MB.'); return; }
    this.musicFile.set(file);
  }

  useCurrent(player: HTMLVideoElement, which: 'start' | 'end'): void {
    const t = Math.round(player.currentTime * 10) / 10;
    if (which === 'start') this.trimStart = t; else this.trimEnd = t;
  }

  render(): void {
    if (this.mute && this.musicFile()) {
      this.msg.set('Wybierz jedno: wyciszenie albo podkład muzyczny.');
      return;
    }
    this.rendering.set(true);
    this.msg.set('');
    this.resultUrl.set('');
    const fd = new FormData();
    fd.append('url', this.videoUrl());
    fd.append('trimStart', String(this.trimStart || 0));
    if (this.trimEnd != null && this.trimEnd > 0) fd.append('trimEnd', String(this.trimEnd));
    fd.append('mute', String(this.mute));
    fd.append('speed', this.speed);
    fd.append('videoVolume', String(this.videoVolume));
    fd.append('musicVolume', String(this.musicVolume));
    if (this.musicFile()) fd.append('music', this.musicFile()!);
    this.api.postMultipart<{ url: string }>('/media/video-edit', fd).subscribe({
      next: (res) => {
        this.resultUrl.set(res.url);
        this.rendering.set(false);
        this.msg.set('✅ Gotowe! Skopiuj adres i wklej w ogłoszeniu (zakładka Wideo).');
      },
      error: (e) => {
        this.rendering.set(false);
        this.msg.set(e instanceof ApiError ? e.message : 'Nie udało się wyrenderować wideo.');
      }
    });
  }

  copy(): void {
    navigator.clipboard?.writeText(this.resultUrl()).catch(() => undefined);
    this.msg.set('Skopiowano adres do schowka.');
  }
}