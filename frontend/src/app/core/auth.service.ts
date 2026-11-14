import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

export interface PurreUser {
  id: number;
  email: string;
  role: 'BUYER' | 'BREEDER' | 'ADMIN';
  displayName: string;
  bio?: string;
  city?: string;
  region?: string;
  avatarUrl?: string;
  verifiedBadge: boolean;
  boostedUntil?: string;
}

interface AuthResponse { accessToken: string; user: PurreUser; }

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
      error: () => { this.logout(); }
    });
  }

  register(data: Record<string, unknown>): Promise<PurreUser> {
    return new Promise((resolve, reject) => {
      this.api.post<AuthResponse>('/auth/register', data).subscribe({
        next: (res) => { this.apply(res); resolve(res.user); },
        error: reject
      });
    });
  }

  login(email: string, password: string): Promise<PurreUser> {
    return new Promise((resolve, reject) => {
      this.api.post<AuthResponse>('/auth/login', { email, password }).subscribe({
        next: (res) => { this.apply(res); resolve(res.user); },
        error: reject
      });
    });
  }

  logout(): void {
    localStorage.removeItem('purre_token');
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  private apply(res: AuthResponse): void {
    localStorage.setItem('purre_token', res.accessToken);
    this.user.set(res.user);
    this.loaded.set(true);
  }
}