import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const W = 12, H = 16;

/** PURRE Flappy — anti-cheat: PURRE_FLAPPY max 5000, min 10 s (serwer). */
@Component({
  selector: 'purre-game-flappy',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🐦 PURRE Flappy</h3>
      <span class="purre-badge">Wynik: {{ score() }}</span>
    </div>
    <div class="grid gap-[1px] mx-auto cursor-pointer select-none" (click)="flap()"
         [style.gridTemplateColumns]="'repeat(' + W + ', 1fr)'" [style.maxWidth]="'300px'">
      @for (cell of view(); track $index) {
        <div class="aspect-square rounded-[2px]"
             [style.background]="cell === 1 ? '#F59E0B' : cell === 2 ? '#10B981' : 'rgba(255,255,255,0.05)'"></div>
      }
    </div>
    @if (!running() && !over()) { <button class="purre-btn w-full mt-3" (click)="start()">▶️ Start (tap lub spacja)</button> }
    @if (over()) {
      <p class="text-center mt-2 purre-badge">Koniec gry — {{ msg() }}</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameFlappyComponent implements OnDestroy {
  readonly W = W; readonly H = H;
  readonly view = signal<number[]>(Array(W * H).fill(0));
  readonly score = signal(0);
  readonly running = signal(false);
  readonly over = signal(false);
  readonly msg = signal('');

  private y = H / 2;
  private vy = 0;
  private pipes: { x: number; gap: number; passed: boolean }[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  start(): void {
    this.y = H / 2; this.vy = 0; this.pipes = [];
    this.score.set(0); this.over.set(false); this.running.set(true);
    this.startedAt = Date.now();
    this.render();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 45);
  }

  flap(): void {
    if (!this.running()) { if (!this.over()) this.start(); return; }
    this.vy = -1.4;
  }

  private tick(): void {
    this.vy += 0.09;
    this.y += this.vy;
    if (this.y < 0 || this.y > H - 1) { this.gameOver(); return; }
    // rury
    if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < W - 5) {
      this.pipes.push({ x: W, gap: 2 + Math.floor(Math.random() * (H - 6)), passed: false });
    }
    for (const p of this.pipes) {
      p.x -= 0.25;
      if (!p.passed && p.x < 3) { p.passed = true; this.score.update(s => s + 100); }
      // kolizja z rurą w kolumnie x=3 (ptak)
      if (Math.abs(p.x - 3) < 0.6 && (this.y < p.gap - 1.5 || this.y > p.gap + 1.5)) { this.gameOver(); return; }
    }
    this.pipes = this.pipes.filter(p => p.x > -1);
    this.render();
  }

  private render(): void {
    const v = Array(W * H).fill(0);
    for (const p of this.pipes) {
      const col = Math.round(p.x);
      if (col >= 0 && col < W) {
        for (let row = 0; row < H; row++) {
          if (row < p.gap - 2 || row > p.gap + 2) v[row * W + col] = 2;
        }
      }
    }
    v[Math.round(this.y) * W + 3] = 1;
    this.view.set(v);
  }

  private gameOver(): void {
    this.running.set(false);
    this.over.set(true);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const seconds = Math.max(10, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_FLAPPY', score: Math.min(5000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('nie udało się zapisać wyniku.')
      });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.code === 'Space') { e.preventDefault(); this.flap(); }
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
}