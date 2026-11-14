import { Component, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const N = 8;
const COLORS = ['', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
const GAME_SECONDS = 60;

/** PURRE Match-3 — anti-cheat: PURRE_MATCH3 max 100000, min 20 s (serwer). */
@Component({
  selector: 'purre-game-match3',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">💎 PURRE Match-3</h3>
      <span class="purre-badge">{{ score() }} · ⏱ {{ timeLeft() }}s</span>
    </div>
    <div class="grid gap-[2px] mx-auto select-none" [style.gridTemplateColumns]="'repeat(' + N + ', 1fr)'" [style.maxWidth]="'320px'">
      @for (cell of grid(); track $index) {
        <button class="aspect-square rounded-md"
                [style.background]="COLORS[cell] || 'rgba(255,255,255,0.05)'"
                [style.outline]="selected() === $index ? '2px solid var(--accent)' : 'none'"
                (click)="tap($index)"></button>
      }
    </div>
    @if (!running() && !over()) {
      <p class="text-xs purre-muted text-center mt-2">Zamieniaj sąsiednie klejnoty — 3 w rzędzie znika.</p>
      <button class="purre-btn w-full mt-2" (click)="start()">▶️ Start ({{ GAME_SECONDS }} s)</button>
    }
    @if (over()) {
      <p class="text-center mt-2 purre-badge">Koniec gry — {{ msg() }}</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameMatch3Component implements OnDestroy {
  readonly N = N; readonly COLORS = COLORS; readonly GAME_SECONDS = GAME_SECONDS;
  readonly grid = signal<number[]>([]);
  readonly selected = signal<number | null>(null);
  readonly score = signal(0);
  readonly timeLeft = signal(GAME_SECONDS);
  readonly running = signal(false);
  readonly over = signal(false);
  readonly msg = signal('');

  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  start(): void {
    let g: number[];
    do {
      g = Array.from({ length: N * N }, () => 1 + Math.floor(Math.random() * 5));
    } while (this.findMatches(g).size > 0);
    this.grid.set(g);
    this.selected.set(null);
    this.score.set(0);
    this.timeLeft.set(GAME_SECONDS);
    this.over.set(false);
    this.running.set(true);
    this.startedAt = Date.now();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const t = this.timeLeft() - 1;
      this.timeLeft.set(t);
      if (t <= 0) this.finish();
    }, 1000);
  }

  tap(i: number): void {
    if (!this.running()) return;
    const sel = this.selected();
    if (sel === null) { this.selected.set(i); return; }
    if (sel === i) { this.selected.set(null); return; }
    const adjacent = Math.abs(sel % N - i % N) + Math.abs(Math.floor(sel / N) - Math.floor(i / N)) === 1;
    this.selected.set(null);
    if (!adjacent) { this.selected.set(i); return; }
    const g = [...this.grid()];
    [g[sel], g[i]] = [g[i], g[sel]];
    const matches = this.findMatches(g);
    if (matches.size === 0) { this.grid.set(g); return; } // brak trafienia — zostaje zamiana? nie: cofamy
    this.grid.set([...this.grid()].map((v, idx) => idx === sel || idx === i ? v : v));
    this.resolve(g, matches);
  }

  private findMatches(g: number[]): Set<number> {
    const out = new Set<number>();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N - 2; x++) {
        const c = g[y * N + x];
        if (c && g[y * N + x + 1] === c && g[y * N + x + 2] === c) {
          out.add(y * N + x); out.add(y * N + x + 1); out.add(y * N + x + 2);
        }
      }
    }
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N - 2; y++) {
        const c = g[y * N + x];
        if (c && g[(y + 1) * N + x] === c && g[(y + 2) * N + x] === c) {
          out.add(y * N + x); out.add((y + 1) * N + x); out.add((y + 2) * N + x);
        }
      }
    }
    return out;
  }

  private resolve(g: number[], matches: Set<number>): void {
    let chain = 0;
    let current = g;
    let currentMatches = matches;
    while (currentMatches.size > 0) {
      chain++;
      for (const i of currentMatches) current[i] = 0;
      this.score.update(s => s + currentMatches.size * 50 * chain);
      // grawitacja
      for (let x = 0; x < N; x++) {
        const col: number[] = [];
        for (let y = N - 1; y >= 0; y--) if (current[y * N + x] !== 0) col.push(current[y * N + x]);
        for (let y = N - 1; y >= 0; y--) {
          current[y * N + x] = col[N - 1 - y] ?? (1 + Math.floor(Math.random() * 5));
        }
      }
      currentMatches = this.findMatches(current);
    }
    this.grid.set(current);
  }

  private finish(): void {
    this.running.set(false);
    this.over.set(true);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const seconds = Math.max(20, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_MATCH3', score: Math.min(100000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('nie udało się zapisać wyniku.')
      });
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
}