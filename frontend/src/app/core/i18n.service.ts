import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type Lang = 'pl' | 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {

  readonly lang = signal<Lang>((localStorage.getItem('purre_lang') as Lang) || 'pl');
  private dict: Record<string, string> = {};

  readonly languages = [
    { id: 'pl', label: 'Polski' },
    { id: 'en', label: 'English' }
  ];

  constructor(private http: HttpClient) {
    this.load(this.lang());
  }

  set(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem('purre_lang', lang);
    document.documentElement.lang = lang;
    this.load(lang);
  }

  t(key: string): string {
    return this.dict[key] ?? key;
  }

  private load(lang: Lang): void {
    this.http.get<Record<string, string>>('assets/i18n/' + lang + '.json').subscribe({
      next: (dict) => { this.dict = dict; },
      error: () => { this.dict = {}; }
    });
  }
}