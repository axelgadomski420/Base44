import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

interface Card { emoji: string; flipped: boolean; matched: boolean; }

/** PURRE Memory — anti-cheat: PURRE_MEMORY max 5000, min 15 s (serwer). */
@Component({
  selector: 'purre-game-memory',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🧩 PURRE Memory</h3>
      <span class="purre-badge">Ruchy: {{ moves() }}</span>
    </div>
    <div class="grid grid-cols-4 gap-2 select-none">
      @for (card of cards(); track $index) {
        <button class="aspect-square rounded-lg text-2xl flex items-center justify-center font-bold"
                [style.background]="card.flipped || card.matched ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.06)'"
                [style.opacity]="card.matched ? 0.5 : 1"
                (click)="flip($index)">
          {{ card.flipped || card.matched ? card.emoji : '❓' }}
        </button>
      }
    </div>
    @if (done()) {
      <p class="text-center mt-3 purre-badge">Koniec gry — {{ msg() }}</p>
      <button class="purre-btn w-full mt-2" (click)="reset()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameMemoryComponent {
  private readonly emojis = ['🐾', '🐶', '🐱', '🦴', '🐕', '🐈', '🏆', '💎'];
  readonly cards = signal<Card[]>([]);
  readonly moves = signal(0);
  readonly done = signal(false);
  readonly msg = signal('');
  private first: number | null = null;
  private lock = false;
  private startedAt = 0;

  constructor(private api: ApiService) { this.reset(); }

  reset(): void {
    const deck: Card[] = [...this.emojis, ...this.emojis].map(emoji => ({ emoji, flipped: false, matched: false }));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.cards.set(deck);
    this.moves.set(0);
    this.done.set(false);
    this.msg.set('');
    this.first = null;
    this.lock = false;
    this.startedAt = 0;
  }

  flip(i: number): void {
    if (this.lock || this.done()) return;
    const cards = this.cards().map(c => ({ ...c }));
    const card = cards[i];
    if (!card || card.flipped || card.matched) return;
    if (!this.startedAt) this.startedAt = Date.now();
    card.flipped = true;
    if (this.first === null) { this.first = i; this.cards.set(cards); return; }
    const firstIdx = this.first;
    this.first = null;
    this.moves.update(m => m + 1);
    if (cards[firstIdx].emoji === card.emoji) {
      cards[firstIdx].matched = true;
      card.matched = true;
      this.cards.set(cards);
      if (cards.every(c => c.matched)) this.finish();
    } else {
      this.lock = true;
      this.cards.set(cards);
      setTimeout(() => {
        const cur = this.cards().map(c => ({ ...c }));
        cur[firstIdx].flipped = false;
        cur[i].flipped = false;
        this.cards.set(cur);
        this.lock = false;
      }, 700);
    }
  }

  private finish(): void {
    this.done.set(true);
    const seconds = Math.max(15, Math.round((Date.now() - this.startedAt) / 1000));
    const score = Math.max(0, 5000 - this.moves() * 100 - seconds * 25);
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_MEMORY', score, durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('nie udało się zapisać wyniku.')
      });
  }
}