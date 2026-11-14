import { Injectable, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';

export interface Attachment { url: string; type: 'IMAGE' | 'VIDEO' | 'FILE'; name?: string; }
export interface ChatMessage {
  id: number; conversationId: number; senderId: number; senderName?: string; content: string;
  attachmentUrl?: string; attachmentType?: 'IMAGE' | 'VIDEO' | 'FILE'; attachmentName?: string; createdAt: string;
}
export interface TypingEvent { userId: number; displayName: string; conversationId: number; }

/** BENGOS Messenger — klient STOMP przez natywny WebSocket (/api/ws/websocket). */
@Injectable({ providedIn: 'root' })
export class ChatService {

  readonly connected = signal(false);
  private client: Client | null = null;
  private messageSubjects = new Map<number, Subject<ChatMessage>>();
  private typingSubjects = new Map<number, Subject<TypingEvent>>();

  ensureConnected(): void {
    if (this.client && (this.client.connected || this.client.active)) return;
    const token = localStorage.getItem('purre_token');
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.client = new Client({
      brokerURL: proto + '://' + location.host + '/api/ws/websocket',
      connectHeaders: token ? { Authorization: 'Bearer ' + token } : {},
      reconnectDelay: 4000,
      onConnect: () => this.connected.set(true),
      onDisconnect: () => this.connected.set(false),
      onWebSocketClose: () => this.connected.set(false)
    });
    this.client.activate();
  }

  messages$(conversationId: number): Observable<ChatMessage> {
    this.ensureConnected();
    let subject = this.messageSubjects.get(conversationId);
    if (subject) return subject.asObservable();
    subject = new Subject<ChatMessage>();
    this.messageSubjects.set(conversationId, subject);
    this.client?.watch('/topic/conversation.' + conversationId).subscribe((msg: IMessage) => {
      try { subject!.next(JSON.parse(msg.body)); } catch { /* ignore */ }
    });
    return subject.asObservable();
  }

  typing$(conversationId: number): Observable<TypingEvent> {
    this.ensureConnected();
    let subject = this.typingSubjects.get(conversationId);
    if (subject) return subject.asObservable();
    subject = new Subject<TypingEvent>();
    this.typingSubjects.set(conversationId, subject);
    this.client?.watch('/topic/typing.' + conversationId).subscribe((msg: IMessage) => {
      try { subject!.next(JSON.parse(msg.body)); } catch { /* ignore */ }
    });
    return subject.asObservable();
  }

  send(conversationId: number, content: string, attachment?: Attachment): void {
    this.ensureConnected();
    const body: Record<string, unknown> = { conversationId, content };
    if (attachment) {
      body['attachmentUrl'] = attachment.url;
      body['attachmentType'] = attachment.type;
      if (attachment.name) body['attachmentName'] = attachment.name;
    }
    this.client?.publish({ destination: '/app/chat.send', body: JSON.stringify(body) });
  }

  typing(conversationId: number): void {
    this.ensureConnected();
    this.client?.publish({ destination: '/app/chat.typing', body: JSON.stringify({ conversationId }) });
  }
}
