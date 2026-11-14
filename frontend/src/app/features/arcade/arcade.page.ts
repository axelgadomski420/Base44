import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { Game2048Component } from './game-2048';

interface LeaderRow { userId: number; displayName: string; totalScore: number; }
interface DailyState { claimedToday: boolean; streak: number; }

@Component({
  selector: 'purre-arcade',
  standalone: true,
  imports: [DatePipe, Game2048Component],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-5">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">🎮 PURRE Arcade</h1>
      <span class="purre-badge">XP: {{ xp() }}</span>
    </header>

    <button class="purre-card p-4 w-full text-left" (click)="claimDaily()" [disabled]="daily()?.claimedToday">
      <p class="font-bold">🎁 Dzienny bonus — 20 🪙</p>
      <p class="text-xs purre-muted mt-1">
        @if (daily()?.claimedToday) { Odebrano dzisiaj. Seria: {{ daily()?.streak }} dni. }
        @else { Odbierz +10 🪙 za każdy dzień z rzędu. }
      </p>
    </button>

    <purre-game-2048></purre-game-2048>

    <section>
      <h2 class="font-bold mb-2">Gry (wkrótce)</h2>
      <div class="grid grid-cols-3 gap-2">
        @for (g of soon; track g) {
          <div class="purre-card p-3 text-center text-sm opacity-60">{{ g }}</div>
        }
      </div>
    </section>

    <section>
      <h2 class="font-bold mb-2">🏆 Ranking tygodniowy</h2>
      @for (row of leaderboard(); track row.userId; let i = $index) {
        <div class="purre-card p-3 flex justify-between text-sm">
          <span>{{ i + 1 }}. {{ row.displayName }}</span>
          <span class="purre-badge">{{ row.totalScore }}</span>
        </div>
      } @empty { <p class="purre-muted text-sm">—</p> }
    </section>
  </div>
  `
})
export class ArcadePage implements OnInit {
  readonly soon = ['🧩 Memory', '❓ Quiz', '⬡ Hex', '🐍 Snake', '🧱 Tetris', '🐦 Flappy', '🏃 Runner', '💎 Match-3', '🔤 Wordle', '🎨 Coloring', '🦘 Jump', '🫧 Bubble', '🖼️ Puzzle'];
  readonly daily = signal<DailyState | null>(null);
  readonly leaderboard = signal<LeaderRow[]>([]);
  readonly xp = signal(0);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<DailyState>('/arcade/daily').subscribe({ next: (d) => this.daily.set(d), error: () => undefined });
    this.api.get<LeaderRow[]>('/arcade/leaderboard').subscribe({ next: (l) => this.leaderboard.set(l.content ?? l), error: () => undefined });
    this.api.get<{ xp: number }>('/arcade/xp').subscribe({ next: (x) => this.xp.set(x.xp), error: () => undefined });
  }

  claimDaily(): void {
    this.api.post('/arcade/daily', {}).subscribe({ next: () => this.ngOnInit() });
  }
}