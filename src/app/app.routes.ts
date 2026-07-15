import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/bikes/bike-list/bike-list').then((m) => m.BikeListComponent),
      },
      {
        path: 'bikes/new',
        loadComponent: () =>
          import('./features/bikes/bike-form/bike-form').then((m) => m.BikeFormComponent),
      },
      {
        path: 'bikes/:id/edit',
        loadComponent: () =>
          import('./features/bikes/bike-form/bike-form').then((m) => m.BikeFormComponent),
      },
      {
        path: 'bikes/:id',
        loadComponent: () =>
          import('./features/bikes/bike-detail/bike-detail').then((m) => m.BikeDetailComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
