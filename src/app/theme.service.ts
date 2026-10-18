import { Injectable, effect, signal } from '@angular/core';

export type Mode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  mode = signal<Mode>(this.saved());

  constructor() {
    effect(() => {
      const m = this.mode();
      document.documentElement.setAttribute('data-theme', m);
      try { localStorage.setItem('theme', m); } catch {}
    });
  }

  toggle() { this.mode.update(m => (m === 'dark' ? 'light' : 'dark')); }

  private saved(): Mode {
    try { return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  }
}
