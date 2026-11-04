import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { authResponse } from '../../../testing/fixtures';
import { SessionStore } from './session-store';

describe('SessionStore', () => {
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('empieza sin sesión', () => {
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeUndefined();
  });

  it('login guarda el usuario y el token, y envía cookies', async () => {
    const done = firstValueFrom(store.login({ email: 'nadia@example.com', password: 'x' }));
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.withCredentials).toBe(true);
    req.flush(authResponse());
    await done;
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.displayName).toBe('Nadia');
    expect(store.accessToken()).toBe('token-1');
  });

  it('dos refresh simultáneos hacen una sola petición', async () => {
    const a = firstValueFrom(store.refresh());
    const b = firstValueFrom(store.refresh());
    http.expectOne('/api/v1/auth/refresh').flush(authResponse('token-2'));
    expect((await a).accessToken).toBe('token-2');
    expect((await b).accessToken).toBe('token-2');
    expect(store.accessToken()).toBe('token-2');
  });

  it('si el refresh falla, cierra la sesión local', async () => {
    const login = firstValueFrom(store.login({ email: 'a@b.c', password: 'x' }));
    http.expectOne('/api/v1/auth/login').flush(authResponse());
    await login;

    const refresh = firstValueFrom(store.refresh());
    http
      .expectOne('/api/v1/auth/refresh')
      .flush({ code: 'NO_AUTENTICADO' }, { status: 401, statusText: 'Unauthorized' });
    await expect(refresh).rejects.toBeTruthy();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('restore no lanza si no hay sesión previa', async () => {
    const restored = store.restore();
    http
      .expectOne('/api/v1/auth/refresh')
      .flush({ code: 'NO_AUTENTICADO' }, { status: 401, statusText: 'Unauthorized' });
    await expect(restored).resolves.toBeUndefined();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('logout avisa a la API y borra la sesión aunque la API falle', async () => {
    const login = firstValueFrom(store.login({ email: 'a@b.c', password: 'x' }));
    http.expectOne('/api/v1/auth/login').flush(authResponse());
    await login;

    const out = store.logout();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 500, statusText: 'Error' });
    await out;
    expect(store.isAuthenticated()).toBe(false);
  });
});
