import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { I18nService } from './i18n/i18n.service';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService); // se inyecta aquí para que aplique el tema al arrancar
  year = new Date().getFullYear();
}
