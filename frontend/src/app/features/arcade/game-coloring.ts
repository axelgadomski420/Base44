import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

const N = 16;
const PALETTE = ['#EF4444', '#F59E0B', '#FDE047', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#78350F', '#94A3B8', '#111827'];

/** PURRE Coloring — anti-cheat: PURRE_COLORING max 1000, min 10 s (serwer). */
@Component({
  selector: 'purre-game-coloring',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🎨 PURRE Coloring</h3>
      <span class="purre-badge">Pikseli: {{ painted() }}</span>
    </div>
    <div class="flex gap-1 flex-wrap mb-3">
      @for (c of palette; track $index) {
        <button class="w-7 h-7 rounded" [style.background]="c"
                [style.outline]="color() === c ? '2px solid white' : 'none'"
                (click)="color.set(c)"></button>
      }
    </div>
    <div class="grid gap-[1px] mx-auto select-none" [style.gridTemplateColumns]="'repeat(' + N + ', 1fr)'" [style.maxWidth]="'320px'"
         (mousedown)="drawing = true" (mouseup)="drawing = false" (mouseleave)="drawing = false">
      @for (cell of grid(); track $index) {
        <div class="aspect-square rounded-[1px]" [style.background]="cell || 'rgba(255,255,255,0.06)'"
             (mousedown)="paint($index)" (mouseenter)="drawing && paint($index)"></div>
      }
    </div>
    <button class="purre-btn w-full mt-3" [disabled]="done()" (click)="finish()">💾 Zakończ i zapisz</button>
    @if (done()) { <p class="text-center mt-2 purre-badge">{{ msg() }}</p> }
  </div>
  `
})
export class GameColoringComponent {
  readonly N = N; readonly palette = PALETTE;
  readonly grid = signal<string[]>(Array(N * N).fill(''));
  readonly painted = signal(0);
  readonly color = signal(PALETTE[4]);
  readonly done = signal(false);
  readonly msg = signal('');
  drawing = false;
  private startedAt = 0;

  constructor(private api: ApiService) {}

  paint(i: number): void {
    if (this.done()) return;
    if (!this.startedAt) this.startedAt = Date.now();
    const g = [...this.grid()];
    if (g[i] === this.color()) return;
    if (!g[i]) this.painted.update(p => p + 1);
    g[i] = this.color();
    this.grid.set(g);
  }

  finish(): void {
    this.done.set(true);
    const seconds = Math.max(10, Math.round((Date.now() - this.startedAt) / 1000));
    const score = Math.min(1000, this.painted() * 5);
    this.api.post<{ coinsAwarded: number; xpAwarded: number }>('/arcade/scores',
      { game: 'PURRE_COLORING', score, durationSeconds: seconds })
      .subscribe({
        next: (r) => this.msg.set('+' + r.coinsAwarded + ' 🪙 · +' + r.xpAwarded + ' XP'),
        error: () => this.msg.set('Nie udało się zapisać wyniku.')
      });
  }
}