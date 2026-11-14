import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const ROUNDS = 30;
const COLOR_NAMES: Record<string, string> = {
  '#EF4444': 'CZERWONY', '#F59E0B': 'POMARAŃCZOWY', '#FDE047': 'ŻÓŁTY', '#10B981': 'ZIELONY',
  '#3B82F6': 'NIEBIESKI', '#8B5CF6': 'FIOLETOWY', '#EC4899': 'RÓŻOWY'
};

/** PURRE Hex — test reakcji: czy kolor pasuje do nazwy? anti-cheat: max 100000, min 20 s (serwer). */
@Component({
  selector: 'purre-game-hex',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">⬡ PURRE Hex</h3>
      <span class="purre-badge">Runda {{ round() + 1 }} / {{ ROUNDS }} · ❤️ {{ lives() }}</span>
    </div>
    @if (!finished()) {
      <div class="mx-auto w-40 h-40 rounded-2xl mb-3" [style.background]="swatch()"></div>
      <p class="text-center text-xl font-extrabold tracking-widest mb-3">{{ label() }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button class="purre-btn" (click)="answer(true)">✓ Pasuje</button>
        <button class="purre-btn" (click)="answer(false)">✗ Nie pasuje</button>
      </div>
      <p class="text-xs purre-muted text-center mt-2">Czy KOLOR zgadza się z NAZWĄ? Decyduj szybko!</p>
    } @else {
      <p class="text-center text-lg font-bold mt-2">Koniec — wynik: {{ score() }}</p>
      <p class="text-center text-sm purre-muted">{{ msg() }}</p>
      <button class="purre-btn w-full mt-3" (click)="start()">🔁 Jeszcze raz</button>
    }
  </div>
  `
})
export class GameHexComponent {
  readonly ROUNDS = ROUNDS;
  readonly round = signal(0);
  readonly lives = signal(3);
  readonly score = signal(0);
  readonly finished = signal(false);
  readonly msg = signal('');
  readonly swatch = signal('');
  readonly label = signal('');
  private match = false;
  private startedAt = 0;

  constructor(private api: ApiService) { this.start(); }

  start(): void {
    this.round.set(0); this.lives.set(3); this.score.set(0);
    this.finished.set(false); this.msg.set('');
    this.startedAt = Date.now();
    this.nextRound();
  }

  private nextRound(): void {
    const keys = Object.keys(COLOR_NAMES);
    const shown = keys[Math.floor(Math.random() * keys.length)];
    this.match = Math.random() < 0.5;
    let text = COLOR_NAMES[shown];
    if (!this.match) {
      let other = COLOR_NAMES[keys[Math.floor(Math.random() * keys.length)]];
      while (other === COLOR_NAMES[shown]) other = COLOR_NAMES[keys[Math.floor(Math.random() * keys.length)]];
      text = other;
    }
    this.swatch.set(shown);
    this.label.set(text);
  }

  answer(saysMatch: boolean): void {
    if (this.finished()) return;
    if (saysMatch === this.match) this.score.update(s => s + 3000);
    else this.lives.update(l => l - 1);
    if (this.lives() <= 0 || this.round() + 1 >= ROUNDS) { this.finish(); return; }
    this.round.update(r => r + 1);
    this.nextRound();
  }

  private finish(): void {
    this.finished.set(true);
    const seconds = Math.max(20, Math.round((Date.now() - this.startedAt) / 1000));
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_HEX', score: Math.min(100000, this.score()), durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }
}