import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const N = 4;

/** PURRE Puzzle (przesuwane kafelki) — anti-cheat: PURRE_PUZZLE max 10000, min 20 s (serwer). */
@Component({
  selector: 'purre-game-puzzle',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🖼️ PURRE Puzzle</h3>
      <span class="purre-badge">Ruchy: {{ moves() }}</span>
    </div>
    <div class="grid gap-1 mx-auto select-none" [style.gridTemplateColumns]="'repeat(' + N + ', 1fr)'" [style.maxWidth]="'300px'">
      @for (tile of tiles(); track $index) {
        <button class="aspect-square rounded-lg font-bold text-lg flex items-center justify-center"
                [style.background]="tile === 0 ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--accent-2))'"
                [style.color]="tile === 0 ? 'transparent' : 'white'"
                (click)="tap($index)">{{ tile === 0 ? '·' : tile }}</button>
      }
    </div>
    @if (solved()) {
      <p class="text-center mt-2 purre-badge">Ułożone! {{ msg() }}</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔁 Jeszcze raz</button>
    } @else {
      <p class="text-xs purre-muted text-center mt-2">Ułóż kafelki 1–15. Klikaj kafelki obok dziury.</p>
      <button class="purre-btn w-full mt-2" (click)="start()">🔀 Mieszaj / start</button>
    }
  </div>
  `
})
export class GamePuzzleComponent {
  readonly N = N;
  readonly tiles = signal<number[]>([]);
  readonly moves = signal(0);
  readonly solved = signal(false);
  readonly msg = signal('');
  private startedAt = 0;

  constructor(private api: ApiService) { this.start(); }

  start(): void {
    // tasowanie poprawnymi ruchami — zawsze rozwiązywalne
    const t = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N));
    let empty = N * N - 1;
    for (let k = 0; k < 300; k++) {
      const candidates = [empty - 1, empty + 1, empty - N, empty + N].filter(i =>
        i >= 0 && i < N * N &&
        (Math.floor(i / N) === Math.floor(empty / N) || i % N === empty % N));
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      [t[empty], t[pick]] = [t[pick], t[empty]];
      empty = pick;
    }
    this.tiles.set(t);
    this.moves.set(0);
    this.solved.set(false);
    this.msg.set('');
    this.startedAt = 0;
  }

  tap(i: number): void {
    if (this.solved()) return;
    const t = [...this.tiles()];
    const empty = t.indexOf(0);
    const sameRow = Math.floor(i / N) === Math.floor(empty / N);
    const sameCol = i % N === empty % N;
    const adjacent = (sameRow && Math.abs(i - empty) === 1) || (sameCol && Math.abs(i - empty) === N);
    if (!adjacent) return;
    if (!this.startedAt) this.startedAt = Date.now();
    [t[i], t[empty]] = [t[empty], t[i]];
    this.tiles.set(t);
    this.moves.update(m => m + 1);
    if (this.isSolved(t)) this.finish();
  }

  private isSolved(t: number[]): boolean {
    for (let i = 0; i < N * N - 1; i++) if (t[i] !== i + 1) return false;
    return t[N * N - 1] === 0;
  }

  private finish(): void {
    this.solved.set(true);
    const seconds = Math.max(20, Math.round((Date.now() - this.startedAt) / 1000));
    const score = Math.max(0, 10000 - this.moves() * 20 - seconds * 10);
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_PUZZLE', score, durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }
}