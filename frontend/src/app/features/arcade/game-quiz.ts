import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

interface QuizQ { q: string; o: string[]; a: number; }

const QUESTIONS: QuizQ[] = [
  { q: 'Ile trwa średnio ciąża u suk?', o: ['ok. 63 dni', 'ok. 120 dni', 'ok. 30 dni', 'ok. 200 dni'], a: 0 },
  { q: 'Która rasa psa należy do największych?', o: ['Chihuahua', 'Bernardyn', 'Beagle', 'Border collie'], a: 1 },
  { q: 'Ile godzin dziennie śpi średnio kot domowy?', o: ['2–4', '5–7', '12–16', '20–22'], a: 2 },
  { q: 'Co oznacza skrót ZKwP?', o: ['Związek Kynologiczny w Polsce', 'Zrzeszenie Kotów w Polsce', 'Zweryfikowany Kynolog Profesjonalny', 'Zespół Kardiologii Wet.'], a: 0 },
  { q: 'FIFe to międzynarodowa organizacja zrzeszająca:', o: ['hodowców kotów', 'weterynarzy', 'sklepy zoologiczne', 'trenerów psów'], a: 0 },
  { q: 'Kiedy szczenię może minimum odejść od matki?', o: ['4 tygodnie', '8 tygodni', '12 miesięcy', '2 tygodnie'], a: 1 },
  { q: 'Które szczepienie psa jest obowiązkowe w Polsce?', o: ['Przeciw wściekliźnie', 'Przeciw parwowirozie', 'Przeciw nosówce', 'Żadne'], a: 0 },
  { q: 'Chipowanie psa w Unii Europejskiej jest:', o: ['zalecane', 'obowiązkowe', 'zakazane', 'tylko dla kotów'], a: 1 },
  { q: 'Co powinien zawierać rodowód?', o: ['Numer metryki i dane przodków', 'Cenę psa', 'Adres kupującego', 'Zdjęcia rodzeństwa'], a: 0 },
  { q: 'Niedobór tauryny w diecie kota może prowadzić do:', o: ['problemów z sercem', 'lepszego futra', 'otyłości', 'niczego złego'], a: 0 }
];

/** PURRE Quiz — anti-cheat: quizLike, serwer liczy score×5 (cap 50 coins). */
@Component({
  selector: 'purre-game-quiz',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">❓ PURRE Quiz</h3>
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
export class GameQuizComponent {
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
    const seconds = Math.max(15, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_QUIZ', score: this.correct(), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }

  reset(): void {
    this.index.set(0);
    this.correct.set(0);
    this.picked.set(null);
    this.finished.set(false);
    this.feedback.set('');
    this.msg.set('');
    this.startedAt = 0;
  }
}