import { Component, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const N = 8, ROWS = 8;
const COLORS = ['', '#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

/** PURRE Bubble (strzelanie bąbelkami) — anti-cheat: PURRE_BUBBLE max 100000, min 15 s (serwer). */
@Component({
  selector: 'purre-game-bubble',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🫧 PURRE Bubble</h3>
      <span class="purre-badge">{{ score() }}</span>
    </div>
    <div class="grid gap-[2px] mx-auto" [style.gridTemplateColumns]="'repeat(' + N + ', 1fr)'" [style.maxWidth]="'300px'">
      @for (cell of view(); track $index) {
        <div class="aspect-square rounded-full" [style.background]="COLORS[cell] || 'rgba(255,255,255,0.06)'"></div>
      }
    </div>
    <p class="text-xs purre-muted text-center mt-1">Kąt: {{ angle() }}° · amunicja: {{ COLORS[ammo()] }}</p>
    <div class="grid grid-cols-3 gap-1 mt-2 max-w-[220px] mx-auto">
      <button class="purre-btn py-1" (click)="aim(-5)">↺</button>
      <button class="purre-btn py-1" (click)="shoot()">⬆️ Strzał</button>
      <button class="purre-btn py-1" (click)="aim(5)">↻</button>
    </div>
    @if (!running() && !over()) { <button class="purre-btn w-full mt-2" (click)="start()">▶️ Start</button> }
    @if (over()) {
      <p class="text-center mt-2 purre-badge">Koniec gry — {{ msg() }}</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameBubbleComponent implements OnDestroy {
  readonly N = N; readonly COLORS = COLORS;
  readonly view = signal<number[]>(Array(N * ROWS).fill(0));
  readonly score = signal(0);
  readonly angle = signal(90);
  readonly ammo = signal(1);
  readonly running = signal(false);
  readonly over = signal(false);
  readonly msg = signal('');

  private grid: number[] = [];
  private shots = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  start(): void {
    this.grid = Array(N * ROWS).fill(0);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < N; x++) this.grid[y * N + x] = 1 + Math.floor(Math.random() * 4);
    }
    this.shots = 0;
    this.score.set(0);
    this.ammo.set(1 + Math.floor(Math.random() * 4));
    this.angle.set(90);
    this.over.set(false);
    this.running.set(true);
    this.startedAt = Date.now();
    this.render();
  }

  aim(d: number): void {
    if (!this.running()) return;
    this.angle.update(a => Math.max(20, Math.min(160, a + d)));
  }

  shoot(): void {
    if (!this.running()) { if (!this.over()) this.start(); return; }
    const rad = this.angle() * Math.PI / 180;
    let x = (N - 1) / 2, y = ROWS - 0.5;
    let vx = Math.cos(rad) * 0.3, vy = -Math.abs(Math.sin(rad)) * 0.3;
    const step = () => {
      x += vx; y += vy;
      if (x < 0.2 || x > N - 1.2) vx = -vx;
      if (y <= 0.5) { this.land(Math.round(x), 0); return; }
      const cx = Math.round(x), cy = Math.round(y);
      if (cy < ROWS && cx >= 0 && cx < N && this.grid[cy * N + cx] !== 0) {
        // ląduj pod zderzonym bąbelkiem
        this.land(cx, Math.min(ROWS - 1, cy + 1));
        return;
      }
      if (y > ROWS) { this.gameOver(); return; }
      this.timer = setTimeout(step, 16);
    };
    step();
  }

  private land(cx: number, cy: number): void {
    if (cy >= ROWS) { this.gameOver(); return; }
    this.grid[cy * N + cx] = this.ammo();
    this.popFrom(cx, cy);
    this.shots++;
    this.ammo.set(1 + Math.floor(Math.random() * 4));
    if (this.shots % 6 === 0) this.addRow();
    if (this.grid.slice((ROWS - 1) * N).some(c => c !== 0)) { this.gameOver(); return; }
    this.render();
  }

  private popFrom(cx: number, cy: number): void {
    const color = this.grid[cy * N + cx];
    if (!color) return;
    const seen = new Set<number>([cy * N + cx]);
    const stack = [[cx, cy]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, -1], [1, 1], [-1, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= N || ny < 0 || ny >= ROWS) continue;
        const idx = ny * N + nx;
        if (!seen.has(idx) && this.grid[idx] === color) { seen.add(idx); stack.push([nx, ny]); }
      }
    }
    if (seen.size >= 3) {
      for (const idx of seen) this.grid[idx] = 0;
      this.score.update(s => s + seen.size * 100);
    }
  }

  private addRow(): void {
    for (let y = ROWS - 1; y > 0; y--) {
      for (let x = 0; x < N; x++) this.grid[y * N + x] = this.grid[(y - 1) * N + x];
    }
    for (let x = 0; x < N; x++) this.grid[x] = 1 + Math.floor(Math.random() * 4);
  }

  private render(): void { this.view.set([...this.grid]); }

  private gameOver(): void {
    this.running.set(false);
    this.over.set(true);
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const seconds = Math.max(15, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_BUBBLE', score: Math.min(100000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }

  ngOnDestroy(): void { if (this.timer) clearTimeout(this.timer); }
}