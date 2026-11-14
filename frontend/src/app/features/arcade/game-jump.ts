import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const ZONE_START = 45, ZONE_SIZE_START = 12;

/** PURRE Jump — skoki na timing: traf w zieloną strefę. anti-cheat: max 50000, min 10 s (serwer). */
@Component({
  selector: 'purre-game-jump',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🦘 PURRE Jump</h3>
      <span class="purre-badge">Wysokość: {{ level() }} · ❤️ {{ lives() }}</span>
    </div>
    @if (!finished()) {
      <div class="relative h-10 rounded-lg overflow-hidden" style="background: rgba(255,255,255,0.08)">
        <div class="absolute top-0 bottom-0" style="background: #10B981"
             [style.left.%]="zoneStart()" [style.width.%]="zoneSize()"></div>
        <div class="absolute top-0 bottom-0 w-1" style="background: white" [style.left.%]="marker()"></div>
      </div>
      <button class="purre-btn w-full mt-3" (click)="hop()">⬆️ SKOCZ (spacja)</button>
      <p class="text-xs purre-muted text-center mt-2">Zatrzymaj wskaźnik w zielonej strefie. Strefa robi się węższa!</p>
    } @else {
      <p class="text-center text-lg font-bold mt-2">Koniec — wynik: {{ score() }}</p>
      <p class="text-center text-sm purre-muted">{{ msg() }}</p>
      <button class="purre-btn w-full mt-3" (click)="start()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameJumpComponent implements OnDestroy {
  readonly level = signal(0);
  readonly lives = signal(3);
  readonly score = signal(0);
  readonly marker = signal(0);
  readonly zoneStart = signal(ZONE_START);
  readonly zoneSize = signal(ZONE_SIZE_START);
  readonly finished = signal(false);
  readonly msg = signal('');
  private dir = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  start(): void {
    this.level.set(0); this.lives.set(3); this.score.set(0);
    this.zoneStart.set(ZONE_START); this.zoneSize.set(ZONE_SIZE_START);
    this.finished.set(false); this.msg.set('');
    this.startedAt = Date.now();
    this.dir = 1;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.marker.update(m => {
        let next = m + this.dir * 1.6;
        if (next >= 100) { next = 100; this.dir = -1; }
        if (next <= 0) { next = 0; this.dir = 1; }
        return next;
      });
    }, 16);
  }

  hop(): void {
    if (this.finished()) return;
    if (!this.startedAt) this.startedAt = Date.now();
    const m = this.marker();
    const inZone = m >= this.zoneStart() && m <= this.zoneStart() + this.zoneSize();
    if (inZone) {
      this.level.update(l => l + 1);
      this.score.update(s => Math.min(50000, (this.level()) * 1000));
      this.zoneSize.update(z => Math.max(3, z - 0.7));
      this.zoneStart.set(Math.random() * (100 - this.zoneSize()));
    } else {
      this.lives.update(l => l - 1);
      if (this.lives() <= 0) { this.finish(); return; }
    }
  }

  private finish(): void {
    this.finished.set(true);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const seconds = Math.max(10, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_JUMP', score: Math.min(50000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.code === 'Space') { e.preventDefault(); this.hop(); }
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
}