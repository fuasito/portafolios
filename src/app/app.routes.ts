import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { TransformationComponent } from './transformation/transformation.component';
import { DashboardPageComponent } from './dashboardpage/dashboardPage.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'transformation', component: TransformationComponent },
  { path: 'dashboard', component: DashboardPageComponent },
  { path: '**', redirectTo: '' },
];
