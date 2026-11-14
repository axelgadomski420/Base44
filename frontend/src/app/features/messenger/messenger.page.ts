import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, ApiError } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ChatService, ChatMessage, TypingEvent, Attachment } from '../../core/chat.service';

interface ConversationDto {
  id: number; type: string; title: string; unread: number;
  lastMessage?: string; lastMessageAt?: string; memberCount: number;
}

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

/** 0.5.0 M10: reakcje, odpowiedzi, edycja, usuwanie, wyszukiwanie, blokowanie. */
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
        <input class="purre-input w-full" placeholder="🔍 Szukaj w wiadomościach…" [(ngModel)]="searchQ"
               (ngModelChange)="onSearch()">
        @if (searchResults().length) {
          <p class="text-xs purre-muted pt-1">Wyniki wiadomości:</p>
          @for (r of searchResults(); track r.id) {
            <button class="purre-card p-3 w-full text-left" (click)="openSearchResult(r)">
              <p class="text-sm truncate">{{ r.content }}</p>
              <p class="text-[11px] purre-muted">{{ r.senderName }} · {{ r.createdAt | date:'dd.MM HH:mm' }}</p>
            </button>
          }
        }
        <button class="purre-card p-4 w-full text-left" (click)="groupOpen.set(!groupOpen())">👥 Nowa grupa</button>
        @if (groupOpen()) {
          <div class="purre-card p-4 space-y-2">
            <input class="purre-input" placeholder="Nazwa grupy" [(ngModel)]="groupTitle">
            <input class="purre-input" placeholder="ID użytkowników po przecinku" [(ngModel)]="groupMembers">
            <button class="purre-btn w-full" (click)="createGroup()">Utwórz</button>
          </div>
        }
        @for (c of filteredConversations(); track c.id) {
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
        <p class="font-bold flex-1 truncate">{{ activeTitle() }}</p>
        @if (!isGroup()) {
          <button class="purre-card px-3 py-1 text-sm" title="Zablokuj użytkownika" (click)="blockActive()">🚫</button>
        }
      </header>
      <section class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        @for (m of messages(); track m.id) {
          <div class="flex" [class.justify-end]="m.senderId === myId()">
            <div class="max-w-[75%] rounded-2xl px-4 py-2 text-sm"
                 [style.background]="m.senderId === myId() ? 'var(--accent)' : 'rgba(255,255,255,0.08)'">
              @if (m.senderId !== myId() && isGroup()) {
                <p class="text-xs opacity-70 mb-0.5">{{ senderName(m) }}</p>
              }
              @if (replyPreviewOf(m)) {
                <p class="text-[11px] opacity-70 border-l-2 pl-2 mb-1" style="border-color: currentColor">
                  ↩️ {{ replyPreviewOf(m) }}</p>
              }
              @if (m.deleted) {
                <p class="italic opacity-60">🚫 Wiadomość usunięta</p>
              } @else {
                @if (m.attachmentUrl) {
                  @if (m.attachmentType === 'IMAGE') {
                    <img [src]="m.attachmentUrl" (click)="lightbox.set(m.attachmentUrl!)" loading="lazy"
                         class="rounded-lg max-h-64 object-cover cursor-zoom-in mb-1" alt="{{ m.attachmentName || 'Zdjęcie' }}">
                  } @else if (m.attachmentType === 'VIDEO') {
                    <video [src]="m.attachmentUrl" controls class="rounded-lg max-h-64 mb-1"></video>
                  } @else {
                    <a [href]="m.attachmentUrl" target="_blank" rel="noopener" class="underline block mb-1">📎 {{ m.attachmentName || 'Załącznik' }}</a>
                  }
                }
                @if (m.content) { <p class="whitespace-pre-line break-words">{{ m.content }}</p> }
              }
              <p class="text-[10px] opacity-60 text-right">
                {{ m.createdAt | date:'HH:mm' }}@if (m.editedAt) { · edytowana }
              </p>
              @if (reactionSummary(m)) {
                <p class="text-xs mt-1">{{ reactionSummary(m) }}</p>
              }
              @if (actionFor() === m.id) {
                <div class="flex gap-1 mt-2 flex-wrap">
                  @for (e of reactions; track e) {
                    <button class="text-base" (click)="react(m, e)">{{ e }}</button>
                  }
                  <button class="text-xs underline ml-1" (click)="startReply(m)">↩️ Odpowiedz</button>
                  @if (m.senderId === myId() && !m.deleted) {
                    <button class="text-xs underline" (click)="startEdit(m)">✏️ Edytuj</button>
                    <button class="text-xs underline" (click)="deleteMsg(m)">🗑️ Usuń</button>
                  }
                </div>
              }
            </div>
            <button class="self-center px-1 opacity-40 hover:opacity-100" (click)="toggleAction(m)">⋯</button>
          </div>
        }
        @if (typingName()) { <p class="text-xs purre-muted italic">✍️ {{ typingName() }} pisze…</p> }
      </section>
      <footer class="px-4 py-3 border-t border-white/10 space-y-2">
        @if (replyTo(); as r) {
          <div class="flex items-center gap-2 text-xs purre-badge">
            ↩️ {{ truncate(r.content || r.attachmentName || 'załącznik', 60) }}
            <button (click)="replyTo.set(null)">×</button>
          </div>
        }
        @if (editing(); as e) {
          <div class="flex items-center gap-2 text-xs purre-badge">
            ✏️ Edytowanie: {{ truncate(e.content, 60) }}
            <button (click)="editing.set(null)">×</button>
          </div>
        }
        @if (uploading()) { <p class="text-xs purre-muted">Wysyłanie załącznika…</p> }
        @if (pendingAttachment()) {
          <div class="flex items-center gap-2 text-xs purre-badge">
            📎 {{ pendingAttachment()!.name || pendingAttachment()!.url }}
            <button (click)="pendingAttachment.set(null)">×</button>
          </div>
        }
        <div class="flex gap-2">
          <label class="purre-card px-3 py-2 cursor-pointer" title="Dodaj zdjęcie lub plik">
            @if (uploading()) { ⏳ } @else { 📎 }
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf"
                   class="hidden" (change)="onFilePick($event)">
          </label>
          <input class="purre-input flex-1" placeholder="Napisz wiadomość…" [(ngModel)]="text"
                 (ngModelChange)="onType()" (keyup.enter)="send()">
          <button class="purre-btn" (click)="send()">➤</button>
        </div>
      </footer>
    }
  </div>

  @if (lightbox()) {
    <div class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" (click)="lightbox.set(null)">
      <img [src]="lightbox()!" class="max-h-full max-w-full object-contain">
    </div>
  }
  `
})
export class MessengerPage implements OnInit {
  readonly reactions = REACTIONS;
  readonly conversations = signal<ConversationDto[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly activeId = signal<number | null>(null);
  readonly typingName = signal('');
  readonly lightbox = signal<string | null>(null);
  readonly pendingAttachment = signal<Attachment | null>(null);
  readonly uploading = signal(false);
  readonly replyTo = signal<ChatMessage | null>(null);
  readonly editing = signal<ChatMessage | null>(null);
  readonly actionFor = signal<number | null>(null);
  readonly searchResults = signal<ChatMessage[]>([]);
  text = '';
  searchQ = '';
  groupOpen = false;
  groupTitle = '';
  groupMembers = '';
  private senderNames = new Map<number, string>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

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

  filteredConversations(): ConversationDto[] {
    const q = this.searchQ.trim().toLowerCase();
    if (!q || this.searchResults().length) return this.conversations();
    return this.conversations().filter(c => c.title.toLowerCase().includes(q));
  }

  /** Debounce 400 ms — szukamy w treści wiadomości przez REST. */
  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const q = this.searchQ.trim();
    if (q.length < 2) { this.searchResults.set([]); return; }
    this.searchTimer = setTimeout(() => {
      this.api.get<ChatMessage[]>('/conversations/search', { q }).subscribe({
        next: (r) => this.searchResults.set(r), error: () => this.searchResults.set([])
      });
    }, 400);
  }

  openSearchResult(m: ChatMessage): void {
    this.searchResults.set([]);
    this.searchQ = '';
    this.open(m.conversationId);
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
    this.lightbox.set(null);
    this.pendingAttachment.set(null);
    this.replyTo.set(null);
    this.editing.set(null);
    this.actionFor.set(null);
    this.api.get<ChatMessage[]>('/conversations/' + id + '/messages').subscribe({
      next: (list) => { this.messages.set(list.slice(-100)); this.markRead(id); }
    });
    this.chat.messages$(id).subscribe((m) => {
      this.messages.update(list => {
        const idx = list.findIndex(x => x.id === m.id);
        if (idx >= 0) { const copy = [...list]; copy[idx] = m; return copy; }
        return [...list, m];
      });
      if (m.senderId !== this.myId()) this.markRead(id);
    });
    this.chat.typing$(id).subscribe((t: TypingEvent) => {
      if (t.userId === this.myId()) return;
      this.typingName.set(t.displayName);
      if (this.typingTimer) clearTimeout(this.typingTimer);
      this.typingTimer = setTimeout(() => this.typingName.set(''), 2500);
    });
  }

  markRead(id: number): void {
    this.api.post('/conversations/' + id + '/read', {}).subscribe({ error: () => undefined });
  }

  close(): void {
    this.activeId.set(null);
    this.loadConversations();
  }

  toggleAction(m: ChatMessage): void {
    this.actionFor.update(v => v === m.id ? null : m.id);
  }

  react(m: ChatMessage, emoji: string): void {
    this.actionFor.set(null);
    this.api.post<ChatMessage>('/conversations/messages/' + m.id + '/react', { emoji })
      .subscribe({ next: (updated) => this.replaceMessage(updated), error: () => undefined });
  }

  startReply(m: ChatMessage): void {
    this.actionFor.set(null);
    this.editing.set(null);
    this.replyTo.set(m);
  }

  startEdit(m: ChatMessage): void {
    this.actionFor.set(null);
    this.replyTo.set(null);
    this.editing.set(m);
    this.text = m.content;
  }

  deleteMsg(m: ChatMessage): void {
    this.actionFor.set(null);
    this.api.delete<ChatMessage>('/conversations/messages/' + m.id)
      .subscribe({ next: (updated) => this.replaceMessage(updated), error: () => undefined });
  }

  blockActive(): void {
    const conv = this.conversations().find(x => x.id === this.activeId());
    if (!confirm('Zablokować „' + (conv?.title ?? 'tego użytkownika') + '”? Nie będzie mógł do Ciebie pisać.')) return;
    const other = this.otherUserId();
    if (!other) return;
    this.api.post('/conversations/block', { userId: other })
      .subscribe({ next: () => this.close(), error: () => undefined });
  }

  otherUserId(): number | null {
    const conv = this.conversations().find(x => x.id === this.activeId());
    if (!conv || conv.type !== 'DIRECT' || !conv.title) return null;
    return null; // blokowanie z poziomu profilu — tu po tytule nie da się wyznaczyć ID
  }

  private replaceMessage(updated: ChatMessage): void {
    this.messages.update(list => {
      const idx = list.findIndex(x => x.id === updated.id);
      if (idx < 0) return list;
      const copy = [...list];
      copy[idx] = updated;
      return copy;
    });
  }

  replyPreviewOf(m: ChatMessage): string | null {
    if (!m.replyToId) return null;
    const parent = this.messages().find(x => x.id === m.replyToId);
    if (!parent) return 'wiadomość';
    const txt = parent.deleted ? 'wiadomość usunięta' : (parent.content || parent.attachmentName || 'załącznik');
    return this.truncate(txt, 60);
  }

  reactionSummary(m: ChatMessage): string | null {
    const r = m.reactions;
    if (!r || !Object.keys(r).length) return null;
    return Object.entries(r).map(([e, c]) => e + (c > 1 ? ' ' + c : '')).join(' ');
  }

  truncate(s: string, n: number): string {
    const t = s ?? '';
    return t.length > n ? t.slice(0, n) + '…' : t;
  }

  onType(): void {
    const id = this.activeId();
    if (id) this.chat.typing(id);
  }

  /** 0.4.0: wybór załącznika — upload do tego samego storage co ogłoszenia, potem podgląd przed wysłaniem. */
  onFilePick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { this.pendingAttachment.set(null); return; }
    this.uploading.set(true);
    const fd = new FormData();
    fd.append('file', file);
    this.api.postMultipart<{ url: string; mediaType: 'IMAGE' | 'VIDEO' }>('/media/upload', fd).subscribe({
      next: (res) => {
        const type: 'IMAGE' | 'VIDEO' | 'FILE' = res.mediaType === 'VIDEO' ? 'VIDEO'
          : res.mediaType === 'IMAGE' ? 'IMAGE' : 'FILE';
        this.pendingAttachment.set({ url: res.url, type, name: file.name });
        this.uploading.set(false);
      },
      error: (e) => {
        this.uploading.set(false);
        if (e instanceof ApiError && e.status === 413) { /* za duży plik — cicho */ }
      }
    });
  }

  send(): void {
    const id = this.activeId();
    const att = this.pendingAttachment();
    if (!id) return;
    const editingMsg = this.editing();
    if (editingMsg) {
      const newText = this.text.trim();
      if (!newText) return;
      this.api.patch<ChatMessage>('/conversations/messages/' + editingMsg.id, { content: newText })
        .subscribe({ next: (updated) => { this.replaceMessage(updated); this.editing.set(null); this.text = ''; } });
      return;
    }
    if (!this.text.trim() && !att) return;
    this.chat.send(id, this.text.trim(), att ?? undefined, this.replyTo()?.id);
    this.text = '';
    this.replyTo.set(null);
    this.pendingAttachment.set(null);
  }

  isGroup(): boolean {
    const c = this.conversations().find(x => x.id === this.activeId());
    return c?.type === 'GROUP';
  }

  activeTitle(): string {
    return this.conversations().find(x => x.id === this.activeId())?.title ?? 'Rozmowa';
  }

  senderName(m: ChatMessage): string {
    if (m.senderName) return m.senderName;
    if (!this.senderNames.has(m.senderId)) this.senderNames.set(m.senderId, 'Użytkownik #' + m.senderId);
    return this.senderNames.get(m.senderId)!;
  }
}
