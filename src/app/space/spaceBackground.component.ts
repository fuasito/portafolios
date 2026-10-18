import { AfterViewInit, Component, ElementRef, OnDestroy, viewChild } from '@angular/core';

@Component({
  selector: 'app-space-background',
  templateUrl: './spaceBackground.component.html',
  styleUrl: './spaceBackground.component.scss',
})
export class SpaceBackgroundComponent implements AfterViewInit, OnDestroy {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  private scene?: { destroy(): void };
  private dead = false;

  async ngAfterViewInit() {
    try {
      // three.js se descarga aparte (carga diferida), así no pesa en el arranque de la página
      const { SpaceScene } = await import('./spaceScene');
      const scene = await SpaceScene.create(this.canvas().nativeElement);
      if (this.dead) scene.destroy();
      else this.scene = scene;
    } catch {
      this.canvas().nativeElement.classList.add('off'); // sin WebGL: se queda el fondo negro
    }
  }

  ngOnDestroy() {
    this.dead = true;
    this.scene?.destroy();
  }
}
