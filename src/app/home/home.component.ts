import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { SpaceBackgroundComponent } from '../space/spaceBackground.component';

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
  readonly email = 'fouadaharchi1@gmail.com';

  hard = ['Java & Spring Boot', 'Kotlin & Android', 'Angular', 'PostgreSQL & MyBatis', 'HTML, CSS & JavaScript', 'Git & GitHub']; // Aquí habrá que añadir iconos de los logos de cada tecnología, y quizá un enlace a su web oficial. Por ahora solo tecnologías de backend y frontend, pero se podrían añadir otras como Docker, Linux, etc
  soft = ['soft.1', 'soft.2', 'soft.3', 'soft.4'];

  private io?: IntersectionObserver;

  ngAfterViewInit() {
    this.io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) this.planet.set((e.target as HTMLElement).dataset['planet'] ?? 'sun');
      }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    this.host.nativeElement.querySelectorAll('.stop').forEach(el => this.io!.observe(el));
  }

  ngOnDestroy() { this.io?.disconnect(); }

  go(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.email);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {}
  }
}