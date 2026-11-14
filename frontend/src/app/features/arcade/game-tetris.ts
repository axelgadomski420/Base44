import { Component, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const W = 10, H = 20;
const SHAPES: number[][][] = [
  [[0, 0], [1, 0], [0, 1], [1, 1]],            // O
  [[0, 0], [1, 0], [2, 0], [3, 0]],            // I
  [[1, 0], [0, 1], [1, 1], [2, 1]],            // T
  [[0, 0], [1, 0], [1, 1], [2, 1]],            // Z
  [[1, 0], [2, 0], [0, 1], [1, 1]],            // S
  [[0, 0], [0, 1], [1, 1], [2, 1]],            // J
  [[2, 0], [0, 1], [1, 1], [2, 1]]             // L
];
const COLORS = ['', 'var(--accent-2)', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444'];

/** PURRE Tetris — anti-cheat: PURRE_TETRIS max 300000, min 30 s (serwer). */
@Component({
  selector: 'purre-game-tetris',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🧱 PURRE Tetris</h3>
      <span class="purre-badge">Linie: {{ lines() }} · {{ score() }}</span>
    </div>
    <div class="grid gap-[1px] mx-auto" [style.gridTemplateColumns]="'repeat(' + W + ', 1fr)'" [style.maxWidth]="'260px'">
      @for (cell of view(); track $index) {
        <div class="aspect-square rounded-[2px]" [style.background]="COLORS[cell] || 'rgba(255,255,255,0.05)'"></div>
      }
    </div>
    @if (!running() && !over()) { <button class="purre-btn w-full mt-3" (click)="start()">▶️ Start</button> }
    @if (over()) {
      <p class="text-center mt-2 purre-badge">Koniec gry — {{ msg() }}</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔁 Jeszcze raz</button>
    }
    <div class="grid grid-cols-4 gap-1 mt-3 max-w-[220px] mx-auto">
      <button class="purre-btn py-1" (click)="move(-1)">←</button>
      <button class="purre-btn py-1" (click)="rotate()">⟳</button>
      <button class="purre-btn py-1" (click)="move(1)">→</button>
      <button class="purre-btn py-1" (click)="hardDrop()">⤓</button>
    </div>
    <p class="text-xs purre-muted text-center mt-2">Sterowanie: strzałki (← → ↓), ↑ obrót, spacja zrzut.</p>
  </div>
  `
})
export class GameTetrisComponent implements OnDestroy {
  readonly W = W; readonly H = H; readonly COLORS = COLORS;
  readonly view = signal<number[]>(Array(W * H).fill(0));
  readonly score = signal(0);
  readonly lines = signal(0);
  readonly running = signal(false);
  readonly over = signal(false);
  readonly msg = signal('');

  private board: number[] = Array(W * H).fill(0);
  private cur: { cells: [number, number][]; x: number; y: number; color: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  start(): void {
    this.board = Array(W * H).fill(0);
    this.score.set(0); this.lines.set(0);
    this.over.set(false); this.running.set(true);
    this.startedAt = Date.now();
    this.spawn();
    this.render();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.step(), 450);
  }

  private spawn(): void {
    const idx = Math.floor(Math.random() * SHAPES.length);
    this.cur = { cells: SHAPES[idx].map(c => [c[0], c[1]] as [number, number]), x: 3, y: 0, color: idx + 1 };
    if (this.collide(this.cur.cells, this.cur.x, this.cur.y)) { this.gameOver(); }
  }

  private collide(cells: [number, number][], px: number, py: number): boolean {
    return cells.some(([cx, cy]) => {
      const x = px + cx, y = py + cy;
      return x < 0 || x >= W || y >= H || (y >= 0 && this.board[y * W + x] !== 0);
    });
  }

  step(): void {
    if (!this.cur || this.over()) return;
    if (!this.collide(this.cur.cells, this.cur.x, this.cur.y + 1)) { this.cur.y++; }
    else { this.lock(); }
    this.render();
  }

  move(dx: number): void {
    if (!this.cur || this.over()) return;
    if (!this.collide(this.cur.cells, this.cur.x + dx, this.cur.y)) this.cur.x += dx;
    this.render();
  }

  rotate(): void {
    if (!this.cur || this.over()) return;
    const maxX = Math.max(...this.cur.cells.map(c => c[0]));
    const maxY = Math.max(...this.cur.cells.map(c => c[1]));
    const rotated = this.cur.cells.map(([x, y]) => [maxY - y, x] as [number, number]);
    if (!this.collide(rotated, this.cur.x, this.cur.y)) this.cur.cells = rotated;
    this.render();
  }

  hardDrop(): void {
    if (!this.cur || this.over()) return;
    while (!this.collide(this.cur.cells, this.cur.x, this.cur.y + 1)) { this.cur.y++; this.score.update(s => s + 2); }
    this.lock();
    this.render();
  }

  private lock(): void {
    if (!this.cur) return;
    for (const [cx, cy] of this.cur.cells) {
      const y = this.cur.y + cy;
      if (y >= 0) this.board[y * W + this.cur.x + cx] = this.cur.color;
    }
    let cleared = 0;
    for (let y = H - 1; y >= 0; y--) {
      if (this.board.slice(y * W, y * W + W).every(c => c !== 0)) {
        this.board.splice(y * W, W);
        this.board.unshift(...Array(W).fill(0));
        cleared++;
        y++;
      }
    }
    if (cleared) {
      this.lines.update(l => l + cleared);
      this.score.update(s => s + cleared * 150);
    }
    this.spawn();
  }

  private render(): void {
    const v = [...this.board];
    if (this.cur) for (const [cx, cy] of this.cur.cells) {
      const y = this.cur.y + cy;
      if (y >= 0) v[y * W + this.cur.x + cx] = this.cur.color;
    }
    this.view.set(v);
  }

  private gameOver(): void {
    this.running.set(false);
    this.over.set(true);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const seconds = Math.max(30, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_TETRIS', score: Math.min(300000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('nie udało się zapisać wyniku.')
      });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.running()) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => this.move(-1), ArrowRight: () => this.move(1),
      ArrowDown: () => this.step(), ArrowUp: () => this.rotate(), ' ': () => this.hardDrop()
    };
    const fn = map[e.key];
    if (fn) { e.preventDefault(); fn(); }
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
}

import { HostListener } from '@angular/core';