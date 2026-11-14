import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ChatService, ChatMessage, TypingEvent } from '../../core/chat.service';

interface ConversationDto {
  id: number; type: string; title: string; unread: number;
  lastMessage?: string; lastMessageAt?: string; memberCount: number;
}

@Component({
  selector: 'purre-messenger',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="h-[100dvh] flex flex-col">
    @if (!activeId()) {
      <header class="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 class="text-2xl font-extrabold">💬 BENGOS Messenger</h1>
        <span class="purre-badge" [style.opacity]="chat.connected() ? 1 : 0.5">
          {{ chat.connected() ? '🟢' : '🔴' }}
        </span>
      </header>
      <section class="px-5 pb-24 flex-1 overflow-y-auto space-y-2">
        <button class="purre-card p-4 w-full text-left" (click)="groupOpen.set(!groupOpen())">👥 Nowa grupa</button>
        @if (groupOpen()) {
          <div class="purre-card p-4 space-y-2">
            <input class="purre-input" placeholder="Nazwa grupy" [(ngModel)]="groupTitle">
            <input class="purre-input" placeholder="ID użytkowników po przecinku" [(ngModel)]="groupMembers">
            <button class="purre-btn w-full" (click)="createGroup()">Utwórz</button>
          </div>
        }
        @for (c of conversations(); track c.id) {
          <button class="purre-card p-4 w-full text-left flex justify-between items-center" (click)="open(c.id)">
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ c.type === 'GROUP' ? '👥 ' : '🐾 ' }}{{ c.title }}</p>
              <p class="text-xs purre-muted truncate">{{ c.lastMessage ?? 'Brak wiadomości' }}</p>
            </div>
            @if (c.unread > 0) { <span class="purre-badge">{{ c.unread }}</span> }
          </button>
        } @empty {
          <p class="purre-muted text-center p-6">Brak rozmów. Napisz do hodowcy z karty ogłoszenia 💬</p>
        }
      </section>
    } @else {
      <header class="px-4 py-3 flex items-center gap-3 border-b border-white/10">
        <button class="purre-card px-3 py-1" (click)="close()">←</button>
        <p class="font-bold">{{ activeTitle() }}</p>
      </header>
      <section class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        @for (m of messages(); track m.id) {
          <div class="flex" [class.justify-end]="m.senderId === myId()">
            <div class="max-w-[75%] rounded-2xl px-4 py-2 text-sm"
                 [style.background]="m.senderId === myId() ? 'var(--accent)' : 'rgba(255,255,255,0.08)'">
              @if (m.senderId !== myId() && isGroup()) {
                <p class="text-xs opacity-70 mb-0.5">{{ senderName(m) }}</p>
              }
              <p class="whitespace-pre-line break-words">{{ m.content }}</p>
              <p class="text-[10px] opacity-60 text-right">{{ m.createdAt | date:'HH:mm' }}</p>
            </div>
          </div>
        }
        @if (typingName()) { <p class="text-xs purre-muted italic">✍️ {{ typingName() }} pisze…</p> }
      </section>
      <footer class="px-4 py-3 border-t border-white/10 flex gap-2">
        <input class="purre-input flex-1" placeholder="Napisz wiadomość…" [(ngModel)]="text"
               (ngModelChange)="onType()" (keyup.enter)="send()">
        <button class="purre-btn" (click)="send()">➤</button>
      </footer>
    }
  </div>
  `
})
export class MessengerPage implements OnInit {
  readonly conversations = signal<ConversationDto[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly activeId = signal<number | null>(null);
  readonly typingName = signal('');
  text = '';
  groupOpen = false;
  groupTitle = '';
  groupMembers = '';
  private senderNames = new Map<number, string>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private api: ApiService, readonly chat: ChatService, readonly auth: AuthService,
    private route: ActivatedRoute, private router: Router
  ) {}

  myId(): number { return this.auth.user()?.id ?? 0; }

  ngOnInit(): void {
    this.chat.ensureConnected();
    this.loadConversations();
    const to = Number(this.route.snapshot.queryParamMap.get('to'));
    if (to > 0) this.startDirect(to);
  }

  loadConversations(): void {
    this.api.get<ConversationDto[]>('/conversations').subscribe({
      next: (list) => this.conversations.set(list), error: () => this.conversations.set([])
    });
  }

  startDirect(otherUserId: number): void {
    this.api.post<ConversationDto>('/conversations/direct', { otherUserId }).subscribe({
      next: (c) => { this.loadConversations(); this.open(c.id); }
    });
  }

  createGroup(): void {
    const ids = this.groupMembers.split(',').map(s => Number(s.trim())).filter(n => n > 0);
    this.api.post<ConversationDto>('/conversations/group', { title: this.groupTitle, memberIds: ids })
      .subscribe({ next: () => { this.groupOpen.set(false); this.groupTitle = ''; this.groupMembers = ''; this.loadConversations(); } });
  }

  open(id: number): void {
    this.activeId.set(id);
    this.messages.set([]);
    const conv = this.conversations().find(c => c.id === id);
    this.api.get<ChatMessage[]>('/conversations/' + id + '/messages').subscribe({
      next: (list) => { this.messages.set(list.slice(-100)); this.markRead(id); }
    });
    this.chat.messages$(id).subscribe((m) => {
      this.messages.update(list => [...list, m]);
      if (m.senderId !== this.myId()) this.markRead(id);
    });
    this.chat.typing$(id).subscribe((t: TypingEvent) => {
      if (t.userId === this.myId()) return;
      this.typingName.set(t.displayName);
      if (this.typingTimer) clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(() => this.typingName.set(''), 2500);
    });
    if (conv) this.senderNames.clear();
  }

  markRead(id: number): void {
    this.api.post('/conversations/' + id + '/read', {}).subscribe({ error: () => undefined });
  }

  close(): void {
    this.activeId.set(null);
    this.loadConversations();
  }

  onType(): void {
    const id = this.activeId();
    if (id) this.chat.typing(id);
  }

  send(): void {
    const id = this.activeId();
    if (!id || !this.text.trim()) return;
    this.chat.send(id, this.text.trim());
    this.text = '';
  }

  isGroup(): boolean {
    const c = this.conversations().find(x => x.id === this.activeId());
    return c?.type === 'GROUP';
  }

  activeTitle(): string {
    return this.conversations().find(x => x.id === this.activeId())?.title ?? 'Rozmowa';
  }

  senderName(m: ChatMessage): string {
    if (!m.senderName) return 'Użytkownik #' + m.senderId;
    return m.senderName;
  }
}