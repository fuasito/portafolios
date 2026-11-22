import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { SpaceBackgroundComponent } from '../space/spaceBackground.component';


const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

@Component({
  selector: 'app-home',
  imports: [RouterLink, SpaceBackgroundComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  i18n = inject(I18nService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  planet = signal('sun'); // solo para la etiqueta "Estás en…"; la cámara 3D lee el scroll por su cuenta
  copied = signal(false);
  photoOk = signal(true);
  email = 'tu-correo@ejemplo.com'; // CAMBIAR

  hard = ['Java & Spring Boot', 'Kotlin & Android', 'Angular', 'PostgreSQL & MyBatis', 'HTML, CSS & JavaScript', 'Git & GitHub'];
  soft = ['soft.1', 'soft.2', 'soft.3', 'soft.4'];

  // Paradas del viaje: [id de la sección, planeta]
  route = [
    ['home', 'sun'], ['about', 'mercury'], ['experience', 'venus'], ['projects', 'earth'],
    ['cv', 'mars'], ['hard', 'jupiter'], ['soft', 'saturn'], ['contact', 'neptune'],
  ];

  private io?: IntersectionObserver;
  private ticking = false;
  private onScroll = () => {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => { this.ticking = false; this.updateCards(); });
  };

  ngAfterViewInit() {
    this.io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) this.planet.set((e.target as HTMLElement).dataset['planet'] ?? 'sun');
      }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    this.host.nativeElement.querySelectorAll('.stop').forEach(el => this.io!.observe(el));
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll);
    this.updateCards();
  }

  /** Cada tarjeta se desvanece y se desplaza según lo lejos que esté del centro de la pantalla. */
  private updateCards() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const vh = window.innerHeight, mid = vh / 2;
    this.host.nativeElement.querySelectorAll<HTMLElement>('.card').forEach(card => {
      const r = card.getBoundingClientRect();
      // distancia de la línea central de la pantalla a la tarjeta (0 si la atraviesa)
      const dist = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
      const sign = mid < r.top ? 1 : -1;
      card.style.opacity = String(clamp(1 - dist / (vh * 0.45), 0, 1));
      card.style.transform = `translateY(${sign * clamp(dist / vh, 0, 1) * 40}px)`;
    });
  }

  ngOnDestroy() {
    this.io?.disconnect();
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
  }

  go(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.email);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {}
  }
}
