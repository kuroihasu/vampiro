import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { authResponse } from '../../../testing/fixtures';
import { adminGuard } from './admin-guard';
import { SessionStore } from './session-store';

@Component({ template: 'panel de admin' })
class Admin {}

@Component({ template: 'wiki' })
class Wiki {}

@Component({ template: 'entrar' })
class Login {}

describe('adminGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'admin', component: Admin, canActivate: [adminGuard] },
          { path: 'wiki', component: Wiki },
          { path: 'entrar', component: Login },
        ]),
      ],
    });
  });

  async function loginAs(role: 'user' | 'admin') {
    const session = TestBed.inject(SessionStore);
    const done = firstValueFrom(session.login({ email: 'a@b.c', password: 'x' }));
    const res = authResponse();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/login')
      .flush({ ...res, user: { ...res.user, role } });
    await done;
  }

  it('sin sesión manda a entrar', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/entrar?volver=%2Fadmin');
  });

  it('un usuario normal vuelve a la wiki', async () => {
    await loginAs('user');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/wiki');
  });

  it('un administrador entra', async () => {
    await loginAs('admin');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(harness.routeNativeElement?.textContent).toContain('panel de admin');
  });
});
