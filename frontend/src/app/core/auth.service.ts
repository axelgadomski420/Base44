import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

export interface PurreUser {
  id: number;
  email: string;
  role: 'BUYER' | 'BREEDER' | 'MODERATOR' | 'ADMIN';
  displayName: string;
  bio?: string;
  city?: string;
  region?: string;
  website?: string;
  instagram?: string;
  avatarUrl?: string;
  verifiedBadge: boolean;
  boostedUntil?: string;
  premiumUntil?: string;
}

export type LoginResult = { user: PurreUser } | { require2fa: true };
interface AuthResponse { accessToken: string; refreshToken: string; user: PurreUser | null; require2fa: boolean; }

@Injectable({ providedIn: 'root' })
export class AuthService {

  readonly user = signal<PurreUser | null>(null);
  readonly loaded = signal(false);

  constructor(private api: ApiService, private router: Router) {}

  isAuthenticated(): boolean {
    return !!localStorage.getItem('purre_token');
  }

  loadMe(): void {
    if (!this.isAuthenticated()) { this.loaded.set(true); return; }
    this.api.get<PurreUser>('/auth/me').subscribe({
      next: (user) => { this.user.set(user); this.loaded.set(true); },
      error: () => {
        // access token wygasł — spróbuj odświeżyć sesję, potem jeszcze raz /me
        this.tryRefresh().then(ok => {
          if (!ok) { this.clearTokens(); this.user.set(null); this.loaded.set(true); return; }
          this.api.get<PurreUser>('/auth/me').subscribe({
            next: (user) => { this.user.set(user); this.loaded.set(true); },
            error: () => { this.clearTokens(); this.user.set(null); this.loaded.set(true); }
          });
        });
      }
    });
  }

  register(data: Record<string, unknown>): Promise<PurreUser> {
    return new Promise((resolve, reject) => {
      this.api.post<AuthResponse>('/auth/register', data).subscribe({
        next: (res) => { this.apply(res); resolve(res.user!); },
        error: reject
      });
    });
  }

  login(email: string, password: string, totpCode?: string): Promise<LoginResult> {
    return new Promise((resolve, reject) => {
      this.api.post<AuthResponse>('/auth/login', { email, password, totpCode }).subscribe({
        next: (res) => {
          if (res.require2fa) { resolve({ require2fa: true }); return; }
          this.apply(res);
          resolve({ user: res.user! });
        },
        error: reject
      });
    });
  }

  /** Odświeżenie sesji (rotacja refresh tokenu). */
  tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('purre_refresh');
    if (!refreshToken) return Promise.resolve(false);
    return new Promise(resolve => {
      this.api.post<AuthResponse>('/auth/refresh', { refreshToken }).subscribe({
        next: (res) => { this.apply(res); resolve(true); },
        error: () => resolve(false)
      });
    });
  }

  /** Aktualizacja sygnału użytkownika po edycji profilu / avatara / zakupie Premium. */
  patchUser(partial: Partial<PurreUser>): void {
    this.user.update(u => u ? { ...u, ...partial } : u);
  }

  logout(): void {
    const refreshToken = localStorage.getItem('purre_refresh');
    if (refreshToken) {
      this.api.post('/auth/logout', { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clearTokens();
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private apply(res: AuthResponse): void {
    if (res.accessToken) localStorage.setItem('purre_token', res.accessToken);
    if (res.refreshToken) localStorage.setItem('purre_refresh', res.refreshToken);
    if (res.user) this.user.set(res.user);
    this.loaded.set(true);
  }

  private clearTokens(): void {
    localStorage.removeItem('purre_token');
    localStorage.removeItem('purre_refresh');
  }
}