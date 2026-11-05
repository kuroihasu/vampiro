import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { SessionStore } from './core/auth/session-store';
import { authInterceptor } from './core/http/auth-interceptor';
import { errorInterceptor } from './core/http/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Orden: errorInterceptor envuelve a authInterceptor, que así ve el 401 original.
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    // Recupera la sesión (cookie de refresh) antes de la primera navegación y de los guards.
    provideAppInitializer(() => inject(SessionStore).restore()),
  ],
};
