import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboardPage.component.html',
  styleUrl: './dashboardPage.component.scss',
})
export class DashboardPageComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  missing = signal(false);

  constructor() {
    effect(() => this.apply(this.theme.mode())); // el dashboard sigue al botón de claro/oscuro
  }

  onLoad() {
    // Si falta public/dashboard/index.html, el servidor devuelve el propio portafolio dentro del iframe
    const doc = this.frame()?.nativeElement.contentDocument;
    this.missing.set(!!doc?.querySelector('app-root'));
    this.apply(this.theme.mode());
  }

  private apply(mode: string) {
    try { this.frame()?.nativeElement.contentDocument?.documentElement.setAttribute('data-theme', mode); } catch {}
  }
}
