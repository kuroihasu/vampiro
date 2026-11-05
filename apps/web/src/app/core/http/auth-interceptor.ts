import {
  HttpErrorResponse,
  type HttpEvent,
  type HttpHandlerFn,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, type Observable, switchMap, throwError } from 'rxjs';
import { SessionStore } from '../auth/session-store';

const API_PREFIX = '/api/';
const AUTH_PREFIX = '/api/v1/auth/';

/**
 * Añade el access token a las peticiones de la API. Ante un 401 renueva la sesión una vez
 * (compartiendo el refresh entre peticiones simultáneas) y reintenta; si vuelve a fallar,
 * propaga el error sin reintentar más.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX) || req.url.startsWith(AUTH_PREFIX)) return next(req);

  const session = inject(SessionStore);
  return send(req, next, session.accessToken()).pipe(
    catchError((error: unknown) => {
      const expired =
        error instanceof HttpErrorResponse && error.status === 401 && session.isAuthenticated();
      if (!expired) return throwError(() => error);

      return session.refresh().pipe(
        catchError(() => throwError(() => error)),
        switchMap(({ accessToken }) => send(req, next, accessToken)),
      );
    }),
  );
};

function send(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  token: string | undefined,
): Observable<HttpEvent<unknown>> {
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
}
