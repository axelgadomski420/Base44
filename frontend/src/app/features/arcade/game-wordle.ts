import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

const WORDS = ['KOTEK', 'BUREK', 'KARMA', 'FUTRO', 'MISKA', 'SMYCZ', 'KOSZK', 'PRZYS'];
const MAX_TRIES = 6;

/** PURRE Wordle — anti-cheat: PURRE_WORDLE max 6, quizLike, min 10 s (serwer). */
@Component({
  selector: 'purre-game-wordle',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🔤 PURRE Wordle</h3>
      <span class="purre-badge">Próba {{ tries().length + 1 }} / {{ MAX_TRIES }}</span>
    </div>
    @if (!finished()) {
      @for (row of tries(); track $index) {
        <div class="flex gap-1 justify-center mb-1">
          @for (l of row.letters; track $index) {
            <span class="w-9 h-9 flex items-center justify-center rounded font-bold"
                  [style.background]="l.state === 'ok' ? '#10B981' : l.state === 'near' ? '#F59E0B' : 'rgba(255,255,255,0.08)'">{{ l.ch }}</span>
          }
        </div>
      }
      <input class="purre-input mt-2 text-center uppercase tracking-widest" [(ngModel)]="guess" name="guess"
             maxlength="5" placeholder="5 liter" (ngModelChange)="guess = $event.toUpperCase()">
      <button class="purre-btn w-full mt-2" (click)="check()">Sprawdź</button>
      <p class="text-xs purre-muted text-center mt-2">Zgadnij 5-literowe słowo o psach/kotach w {{ MAX_TRIES }} próbach.</p>
    } @else {
      <p class="text-center text-lg font-bold mt-2">{{ solved() ? 'Brawo! 🎉' : 'Hasło: ' + target }}</p>
      <p class="text-center text-sm purre-muted">{{ msg() }}</p>
      <button class="purre-btn w-full mt-3" (click)="reset()">🔁 Nowe słowo</button>
    }
  </div>
  `
})
export class GameWordleComponent {
  readonly MAX_TRIES = MAX_TRIES;
  readonly tries = signal<{ letters: { ch: string; state: string }[] }[]>([]);
  readonly finished = signal(false);
  readonly solved = signal(false);
  readonly msg = signal('');
  guess = '';
  target = '';
  private startedAt = 0;

  constructor(private api: ApiService) { this.reset(); }

  reset(): void {
    this.target = WORDS[Math.floor(Math.random() * WORDS.length)];
    this.tries.set([]);
    this.finished.set(false);
    this.solved.set(false);
    this.msg.set('');
    this.guess = '';
    this.startedAt = 0;
  }

  check(): void {
    const g = this.guess.toUpperCase();
    if (g.length !== 5) { return; }
    if (!this.startedAt) this.startedAt = Date.now();
    const letters = g.split('').map((ch, i) => ({
      ch,
      state: ch === this.target[i] ? 'ok' : this.target.includes(ch) ? 'near' : 'no'
    }));
    this.tries.update(t => [...t, { letters }]);
    this.guess = '';
    if (g === this.target) { this.finish(true); }
    else if (this.tries().length >= MAX_TRIES) { this.finish(false); }
  }

  private finish(solved: boolean): void {
    this.finished.set(true);
    this.solved.set(solved);
    const seconds = Math.max(10, Math.round((Date.now() - this.startedAt) / 1000));
    const score = solved ? MAX_TRIES - this.tries().length + 1 : 0; // max 6
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_WORDLE', score, durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }
}