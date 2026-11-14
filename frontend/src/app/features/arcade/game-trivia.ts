import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

interface QuizQ { q: string; o: string[]; a: number; }

const QUESTIONS: QuizQ[] = [
  { q: 'Ile zębów ma dorosły pies?', o: ['32', '42', '28', '52'], a: 1 },
  { q: 'Kot obraca się w locie dzięki:', o: ['ogonowi', 'elastycznemu kręgosłupowi', 'pazurom', 'uszom'], a: 1 },
  { q: 'Jedna z najstarszych ras psów to:', o: ['saluki', 'labrador', 'corgi', 'husky'], a: 0 },
  { q: 'Dlaczego koty mruczą?', o: ['Tylko z radości', 'Komunikacja i samoregulacja', 'Z głodu', 'Przy przegrzaniu'], a: 1 },
  { q: 'Węch psa jest czulszy od ludzkiego około:', o: ['10×', '100×', '10 000–100 000×', 'identyczny'], a: 2 },
  { q: 'Ile godzin dziennie koty pielęgnują futro?', o: ['Nigdy', 'Raz w tygodniu', 'Kilka godzin', 'Tylko po jedzeniu'], a: 2 },
  { q: 'Grupa kotów to po angielsku:', o: ['stado', 'clowder', 'wataha', 'rój'], a: 1 },
  { q: 'Który zmysł szczeniąt rozwija się pierwszym?', o: ['wzrok', 'dotyk', 'słuch', 'smak'], a: 1 },
  { q: 'Gniatanie łapkami (biscuits) u kotów to:', o: ['znak agresji', 'reszta odruchu kocięcego', 'tupanie', 'strojenie'], a: 1 },
  { q: 'Psy najlepiej rozróżniają kolory:', o: ['pełną paletą', 'tylko czarno-biało', 'niebieski i żółty', 'tylko czerwień'], a: 2 }
];

/** PURRE Trivia — anti-cheat: PURRE_TRIVIA max 50, quizLike, min 10 s (serwer). */
@Component({
  selector: 'purre-game-trivia',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🧠 PURRE Trivia</h3>
      <span class="purre-badge">{{ index() + 1 }} / {{ questions.length }}</span>
    </div>
    @if (!finished()) {
      <p class="font-semibold mb-3">{{ questions[index()].q }}</p>
      <div class="space-y-2">
        @for (opt of questions[index()].o; track $index) {
          <button class="purre-input w-full text-left"
                  [style.outline]="picked() === $index ? '2px solid var(--accent)' : 'none'"
                  (click)="answer($index)">{{ opt }}</button>
        }
      </div>
      @if (feedback()) { <p class="text-sm mt-2" style="color: var(--accent-2)">{{ feedback() }}</p> }
    } @else {
      <p class="text-center text-lg font-bold mt-2">Wynik: {{ correct() }} / {{ questions.length }}</p>
      <p class="text-center text-sm purre-muted">{{ msg() }}</p>
      <button class="purre-btn w-full mt-3" (click)="reset()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameTriviaComponent {
  readonly questions = QUESTIONS;
  readonly index = signal(0);
  readonly correct = signal(0);
  readonly picked = signal<number | null>(null);
  readonly finished = signal(false);
  readonly feedback = signal('');
  readonly msg = signal('');
  private startedAt = 0;

  constructor(private api: ApiService) {}

  answer(i: number): void {
    if (this.picked() !== null) return;
    if (!this.startedAt) this.startedAt = Date.now();
    this.picked.set(i);
    const ok = i === this.questions[this.index()].a;
    if (ok) this.correct.update(c => c + 1);
    this.feedback.set(ok ? '✅ Dobrze!' : '❌ Niestety…');
    setTimeout(() => {
      this.feedback.set('');
      this.picked.set(null);
      if (this.index() + 1 >= this.questions.length) { this.finish(); }
      else { this.index.update(x => x + 1); }
    }, 900);
  }

  private finish(): void {
    this.finished.set(true);
    const seconds = Math.max(10, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_TRIVIA', score: this.correct(), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }

  reset(): void {
    this.index.set(0); this.correct.set(0); this.picked.set(null);
    this.finished.set(false); this.feedback.set(''); this.msg.set(''); this.startedAt = 0;
  }
}