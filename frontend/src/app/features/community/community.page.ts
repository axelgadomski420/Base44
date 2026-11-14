import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

interface GroupDto {
  id: number; name: string; description?: string; kind: string;
  species?: string; breed?: string; region?: string;
  memberCount: number; joined: boolean; createdBy: number;
}
interface PollOptionDto { id: number; label: string; votes: number; }
interface PostDto {
  id: number; groupId: number; userId: number; userName: string; content: string;
  pollQuestion?: string; options: PollOptionDto[]; likes: number; likedByMe: boolean; createdAt: string;
}

/** 0.5.0 M11: Społeczność — grupy, posty, ankiety, reakcje. */
@Component({
  selector: 'purre-community',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="px-5 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">👥 Społeczność</h1>
      @if (view() === 'list') {
        <button class="purre-badge" (click)="view.set('mine')">⭐ Moje grupy</button>
      } @else {
        <button class="purre-badge" (click)="view.set('list'); loadGroups()">📋 Wszystkie</button>
      }
    </header>

    @if (view() === 'list' && !groupId()) {
      <button class="purre-card p-4 w-full text-left" (click)="createOpen.set(!createOpen())">➕ Nowa grupa</button>
      @if (createOpen()) {
        <div class="purre-card p-4 space-y-2">
          <input class="purre-input" placeholder="Nazwa grupy" [(ngModel)]="newName">
          <textarea class="purre-input" rows="2" placeholder="Opis" [(ngModel)]="newDesc"></textarea>
          <div class="grid grid-cols-2 gap-2">
            <select class="purre-input" [(ngModel)]="newKind">
              <option value="BREED">Rasowa</option>
              <option value="REGION">Regionalna</option>
              <option value="TOPIC">Tematyczna</option>
            </select>
            <select class="purre-input" [(ngModel)]="newSpecies">
              <option value="">Gatunek (opcjonalnie)</option>
              <option value="DOG">🐶</option>
              <option value="CAT">🐱</option>
            </select>
          </div>
          <button class="purre-btn w-full" (click)="createGroup()">Utwórz grupę</button>
        </div>
      }
    }

    @if (groupId()) {
      <button class="purre-badge" (click)="closeGroup()">← Wróć do grup</button>
      <h2 class="text-xl font-bold">{{ activeGroup()?.name }}</h2>
      @if (activeGroup()?.description) { <p class="purre-muted text-sm">{{ activeGroup()!.description }}</p> }

      <div class="purre-card p-4 space-y-2">
        <textarea class="purre-input" rows="2" placeholder="Napisz do grupy…" [(ngModel)]="postText"></textarea>
        <button class="text-xs underline" (click)="pollOpen.set(!pollOpen())">📊 Dodaj ankietę</button>
        @if (pollOpen()) {
          <input class="purre-input" placeholder="Pytanie ankiety" [(ngModel)]="pollQuestion">
          @for (i of [0, 1, 2, 3]; track i) {
            <input class="purre-input" placeholder="Opcja {{ i + 1 }}" [(ngModel)]="pollOptions[i]">
          }
        }
        <button class="purre-btn w-full" [disabled]="!postText.trim()" (click)="createPost()">Opublikuj</button>
      </div>

      @for (p of posts(); track p.id) {
        <article class="purre-card p-4 space-y-2">
          <p class="text-xs purre-muted">{{ p.userName }} · {{ p.createdAt | date:'dd.MM HH:mm' }}</p>
          <p class="text-sm whitespace-pre-line">{{ p.content }}</p>
          @if (p.pollQuestion) {
            <p class="text-sm font-semibold">📊 {{ p.pollQuestion }}</p>
            @for (o of p.options; track o.id) {
              <button class="w-full text-left p-2 rounded-lg text-sm"
                      [style.background]="myVote(p) === o.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)'"
                      (click)="vote(p, o.id)">
                {{ o.label }} — {{ o.votes }} głosów
              </button>
            }
          }
          <button class="purre-badge" (click)="like(p)">{{ p.likedByMe ? '❤️' : '🤍' }} {{ p.likes }}</button>
        </article>
      } @empty {
        <p class="purre-muted text-sm">Brak wpisów — bądź pierwszy!</p>
      }
    } @else {
      @for (g of groups(); track g.id) {
        <div class="purre-card p-4 flex justify-between items-center gap-2">
          <button class="text-left min-w-0" (click)="openGroup(g.id)">
            <p class="font-semibold truncate">{{ kindIcon(g.kind) }} {{ g.name }}</p>
            <p class="text-xs purre-muted truncate">{{ g.description || '' }} · 👥 {{ g.memberCount }}</p>
          </button>
          <button class="purre-badge shrink-0" (click)="g.joined ? leave(g.id) : join(g.id)">
            {{ g.joined ? '✔️ Dołączono' : 'Dołącz' }}
          </button>
        </div>
      } @empty {
        <p class="purre-muted text-sm">Brak grup.</p>
      }
    }
  </div>
  `
})
export class CommunityPage implements OnInit {
  readonly view = signal<'list' | 'mine'>('list');
  readonly groups = signal<GroupDto[]>([]);
  readonly posts = signal<PostDto[]>([]);
  readonly groupId = signal<number | null>(null);
  readonly createOpen = signal(false);
  readonly pollOpen = signal(false);
  postText = '';
  pollQuestion = '';
  pollOptions: string[] = ['', '', '', ''];
  newName = ''; newDesc = ''; newKind = 'TOPIC'; newSpecies = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void { this.loadGroups(); }

  myId(): number { return this.auth.user()?.id ?? 0; }

  loadGroups(): void {
    const path = this.view() === 'mine' ? '/groups/mine' : '/groups';
    this.api.get<GroupDto[]>(path).subscribe({ next: (g) => this.groups.set(g), error: () => this.groups.set([]) });
  }

  kindIcon(kind: string): string {
    return kind === 'BREED' ? '🐾' : kind === 'REGION' ? '📍' : '💬';
  }

  activeGroup(): GroupDto | null {
    return this.groups().find(g => g.id === this.groupId()) ?? null;
  }

  myVote(p: PostDto): number | null {
    return null; // backend zwraca opcje z licznikami; mój głos — najprościej: zaznaczamy po kliknięciu
  }

  createGroup(): void {
    this.api.post<GroupDto>('/groups', {
      name: this.newName, description: this.newDesc, kind: this.newKind,
      species: this.newSpecies || null
    }).subscribe({
      next: (g) => { this.createOpen.set(false); this.newName = ''; this.newDesc = ''; this.loadGroups(); },
      error: () => undefined
    });
  }

  join(id: number): void {
    this.api.post<GroupDto>('/groups/' + id + '/join', {}).subscribe({ next: () => this.loadGroups() });
  }

  leave(id: number): void {
    this.api.delete('/groups/' + id + '/join').subscribe({ next: () => this.loadGroups() });
  }

  openGroup(id: number): void {
    this.groupId.set(id);
    this.loadPosts();
  }

  closeGroup(): void {
    this.groupId.set(null);
    this.posts.set([]);
    this.loadGroups();
  }

  loadPosts(): void {
    const id = this.groupId();
    if (!id) return;
    this.api.get<PostDto[]>('/groups/' + id + '/posts').subscribe({
      next: (p) => this.posts.set(p), error: () => this.posts.set([])
    });
  }

  createPost(): void {
    const id = this.groupId();
    if (!id || !this.postText.trim()) return;
    const options = this.pollOpen() ? this.pollOptions.filter(o => o.trim()) : [];
    this.api.post<PostDto>('/groups/' + id + '/posts', {
      content: this.postText,
      pollQuestion: this.pollOpen() ? this.pollQuestion : null,
      options
    }).subscribe({
      next: () => { this.postText = ''; this.pollQuestion = ''; this.pollOptions = ['', '', '', '']; this.pollOpen.set(false); this.loadPosts(); },
      error: () => undefined
    });
  }

  like(p: PostDto): void {
    this.api.post<PostDto>('/groups/posts/' + p.id + '/like', {})
      .subscribe({ next: (updated) => this.replacePost(updated), error: () => undefined });
  }

  vote(p: PostDto, optionId: number): void {
    this.api.post<PostDto>('/groups/posts/' + p.id + '/vote', { optionId })
      .subscribe({ next: (updated) => this.replacePost(updated), error: () => undefined });
  }

  private replacePost(updated: PostDto): void {
    this.posts.update(list => list.map(p => p.id === updated.id ? updated : p));
  }
}
