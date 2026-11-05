import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session-store';

/** Exige sesión. Si no la hay, manda a /entrar y recuerda la URL para volver después. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(SessionStore).isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { volver: state.url } });
};

/** Solo acepta rutas internas como destino tras entrar (evita redirecciones abiertas). */
export function safeReturnUrl(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
