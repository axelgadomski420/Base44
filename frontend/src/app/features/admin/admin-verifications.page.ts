import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface VerificationDto {
  id: number; status: string; kennelNumber: string; kennelUnion: string;
  riskScore?: number; aiAnalysis?: string; createdAt: string; userEmail?: string;
  documents: { id: number; docType: string; originalFilename: string }[];
}

@Component({
  selector: 'purre-admin-verifications',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">🛡️ Weryfikacje hodowców</h1>

    @for (v of items(); track v.id) {
      <div class="purre-card p-5 space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-bold">{{ v.kennelNumber }} · {{ v.kennelUnion }}</p>
            <p class="text-xs purre-muted">{{ v.userEmail }} · {{ v.createdAt | date:'short' }}</p>
          </div>
          <span class="purre-badge">{{ v.status }}</span>
        </div>
        @if (v.riskScore != null) {
          <p class="text-sm">Risk score: <b>{{ v.riskScore }}/100</b></p>
        }
        @if (v.aiAnalysis) { <p class="text-sm purre-muted">{{ v.aiAnalysis }}</p> }
        <div>
          @for (doc of v.documents; track doc.id) {
            <button (click)="download(doc.id, doc.originalFilename)" class="text-sm underline mr-3" style="color: var(--accent)">
              📄 {{ doc.originalFilename }}
            </button>
          }
        </div>
        <textarea class="purre-input" rows="2" [(ngModel)]="reasons[v.id]" placeholder="Powód decyzji (przy odrzuceniu wymagany)"></textarea>
        <div class="flex gap-2">
          <button class="purre-btn flex-1" (click)="decide(v.id, 'APPROVED')">✅ Zatwierdź</button>
          <button class="purre-btn flex-1" style="background: var(--danger)" (click)="decide(v.id, 'REJECTED')">❌ Odrzuć</button>
        </div>
      </div>
    } @empty {
      <p class="purre-muted p-6 text-center">Brak weryfikacji w kolejce.</p>
    }
  </div>
  `
})
export class AdminVerificationsPage implements OnInit {
  readonly items = signal<VerificationDto[]>([]);
  readonly reasons: Record<number, string> = {};

  constructor(private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.get<VerificationDto[]>('/admin/verifications').subscribe({
      next: (r) => this.items.set(r.content ?? r), error: () => this.items.set([])
    });
  }

  decide(id: number, decision: string): void {
    const reason = this.reasons[id] ?? '';
    if (decision === 'REJECTED' && !reason) { alert('Podaj powód odrzucenia.'); return; }
    this.api.post('/admin/verifications/' + id + '/decision', { decision, reason }).subscribe({
      next: () => this.ngOnInit()
    });
  }

  download(docId: number, filename: string): void {
    this.api.getBlob('/verification/documents/' + docId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
    });
  }
}