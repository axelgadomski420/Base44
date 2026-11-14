import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

interface QA { q: string; a: string; }

/** PURRE Assistant (faza 3): doradca AI — rasy, pielegnacja, adopcje. */
@Component({
  selector: 'purre-assistant',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <header class="text-center space-y-1">
      <p class="text-4xl">🐾🤖</p>
      <h1 class="text-2xl font-extrabold">PURRE Assistant</h1>
      <p class="purre-muted text-sm">Doradca AI: rasy, pielegnacja, adopcje, co sprawdzic u hodowcy.</p>
    </header>

    <section class="space-y-3">
      @for (qa of history(); track $index) {
        <div class="purre-card p-4">
          <p class="text-sm font-semibold">Ty: {{ qa.q }}</p>
          <p class="text-sm mt-2 whitespace-pre-line">{{ qa.a }}</p>
        </div>
      }
    </section>

    <form (ngSubmit)="ask()" class="flex gap-2 sticky bottom-20">
      <input class="purre-input flex-1" placeholder="Zadaj pytanie…" [(ngModel)]="question" name="question" required>
      <button class="purre-btn" [disabled]="busy()">➤</button>
    </form>

    <p class="text-[11px] purre-muted text-center">Asystent nie zastepuje weterynarza — przy problemach zdrowotnych skontaktuj sie z lekarzem.</p>
  </div>
  `
})
export class AssistantPage {
  question = '';
  readonly history = signal<QA[]>([]);
  readonly busy = signal(false);

  constructor(private api: ApiService) {}

  ask(): void {
    const q = this.question.trim();
    if (!q || this.busy()) return;
    this.busy.set(true);
    this.question = '';
    this.api.post<{ answer: string }>('/assistant', { question: q }).subscribe({
      next: (res) => {
        this.history.update(h => [...h, { q, a: res.answer }]);
        this.busy.set(false);
      },
      error: () => {
        this.history.update(h => [...h, { q, a: 'Nie udalo sie uzyskac odpowiedzi — sprobuj ponownie za chwile.' }]);
        this.busy.set(false);
      }
    });
  }
}