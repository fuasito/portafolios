import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  i18n = inject(I18nService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  planet = signal('sun'); // planeta de fondo según la sección visible
  copied = signal(false);
  email = 'tu-correo@ejemplo.com'; // CAMBIAR

  hard = ['Java & Spring Boot', 'Kotlin & Android', 'Angular', 'PostgreSQL & MyBatis', 'HTML, CSS & JavaScript', 'Git & GitHub'];
  soft = ['soft.1', 'soft.2', 'soft.3', 'soft.4'];

  private io?: IntersectionObserver;
  private onScroll = () => document.documentElement.style.setProperty('--sy', String(window.scrollY));

  ngAfterViewInit() {
    // Detecta qué sección ocupa el centro de la pantalla y cambia de planeta
    this.io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) this.planet.set((e.target as HTMLElement).dataset['planet'] ?? 'sun');
      }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    this.host.nativeElement.querySelectorAll('.stop').forEach(el => this.io!.observe(el));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  ngOnDestroy() {
    this.io?.disconnect();
    window.removeEventListener('scroll', this.onScroll);
  }

  go(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  async copy() {
    try { await navigator.clipboard.writeText(this.email); this.copied.set(true); setTimeout(() => this.copied.set(false), 2000); } catch {}
  }
}
