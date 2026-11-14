import { Injectable, signal } from '@angular/core';

export interface PurreTheme { id: string; label: string; }

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly themes: PurreTheme[] = [
    { id: 'aura', label: 'PURRE AURA (Dark Luxury)' },
    { id: 'light', label: 'Light' },
    { id: 'midnight', label: 'Midnight' },
    { id: 'forest', label: 'Forest' },
    { id: 'royal', label: 'Royal' },
    { id: 'sunset', label: 'Sunset' },
    { id: 'mono', label: 'Mono' },
    { id: 'contrast', label: 'High Contrast' }
  ];

  readonly current = signal<string>(localStorage.getItem('purre_theme') || 'aura');

  constructor() {
    this.apply(this.current());
  }

  set(id: string): void {
    this.current.set(id);
    localStorage.setItem('purre_theme', id);
    this.apply(id);
  }

  private apply(id: string): void {
    document.documentElement.setAttribute('data-theme', id);
  }
}