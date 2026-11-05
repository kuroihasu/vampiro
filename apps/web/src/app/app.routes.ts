import { Routes } from '@angular/router';

/* Cada área se carga con lazy loading por ruta. */
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  { path: 'wiki', loadComponent: () => import('./features/wiki/wiki').then((m) => m.Wiki) },
  {
    path: 'personajes',
    loadComponent: () => import('./features/characters/characters').then((m) => m.Characters),
  },
  { path: 'salas', loadComponent: () => import('./features/rooms/rooms').then((m) => m.Rooms) },
  { path: '**', redirectTo: '' },
];
