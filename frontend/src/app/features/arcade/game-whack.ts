import { Component, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const GAME_MS = 30000;

/** PURRE Whack — 0.4.0: kret w 3x3, złoty kret +500. anti-cheat: max 30000, min 10 s (serwer). */
@Component({
  selector: 'purre-game-whack',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🔨 PURRE Whack</h3>
      <span class="purre-badge">⏱️ {{ timeLeft() }} s · {{ score() }} pkt</span>
    </div>
    @if (!finished()) {
      <div class="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        @for (cell of cells; track cell) {
          <button class="aspect-square text-3xl rounded-xl transition"
                  style="background: rgba(255,255,255,0.08)"
                  (click)="whack(cell)">
            @if (isGolden(cell)) { ✨🐹 } @else if (isMole(cell)) { 🐹 } @else { 🌱 }
          </button>
        }
      </div>
      <p class="text-xs purre-muted text-center mt-3">Kliknij kreta! ✨🐹 złoty = 500 pkt. Tempo rośnie.</p>
      @if (!started()) { <button class="purre-btn w-full mt-3" (click)="start()">▶️ Start (30 s)</button> }
    } @else {
      <p class="text-center text-lg font-bold mt-2">Koniec — wynik: {{ score() }}</p>
      <p class="text-center text-sm purre-muted">{{ msg() }}</p>
      <button class="purre-btn w-full mt-3" (click)="start()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameWhackComponent implements OnDestroy {
  readonly cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  readonly moles = signal<Set<number>>(new Set());
  readonly score = signal(0);
  readonly timeLeft = signal(30);
  readonly started = signal(false);
  readonly finished = signal(false);
  readonly msg = signal('');
  private golden = new Set<number>();
  private expiries = new Map<number, number>();
  private remaining = 0;
  private nextSpawnIn = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  isMole(cell: number): boolean { return this.moles().has(cell); }
  isGolden(cell: number): boolean { return this.moles().has(cell) && this.golden.has(cell); }

  start(): void {
    if (this.timer) clearInterval(this.timer);
    this.score.set(0); this.timeLeft.set(30);
    this.moles.set(new Set()); this.golden.clear(); this.expiries.clear();
    this.finished.set(false); this.msg.set('');
    this.started.set(true);
    this.remaining = GAME_MS; this.nextSpawnIn = 0;
    this.startedAt = Date.now();
    this.timer = setInterval(() => this.step(), 100);
  }

  private step(): void {
    this.remaining -= 100;
    if (this.remaining <= 0) { this.finish(); return; }
    this.timeLeft.set(Math.ceil(this.remaining / 1000));
    const now = Date.now();
    for (const [cell, exp] of Array.from(this.expiries.entries())) {
      if (exp <= now) {
        this.expiries.delete(cell);
        this.golden.delete(cell);
        this.moles.update(s => { const n = new Set(s); n.delete(cell); return n; });
      }
    }
    this.nextSpawnIn -= 100;
    if (this.nextSpawnIn <= 0) {
      this.spawn();
      const progress = 1 - this.remaining / GAME_MS;
      this.nextSpawnIn = Math.max(400, 1000 - progress * 600);
    }
  }

  private spawn(): void {
    const free = this.cells.filter(c => !this.expiries.has(c));
    if (!free.length) return;
    const cell = free[Math.floor(Math.random() * free.length)];
    const progress = 1 - this.remaining / GAME_MS;
    const visibleFor = Math.max(450, 900 - progress * 450);
    this.expiries.set(cell, Date.now() + visibleFor);
    if (Math.random() < 0.12) this.golden.add(cell);
    this.moles.update(s => { const n = new Set(s); n.add(cell); return n; });
  }

  whack(cell: number): void {
    if (this.finished() || !this.expiries.has(cell)) return;
    const goldenHit = this.golden.has(cell);
    this.expiries.delete(cell);
    this.golden.delete(cell);
    this.moles.update(s => { const n = new Set(s); n.delete(cell); return n; });
    this.score.update(s => Math.min(30000, s + (goldenHit ? 500 : 100)));
  }

  private finish(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.finished.set(true);
    const seconds = Math.max(10, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_WHACK', score: Math.min(30000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
}
