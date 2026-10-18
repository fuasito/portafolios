import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

// Rutas con "#" para que GitHub Pages no dé 404 al recargar
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withHashLocation())],
};
