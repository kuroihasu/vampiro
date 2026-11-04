import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../api-error';
import { authResponse } from '../../../testing/fixtures';
import { SessionStore } from '../auth/session-store';
import { authInterceptor } from './auth-interceptor';
import { errorInterceptor } from './error-interceptor';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('interceptores HTTP', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: SessionStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);

    const login = firstValueFrom(session.login({ email: 'a@b.c', password: 'x' }));
    http.expectOne('/api/v1/auth/login').flush(authResponse('token-1'));
    await login;
  });

  afterEach(() => http.verify());

  describe('authInterceptor', () => {
    it('añade el access token a las peticiones de la API', () => {
      client.get('/api/v1/users/me').subscribe();
      const req = http.expectOne('/api/v1/users/me');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
      req.flush({});
    });

    it('no envía el token fuera de /api', () => {
      client.get('https://example.com/datos').subscribe();
      const req = http.expectOne('https://example.com/datos');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('ante un 401 renueva la sesión y reintenta una vez con el token nuevo', async () => {
      const result = firstValueFrom(client.get<{ ok: boolean }>('/api/v1/users/me'));
      http.expectOne('/api/v1/users/me').flush({ code: 'NO_AUTENTICADO' }, unauthorized);
      http.expectOne('/api/v1/auth/refresh').flush(authResponse('token-2'));
      const retry = http.expectOne('/api/v1/users/me');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer token-2');
      retry.flush({ ok: true });
      expect(await result).toEqual({ ok: true });
    });

    it('si el reintento vuelve a dar 401, no entra en bucle', async () => {
      const result = firstValueFrom(client.get('/api/v1/users/me'));
      http.expectOne('/api/v1/users/me').flush({ code: 'NO_AUTENTICADO' }, unauthorized);
      http.expectOne('/api/v1/auth/refresh').flush(authResponse('token-2'));
      http.expectOne('/api/v1/users/me').flush({ code: 'NO_AUTENTICADO' }, unauthorized);
      await expect(result).rejects.toBeInstanceOf(ApiError);
    });

    it('varios 401 a la vez comparten un único refresh', async () => {
      const a = firstValueFrom(client.get('/api/v1/a'));
      const b = firstValueFrom(client.get('/api/v1/b'));
      http.expectOne('/api/v1/a').flush({}, unauthorized);
      http.expectOne('/api/v1/b').flush({}, unauthorized);
      http.expectOne('/api/v1/auth/refresh').flush(authResponse('token-2'));
      http.expectOne('/api/v1/a').flush({});
      http.expectOne('/api/v1/b').flush({});
      await Promise.all([a, b]);
    });

    it('si el refresh falla, cierra la sesión y propaga el error original', async () => {
      const result = firstValueFrom(client.get('/api/v1/users/me'));
      http.expectOne('/api/v1/users/me').flush({ code: 'NO_AUTENTICADO' }, unauthorized);
      http.expectOne('/api/v1/auth/refresh').flush({ code: 'NO_AUTENTICADO' }, unauthorized);
      await expect(result).rejects.toMatchObject({ status: 401, code: 'NO_AUTENTICADO' });
      expect(session.isAuthenticated()).toBe(false);
    });
  });

  describe('errorInterceptor', () => {
    it('convierte el error de la API en ApiError con su código', async () => {
      const result = firstValueFrom(client.get('/api/v1/wiki/articles/x'));
      http
        .expectOne('/api/v1/wiki/articles/x')
        .flush(
          { statusCode: 404, code: 'NO_ENCONTRADO', message: 'No existe el artículo "x".' },
          { status: 404, statusText: 'Not Found' },
        );
      await expect(result).rejects.toMatchObject({
        status: 404,
        code: 'NO_ENCONTRADO',
        message: 'No existe el artículo "x".',
      });
    });

    it('sin conexión da un mensaje claro', async () => {
      const result = firstValueFrom(client.get('/api/v1/wiki/categories'));
      http.expectOne('/api/v1/wiki/categories').error(new ProgressEvent('error'), { status: 0 });
      await expect(result).rejects.toMatchObject({
        status: 0,
        message: 'No se pudo conectar con el servidor. Comprueba tu conexión.',
      });
    });
  });
});
