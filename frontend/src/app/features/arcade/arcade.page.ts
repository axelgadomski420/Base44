import { Component, OnInit, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ApiService, ApiError } from '../../core/api.service';
import { AdSlotComponent } from '../../core/ad-slot.component';
import { Game2048Component } from './game-2048';
import { GameMemoryComponent } from './game-memory';
import { GameQuizComponent } from './game-quiz';
import { GameSnakeComponent } from './game-snake';
import { GameTetrisComponent } from './game-tetris';
import { GameFlappyComponent } from './game-flappy';
import { GameRunnerComponent } from './game-runner';
import { GameMatch3Component } from './game-match3';
import { GameWordleComponent } from './game-wordle';
import { GameTriviaComponent } from './game-trivia';
import { GameColoringComponent } from './game-coloring';
import { GamePuzzleComponent } from './game-puzzle';
import { GameBubbleComponent } from './game-bubble';
import { GameHexComponent } from './game-hex';
import { GameJumpComponent } from './game-jump';
import { GameWhackComponent } from './game-whack';

interface LeaderRow { rank: number; userId: number; displayName: string; totalScore: number; weeklyBonus: boolean; }
interface DailyResult { coins: number; streak: number; balance: number; }

@Component({
  selector: 'purre-arcade',
  standalone: true,
  imports: [NgComponentOutlet, AdSlotComponent, Game2048Component, GameMemoryComponent, GameQuizComponent, GameSnakeComponent,
    GameTetrisComponent, GameFlappyComponent, GameRunnerComponent, GameMatch3Component, GameWordleComponent,
    GameTriviaComponent, GameColoringComponent, GamePuzzleComponent, GameBubbleComponent, GameHexComponent, GameJumpComponent,
    GameWhackComponent],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-5">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">🎮 PURRE Arcade</h1>
      <span class="purre-badge">XP: {{ xp() }}</span>
    </header>

    <purre-ad-slot placement="GAME_INTERSTITIAL" [everyN]="3" class="block" />

    <button class="purre-card p-4 w-full text-left" (click)="claimDaily()" [disabled]="claiming()">
      <p class="font-bold">🎁 Dzienny bonus — 20 🪙</p>
      <p class="text-xs purre-muted mt-1">+10 🪙 za każdy dzień z rzędu (do 8 dni).</p>
      @if (dailyMsg()) { <p class="text-xs mt-1" style="color: var(--accent-2)">{{ dailyMsg() }}</p> }
    </button>

    <section class="flex gap-2 flex-wrap">
      @for (g of games; track g.id) {
        <button class="purre-badge"
                [style.outline]="current() === g.id ? '2px solid var(--accent)' : 'none'"
                (click)="current.set(g.id)">{{ g.label }}</button>
      }
    </section>

    <ng-container [ngComponentOutlet]="gameMap[current()]"></ng-container>

    <section>
      <h2 class="font-bold mb-2">🏆 Ranking tygodniowy</h2>
      @for (row of leaderboard(); track row.userId) {
        <div class="purre-card p-3 flex justify-between text-sm">
          <span>{{ row.rank }}. {{ row.displayName }}</span>
          <span class="purre-badge">{{ row.totalScore }}{{ row.weeklyBonus ? ' 🎁' : '' }}</span>
        </div>
      } @empty { <p class="purre-muted text-sm">—</p> }
    </section>
  </div>
  `
})
export class ArcadePage implements OnInit {
  readonly gameMap: Record<string, any> = {
    '2048': Game2048Component, memory: GameMemoryComponent, quiz: GameQuizComponent, snake: GameSnakeComponent,
    tetris: GameTetrisComponent, flappy: GameFlappyComponent, runner: GameRunnerComponent, match3: GameMatch3Component,
    wordle: GameWordleComponent, trivia: GameTriviaComponent, coloring: GameColoringComponent, puzzle: GamePuzzleComponent,
    bubble: GameBubbleComponent, hex: GameHexComponent, jump: GameJumpComponent, whack: GameWhackComponent
  };
  readonly games = [
    { id: '2048', label: '🐱 2048' }, { id: 'memory', label: '🧩 Memory' }, { id: 'quiz', label: '❓ Quiz' },
    { id: 'snake', label: '🐍 Snake' }, { id: 'tetris', label: '🧱 Tetris' }, { id: 'flappy', label: '🐦 Flappy' },
    { id: 'runner', label: '🏃 Runner' }, { id: 'match3', label: '💎 Match-3' }, { id: 'wordle', label: '🔤 Wordle' },
    { id: 'trivia', label: '🧠 Trivia' }, { id: 'coloring', label: '🎨 Coloring' }, { id: 'puzzle', label: '🖼️ Puzzle' },
    { id: 'bubble', label: '🫧 Bubble' }, { id: 'hex', label: '⬡ Hex' }, { id: 'jump', label: '🦘 Jump' },
    { id: 'whack', label: '🔨 Whack' }
  ];
  readonly current = signal<string>('2048');
  readonly leaderboard = signal<LeaderRow[]>([]);
  readonly xp = signal(0);
  readonly claiming = signal(false);
  readonly dailyMsg = signal('');

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<LeaderRow[]>('/arcade/leaderboard').subscribe({ next: (l) => this.leaderboard.set(l), error: () => undefined });
    this.api.get<{ xp: number }>('/arcade/xp').subscribe({ next: (x) => this.xp.set(x.xp), error: () => undefined });
  }

  claimDaily(): void {
    this.claiming.set(true); this.dailyMsg.set('');
    this.api.post<DailyResult>('/arcade/daily', {}).subscribe({
      next: (res) => {
        this.dailyMsg.set('Odebrano ' + res.coins + ' 🪙 · seria ' + res.streak + ' dni.');
        this.claiming.set(false);
        this.ngOnInit();
      },
      error: (e) => {
        this.dailyMsg.set(e instanceof ApiError && e.code === 'ALREADY_CLAIMED' ? 'Bonus odebrany — wróć jutro.' : 'Nie udało się odebrać bonusu.');
        this.claiming.set(false);
      }
    });
  }
}
