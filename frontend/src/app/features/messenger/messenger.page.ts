import { Component } from '@angular/core';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'purre-messenger',
  standalone: true,
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto text-center space-y-3">
    <div class="text-5xl">💬</div>
    <h1 class="text-2xl font-extrabold">BENGOS Messenger</h1>
    <p class="purre-muted text-sm max-w-md mx-auto">
      Czat 1:1 i grupowy na WebSocket/STOMP — wątki przy ogłoszeniach, statusy unseen,
      wskaźnik pisania i potwierdzenia przeczytania. Wdrożenie w fazie 2 (plan: AUDIT.md §3).
    </p>
    <span class="purre-badge">🚧 Faza 2</span>
  </div>
  `
})
export class MessengerPage {
  constructor(readonly i18n: I18nService) {}
}