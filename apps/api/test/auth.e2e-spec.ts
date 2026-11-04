import request from 'supertest';
import type { AuthResponse } from '@vampiro/shared';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

const REFRESH_COOKIE = 'vampiro_rt';
const credentials = { email: 'nadia@example.com', password: 'sangre-y-luna-42' };

function setCookies(res: request.Response): string[] {
  return ([] as string[]).concat(res.headers['set-cookie'] ?? []);
}

function refreshCookie(res: request.Response): string {
  const cookie = setCookies(res).find((c) => c.startsWith(`${REFRESH_COOKIE}=`));
  if (!cookie) throw new Error('La respuesta no trae la cookie de refresh');
  return cookie.split(';')[0]!;
}

describe('Auth (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  const register = (body: object = { ...credentials, displayName: 'Nadia' }) =>
    http().post('/api/v1/auth/register').send(body);

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
  });

  afterAll(async () => {
    await t.app.close();
  });

  describe('POST /auth/register', () => {
    it('crea la cuenta, devuelve el access token y pone el refresh en una cookie httpOnly', async () => {
      const res = await register().expect(201);
      const body = res.body as AuthResponse;
      expect(body.user).toMatchObject({
        email: credentials.email,
        displayName: 'Nadia',
        role: 'user',
      });
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.expiresIn).toBeGreaterThan(0);
      const cookie = setCookies(res).join(';');
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    });

    it('normaliza el email', async () => {
      const res = await register({
        ...credentials,
        email: '  Nadia@Example.COM ',
        displayName: 'Nadia',
      }).expect(201);
      expect(res.body.user.email).toBe('nadia@example.com');
    });

    it('responde EMAIL_EN_USO si el email ya existe', async () => {
      await register().expect(201);
      const res = await register().expect(409);
      expect(res.body.code).toBe('EMAIL_EN_USO');
    });

    it('valida el cuerpo con el formato de error común', async () => {
      const res = await register({
        email: 'no-es-email',
        password: 'corta',
        displayName: '',
      }).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('rechaza campos que no están en el DTO', async () => {
      const res = await register({ ...credentials, displayName: 'Nadia', role: 'admin' }).expect(
        400,
      );
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await register().expect(201);
    });

    it('entra con credenciales correctas', async () => {
      const res = await http().post('/api/v1/auth/login').send(credentials).expect(200);
      expect(res.body.user.email).toBe(credentials.email);
      expect(refreshCookie(res)).toBeTruthy();
    });

    it('responde CREDENCIALES_INVALIDAS con contraseña incorrecta', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ ...credentials, password: 'otra-contraseña-mala' })
        .expect(401);
      expect(res.body.code).toBe('CREDENCIALES_INVALIDAS');
    });

    it('responde igual si el email no existe', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ ...credentials, email: 'nadie@example.com' })
        .expect(401);
      expect(res.body.code).toBe('CREDENCIALES_INVALIDAS');
    });
  });

  describe('POST /auth/refresh y /auth/logout', () => {
    it('rota el refresh token: el nuevo sirve, el viejo no', async () => {
      const first = refreshCookie(await register().expect(201));

      const res = await http().post('/api/v1/auth/refresh').set('Cookie', first).expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      const second = refreshCookie(res);
      expect(second).not.toBe(first);

      await http().post('/api/v1/auth/refresh').set('Cookie', second).expect(200);
    });

    it('si se reutiliza un refresh ya rotado, revoca todas las sesiones del usuario', async () => {
      const first = refreshCookie(await register().expect(201));
      const second = refreshCookie(
        await http().post('/api/v1/auth/refresh').set('Cookie', first).expect(200),
      );

      const reuse = await http().post('/api/v1/auth/refresh').set('Cookie', first).expect(401);
      expect(reuse.body.code).toBe('NO_AUTENTICADO');
      // La sesión legítima también queda revocada.
      await http().post('/api/v1/auth/refresh').set('Cookie', second).expect(401);
    });

    it('sin cookie responde NO_AUTENTICADO', async () => {
      const res = await http().post('/api/v1/auth/refresh').expect(401);
      expect(res.body.code).toBe('NO_AUTENTICADO');
    });

    it('logout revoca el refresh token y borra la cookie', async () => {
      const cookie = refreshCookie(await register().expect(201));
      const res = await http().post('/api/v1/auth/logout').set('Cookie', cookie).expect(204);
      expect(setCookies(res).join(';')).toMatch(/vampiro_rt=;/);
      await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    });
  });

  describe('/users/me', () => {
    it('sin token responde NO_AUTENTICADO', async () => {
      const res = await http().get('/api/v1/users/me').expect(401);
      expect(res.body.code).toBe('NO_AUTENTICADO');
    });

    it('con un token inválido responde NO_AUTENTICADO', async () => {
      await http().get('/api/v1/users/me').set('Authorization', 'Bearer no-es-un-jwt').expect(401);
    });

    it('devuelve y actualiza el perfil', async () => {
      const { accessToken } = (await register().expect(201)).body as AuthResponse;
      const auth = { Authorization: `Bearer ${accessToken}` };

      const me = await http().get('/api/v1/users/me').set(auth).expect(200);
      expect(me.body.displayName).toBe('Nadia');

      const patched = await http()
        .patch('/api/v1/users/me')
        .set(auth)
        .send({ displayName: '  Nadia la Brujah ' })
        .expect(200);
      expect(patched.body.displayName).toBe('Nadia la Brujah');
    });

    it('no deja cambiar el rol', async () => {
      const { accessToken } = (await register().expect(201)).body as AuthResponse;
      await http()
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'admin' })
        .expect(400);
    });
  });
});

describe('Auth (e2e): límite de intentos', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ authThrottleLimit: 5 });
    await resetDatabase(t.prisma);
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('al sexto intento de login en un minuto responde DEMASIADAS_SOLICITUDES', async () => {
    const bad = { ...credentials, password: 'otra-contraseña-mala' };
    const statuses: number[] = [];
    let last: request.Response | undefined;
    for (let i = 0; i < 6; i++) {
      last = await request(t.app.getHttpServer()).post('/api/v1/auth/login').send(bad);
      statuses.push(last.status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    expect(last?.body.code).toBe('DEMASIADAS_SOLICITUDES');
  });
});
