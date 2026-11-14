import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

interface Tile { v: number; id: number; }

@Component({
  selector: 'purre-game-2048',
  standalone: true,
  template: `
  <div class="purre-card p-4">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold">🐱 PURRE 2048</h3>
      <span class="purre-badge">Wynik: {{ score() }}</span>
    </div>
    <div class="grid grid-cols-4 gap-2 select-none" (keydown)="onKey($event)" tabindex="0">
      @for (cell of grid(); track $index) {
        <div class="aspect-square rounded-lg flex items-center justify-center font-bold text-lg"
             [style.background]="cell ? cellColor(cell.v) : 'rgba(255,255,255,0.06)'"
             [style.color]="cell && cell.v > 4 ? '#fff' : 'inherit'">
          {{ cell ? emoji(cell.v) : '' }}
        </div>
      }
    </div>
    <div class="grid grid-cols-3 gap-1 mt-3 max-w-[140px] mx-auto">
      <span></span><button class="purre-btn py-1" (click)="move('up')">↑</button><span></span>
      <button class="purre-btn py-1" (click)="move('left')">←</button>
      <button class="purre-btn py-1" (click)="move('down')">↓</button>
      <button class="purre-btn py-1" (click)="move('right')">→</button>
    </div>
    @if (over()) { <p class="text-center mt-2 purre-badge">Koniec gry — wynik zapisany!</p> }
  </div>
  `
})
export class Game2048Component {
  readonly grid = signal<(Tile | null)[]>(Array(16).fill(null));
  readonly score = signal(0);
  readonly over = signal(false);
  private nextId = 1;

  constructor(private api: ApiService) { this.reset(); }

  reset(): void {
    this.grid.set(Array(16).fill(null));
    this.score.set(0);
    this.over.set(false);
    this.spawn(); this.spawn();
  }

  private spawn(): void {
    const g = [...this.grid()];
    const empty = g.map((t, i) => t ? -1 : i).filter(i => i >= 0);
    if (!empty.length) return;
    const idx = empty[Math.floor(Math.random() * empty.length)];
    g[idx] = { v: Math.random() < 0.9 ? 2 : 4, id: this.nextId++ };
    this.grid.set(g);
  }

  emoji(v: number): string {
    const map: Record<number, string> = { 2: '🐾', 4: '🐱', 8: '🐶', 16: '🦴', 32: '🐕', 64: '🐈', 128: '🏆', 256: '💎', 512: '👑', 1024: '🌟', 2048: '✨' };
    return map[v] ?? String(v);
  }

  cellColor(v: number): string {
    const colors = ['rgba(139,92,246,0.3)', 'rgba(139,92,246,0.5)', 'rgba(139,92,246,0.7)', 'rgba(43,227,155,0.6)', 'rgba(43,227,155,0.85)', '#8B5CF6', '#7C3AED', '#2BE39B', '#0EA86F', '#F59E0B', '#EF4444'];
    return colors[Math.min(Math.log2(v) - 1, colors.length - 1)] ?? '#8B5CF6';
  }

  onKey(e: KeyboardEvent): void {
    const map: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const dir = map[e.key];
    if (dir) { e.preventDefault(); this.move(dir); }
  }

  move(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.over()) return;
    const g = this.grid().map(t => t ? { ...t } : null);
    let gained = 0;
    const lines: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const line: number[] = [];
      for (let j = 0; j < 4; j++) {
        line.push(dir === 'left' || dir === 'right' ? i * 4 + j : j * 4 + i);
      }
      lines.push(dir === 'right' || dir === 'down' ? line.reverse() : line);
    }
    for (const line of lines) {
      const tiles = line.map(i => g[i]).filter(Boolean) as Tile[];
      const merged: Tile[] = [];
      for (let k = 0; k < tiles.length; k++) {
        if (k + 1 < tiles.length && tiles[k].v === tiles[k + 1].v) {
          merged.push({ v: tiles[k].v * 2, id: tiles[k].id });
          gained += tiles[k].v * 2;
          k++;
        } else {
          merged.push(tiles[k]);
        }
      }
      line.forEach((idx, pos) => { g[idx] = merged[pos] ?? null; });
    }
    this.grid.set(g);
    if (gained > 0) this.score.update(s => s + gained);
    this.spawn();
    if (this.isStuck()) {
      this.over.set(true);
      this.api.post('/arcade/scores', { game: 'PURRE_2048', score: this.score(), durationSeconds: 60 })
        .subscribe({ error: () => undefined });
    }
  }

  private isStuck(): boolean {
    const g = this.grid();
    for (let i = 0; i < 16; i++) {
      if (!g[i]) return false;
      const right = (i % 4) < 3 ? g[i + 1] : null;
      const down = i + 4 < 16 ? g[i + 4] : null;
      if (right && right.v === g[i]!.v) return false;
      if (down && down.v === g[i]!.v) return false;
    }
    return true;
  }
}