import type { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin-guard';
import { authGuard } from './core/auth/auth-guard';

/* Cada área se carga con lazy loading por ruta. */
export const routes: Routes = [
  {
    path: '',
    title: 'Vampiro: la Mascarada',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'wiki',
    title: 'Wiki · Vampiro',
    loadComponent: () => import('./features/wiki/wiki').then((m) => m.Wiki),
  },
  {
    path: 'wiki/nuevo',
    title: 'Nuevo artículo · Wiki · Vampiro',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/wiki/wiki-editor').then((m) => m.WikiEditor),
  },
  {
    path: 'wiki/:slug/editar',
    title: 'Editar artículo · Wiki · Vampiro',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/wiki/wiki-editor').then((m) => m.WikiEditor),
  },
  {
    path: 'wiki/:slug',
    loadComponent: () => import('./features/wiki/wiki-article').then((m) => m.WikiArticlePage),
  },
  {
    path: 'entrar',
    title: 'Entrar · Vampiro',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Vampiro',
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: 'personajes',
    title: 'Personajes · Vampiro',
    canActivate: [authGuard],
    loadComponent: () => import('./features/characters/characters').then((m) => m.Characters),
  },
  {
    path: 'personajes/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/characters/editor/character-editor').then((m) => m.CharacterEditor),
  },
  {
    path: 'salas',
    title: 'Salas · Vampiro',
    canActivate: [authGuard],
    loadComponent: () => import('./features/rooms/rooms').then((m) => m.Rooms),
  },
  {
    path: 'salas/unirse/:codigo',
    title: 'Invitación · Vampiro',
    loadComponent: () => import('./features/rooms/join-room').then((m) => m.JoinRoom),
  },
  {
    path: 'salas/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/rooms/room').then((m) => m.Room),
  },
  { path: '**', redirectTo: '' },
];
