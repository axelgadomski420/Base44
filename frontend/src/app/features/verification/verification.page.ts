import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, ApiError } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface VerificationDto {
  id: number; status: string; kennelNumber?: string; kennelUnion?: string;
  riskScore?: number; rejectionReason?: string; aiAnalysis?: string; createdAt: string;
  documents: { id: number; docType: string; originalFilename: string }[];
}

@Component({
  selector: 'purre-verification',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <h1 class="text-2xl font-extrabold">{{ i18n.t('verify.title') }}</h1>

    @if (verification(); as v) {
      <div class="purre-card p-5 space-y-2">
        <span class="purre-badge">{{ statusLabel(v.status) }}</span>
        <p class="text-sm">Hodowla: <b>{{ v.kennelNumber }}</b> · {{ v.kennelUnion }}</p>
        <p class="text-xs purre-muted">Złożono: {{ v.createdAt | date:'short' }}</p>
        @if (v.riskScore != null) { <p class="text-sm">Risk score AI: {{ v.riskScore }}/100</p> }
        @if (v.aiAnalysis) { <p class="text-sm purre-muted">{{ v.aiAnalysis }}</p> }
        @if (v.status === 'REJECTED' && v.rejectionReason) {
          <p class="purre-error">{{ v.rejectionReason }}</p>
        }
        <div class="pt-2">
          <p class="text-sm font-semibold mb-1">Dokumenty</p>
          @for (doc of v.documents; track doc.id) {
            <button (click)="download(doc.id, doc.originalFilename)" class="block text-sm underline mb-1" style="color: var(--accent)">
              📄 {{ doc.docType }} — {{ doc.originalFilename }}
            </button>
          }
        </div>
      </div>

      @if (v.status === 'REJECTED') {
        <form (ngSubmit)="appeal()" class="purre-card p-5 space-y-3">
          <h2 class="font-bold">{{ i18n.t('verify.appeal') }}</h2>
          <textarea class="purre-input" rows="3" [(ngModel)]="appealText" name="appeal" required
            placeholder="Wyjaśnienie"></textarea>
          <button class="purre-btn" [disabled]="busy()">{{ i18n.t('verify.appeal') }}</button>
        </form>
      }
    } @else {
      <form (ngSubmit)="submit()" class="purre-card p-5 space-y-3">
        <p class="text-sm purre-muted">{{ i18n.t('verify.description') }}</p>
        <label class="block text-sm">Numer rejestracji hodowli (ZKwP / FCI / klub rasowy)
          <input class="purre-input mt-1" name="kennelNumber" [(ngModel)]="kennelNumber" required>
        </label>
        <label class="block text-sm">Związek / klub
          <input class="purre-input mt-1" name="kennelUnion" [(ngModel)]="kennelUnion" required
            placeholder="np. ZKwP, FCI">
        </label>
        <label class="block text-sm">Dokumenty (min. 3, max 20 plików, JPG/PNG/WEBP/PDF, 10 MB)
          <input class="mt-1 text-sm" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf"
                 (change)="onFiles($event)">
        </label>
        @if (files().length) { <p class="text-xs purre-muted">Wybrano {{ files().length }} plików.</p> }
        <label class="flex items-start gap-2 text-sm">
          <input type="checkbox" name="rodo" [(ngModel)]="rodo" required>
          <span>Zgadzam się na przetwarzanie dokumentów w celu weryfikacji (RODO). Dokumenty są szyfrowane i usuwane do 30 dni po decyzji.</span>
        </label>
        @if (error()) { <p class="purre-error">{{ error() }}</p> }
        <button class="purre-btn w-full" [disabled]="busy()">{{ i18n.t('verify.submit') }}</button>
      </form>
    }
  </div>
  `
})
export class VerificationPage implements OnInit {
  kennelNumber = ''; kennelUnion = ''; rodo = false; appealText = '';
  readonly files = signal<File[]>([]);
  readonly verification = signal<VerificationDto | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor(private api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.get<VerificationDto>('/verification/me').subscribe({
      next: (v) => this.verification.set(v),
      error: () => this.verification.set(null)
    });
  }

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.files.set(Array.from(input.files));
  }

  async submit(): Promise<void> {
    this.busy.set(true); this.error.set('');
    if (this.files().length < 3) { this.error.set('Wymagane minimum 3 dokumenty.'); this.busy.set(false); return; }
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify({
      kennelNumber: this.kennelNumber, kennelUnion: this.kennelUnion, rodoConsent: this.rodo
    })], { type: 'application/json' }));
    for (const file of this.files()) form.append('files', file);
    this.api.postMultipart<{ id: number }>('/verification', form).subscribe({
      next: () => this.ngOnInit(),
      error: (e) => { this.error.set(e instanceof ApiError ? e.message : 'Błąd wysyłki.'); this.busy.set(false); }
    });
  }

  appeal(): void {
    this.busy.set(true);
    this.api.post('/verification/appeal', { reason: this.appealText }).subscribe({
      next: () => this.ngOnInit(),
      error: (e) => { this.error.set(e instanceof ApiError ? e.message : 'Błąd.'); this.busy.set(false); }
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

  statusLabel(s: string): string {
    return s === 'PENDING' ? '⏳ Oczekuje na weryfikację' : s === 'APPROVED' ? '✅ Zweryfikowany hodowca' : '❌ Odrzucona';
  }
}