import { Component, effect, inject, viewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-transformation',
  imports: [RouterLink],
  templateUrl: './transformation.component.html',
  styleUrl: './transformation.component.scss',
})
export class TransformationComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  dash = viewChild<ElementRef<HTMLIFrameElement>>('dash');

  constructor() {
    // El dashboard usa data-theme igual que el portafolio: lo mantenemos sincronizado
    effect(() => { this.theme.mode(); this.sync(); });
  }

  sync() {
    try {
      this.dash()?.nativeElement.contentDocument?.documentElement.setAttribute('data-theme', this.theme.mode());
    } catch {} // si el navegador lo bloquea, el dashboard usa su propio tema
  }
}
