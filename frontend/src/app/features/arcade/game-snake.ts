import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const SIZE = 15;

/** PURRE Snake — anti-cheat: PURRE_SNAKE max 20000, min 15 s (serwer). */
@Component({
  selector: 'purre-game-snake',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🐍 PURRE Snake</h3>
      <span class="purre-badge">Wynik: {{ score() }}</span>
    </div>
    <div class="grid gap-[2px] mx-auto" [style.gridTemplateColumns]="'repeat(' + size + ', 1fr)'" [style.maxWidth]="'330px'">
      @for (cell of view(); track $index) {
        <div class="aspect-square"
             [style.background]="cell === 1 ? 'var(--accent-2)' : cell === 2 ? '#F59E0B' : 'rgba(255,255,255,0.05)'"
             [style.borderRadius]="cell ? '4px' : '0'"></div>
      }
    </div>
    @if (!running() && !over()) { <button class="purre-btn w-full mt-3" (click)="start()">▶️ Start</button> }
    @if (over()) {
      <p class="text-center mt-2 purre-badge">Koniec gry — wynik zapisany!</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔁 Jeszcze raz</button>
    }
    <div class="grid grid-cols-3 gap-1 mt-3 max-w-[140px] mx-auto">
      <span></span><button class="purre-btn py-1" (click)="setDir(0, -1)">↑</button><span></span>
      <button class="purre-btn py-1" (click)="setDir(-1, 0)">←</button>
      <button class="purre-btn py-1" (click)="setDir(0, 1)">↓</button>
      <button class="purre-btn py-1" (click)="setDir(1, 0)">→</button>
    </div>
    <p class="text-xs purre-muted text-center mt-2">Sterowanie: strzałki lub WASD.</p>
  </div>
  `
})
export class GameSnakeComponent implements OnDestroy {
  readonly size = SIZE;
  readonly view = signal<number[]>(Array(SIZE * SIZE).fill(0));
  readonly score = signal(0);
  readonly running = signal(false);
  readonly over = signal(false);

  private snake: { x: number; y: number }[] = [];
  private dir = { x: 1, y: 0 };
  private queuedDir = { x: 1, y: 0 };
  private food = { x: 10, y: 7 };
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const map: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
    };
    const d = map[e.key];
    if (d) { e.preventDefault(); this.setDir(d[0], d[1]); }
  }

  setDir(x: number, y: number): void {
    if (this.dir.x === -x && this.dir.y === -y) return; // zawrócenie o 180 stopni
    this.queuedDir = { x, y };
    if (!this.running() && !this.over()) this.start();
  }

  start(): void {
    this.snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    this.dir = { x: 1, y: 0 };
    this.queuedDir = { x: 1, y: 0 };
    this.score.set(0);
    this.over.set(false);
    this.running.set(true);
    this.startedAt = Date.now();
    this.placeFood();
    this.render();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 150);
  }

  private placeFood(): void {
    let f = { x: 0, y: 0 };
    do {
      f = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    } while (this.snake.some(s => s.x === f.x && s.y === f.y));
    this.food = f;
  }

  private tick(): void {
    this.dir = this.queuedDir;
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.gameOver();
      return;
    }
    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score.update(s => s + 100);
      this.placeFood();
    } else {
      this.snake.pop();
    }
    this.render();
  }

  private render(): void {
    const v = Array(SIZE * SIZE).fill(0);
    for (const s of this.snake) v[s.y * SIZE + s.x] = 1;
    v[this.food.y * SIZE + this.food.x] = 2;
    this.view.set(v);
  }

  private gameOver(): void {
    this.running.set(false);
    this.over.set(true);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const seconds = Math.max(15, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post('/arcade/scores', { game: 'PURRE_SNAKE', score: Math.min(20000, this.score()), durationSeconds: seconds })
      .subscribe({ error: () => undefined });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}