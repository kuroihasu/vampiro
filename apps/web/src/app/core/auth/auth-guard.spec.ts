import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { authGuard } from './auth-guard';
import { authResponse } from '../../../testing/fixtures';
import { SessionStore } from './session-store';

@Component({ template: 'zona privada' })
class Private {}

@Component({ template: 'formulario de entrada' })
class Login {}

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'privado', component: Private, canActivate: [authGuard] },
          { path: 'entrar', component: Login },
        ]),
      ],
    });
  });

  it('sin sesión redirige a /entrar recordando a dónde iba', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/privado?pestana=2');
    expect(TestBed.inject(Router).url).toBe('/entrar?volver=%2Fprivado%3Fpestana%3D2');
    expect(harness.routeNativeElement?.textContent).toContain('formulario de entrada');
  });

  it('con sesión deja pasar', async () => {
    const session = TestBed.inject(SessionStore);
    const login = firstValueFrom(session.login({ email: 'a@b.c', password: 'x' }));
    TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/login').flush(authResponse());
    await login;

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/privado');
    expect(harness.routeNativeElement?.textContent).toContain('zona privada');
  });
});
