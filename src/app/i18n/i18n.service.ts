import { Injectable, effect, signal } from '@angular/core';
import { EN } from './en';
import { ES } from './es';

export type Lang = 'en' | 'es';
const DICT: Record<Lang, Record<string, string>> = { en: EN, es: ES };

// Servicio de traducción propio: i18n.t('clave') en las plantillas.
// Como lee una señal, la pantalla se actualiza sola al cambiar de idioma.
@Injectable({ providedIn: 'root' })
export class I18nService {
  lang = signal<Lang>(this.saved());

  constructor() {
    effect(() => {
      const l = this.lang();
      document.documentElement.lang = l;
      try { localStorage.setItem('lang', l); } catch {}
    });
  }

  t(key: string): string { return DICT[this.lang()][key] ?? DICT.en[key] ?? key; }
  toggle() { this.lang.update(l => (l === 'en' ? 'es' : 'en')); }

  // Inglés por defecto, aunque el navegador esté en español
  private saved(): Lang {
    try { return localStorage.getItem('lang') === 'es' ? 'es' : 'en'; } catch { return 'en'; }
  }
}
