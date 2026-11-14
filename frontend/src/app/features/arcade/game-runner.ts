import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const W = 18, H = 8;

/** PURRE Runner — anti-cheat: PURRE_RUNNER max 100000, min 15 s (serwer). */
@Component({
  selector: 'purre-game-runner',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🏃 PURRE Runner</h3>
      <span class="purre-badge">{{ score() }} m</span>
    </div>
    <div class="grid gap-[1px] mx-auto cursor-pointer select-none" (click)="jump()"
         [style.gridTemplateColumns]="'repeat(' + W + ', 1fr)'" [style.maxWidth]="'360px'">
      @for (cell of view(); track $index) {
        <div class="aspect-square rounded-[2px]"
             [style.background]="cell === 1 ? 'var(--accent-2)' : cell === 2 ? '#EF4444' : cell === 3 ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'"></div>
      }
    </div>
    @if (!running() && !over()) { <button class="purre-btn w-full mt-3" (click)="start()">▶️ Start (tap lub ↑)</button> }
    @if (over()) {
      <p class="text-center mt-2 purre-badge">Koniec gry — {{ msg() }}</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameRunnerComponent implements OnDestroy {
  readonly W = W; readonly H = H;
  readonly view = signal<number[]>(Array(W * H).fill(0));
  readonly score = signal(0);
  readonly running = signal(false);
  readonly over = signal(false);
  readonly msg = signal('');

  private py = 0;          // wysokość nad ziemią (0 = ziemia)
  private vy = 0;
  private obstacles: number[] = []; // kolumny przeszkód
  private distance = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  start(): void {
    this.py = 0; this.vy = 0; this.obstacles = []; this.distance = 0;
    this.score.set(0); this.over.set(false); this.running.set(true);
    this.startedAt = Date.now();
    this.render();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 50);
  }

  jump(): void {
    if (!this.running()) { if (!this.over()) this.start(); return; }
    if (this.py === 0) this.vy = 1.6;
  }

  private tick(): void {
    this.distance += 0.12;
    this.score.set(Math.floor(this.distance * 10));
    if (this.py > 0 || this.vy > 0) {
      this.vy -= 0.12;
      this.py = Math.max(0, this.py + this.vy);
      if (this.py === 0) this.vy = 0;
    }
    // spawn przeszkód
    if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length - 1] < W - 4 - Math.random() * 4) {
      this.obstacles.push(W);
    }
    this.obstacles = this.obstacles.map(o => o - 0.22).filter(o => o > -1);
    // kolizja: pies w kolumnie 2, wysokość py
    for (const o of this.obstacles) {
      if (Math.abs(o - 2) < 0.5 && this.py < 1) { this.gameOver(); return; }
    }
    this.render();
  }

  private render(): void {
    const v = Array(W * H).fill(0);
    for (const o of this.obstacles) {
      const col = Math.round(o);
      if (col >= 0 && col < W) v[(H - 2) * W + col] = 2;
    }
    const birdRow = H - 2 - Math.round(this.py);
    v[birdRow * W + 2] = 1;
    for (let col = 0; col < W; col++) v[(H - 1) * W + col] = 3;
    this.view.set(v);
  }

  private gameOver(): void {
    this.running.set(false);
    this.over.set(true);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const seconds = Math.max(15, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_RUNNER', score: Math.min(100000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('nie udało się zapisać wyniku.')
      });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); this.jump(); }
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
}