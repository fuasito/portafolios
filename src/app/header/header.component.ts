import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  private router = inject(Router);

  links = [
    ['about', 'nav.about'], ['experience', 'nav.experience'], ['projects', 'nav.projects'],
    ['cv', 'nav.cv'], ['hard', 'nav.hard'], ['soft', 'nav.soft'], ['contact', 'nav.contact'],
  ];

  // Si estás en otra página, vuelve al inicio y luego baja a la sección
  go(id: string) {
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    if (this.router.url.split('#')[0] === '/') scroll();
    else this.router.navigateByUrl('/').then(() => setTimeout(scroll, 80));
  }
}
