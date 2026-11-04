import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session-store';

/** Solo administradores. Sin sesión, a entrar; con sesión pero sin rol, a la wiki. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/entrar'], { queryParams: { volver: state.url } });
  }
  return session.user()?.role === 'admin' || router.createUrlTree(['/wiki']);
};
