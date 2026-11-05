import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './utils/test-app.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer()).get('/api/v1/health').expect(200, { status: 'ok' });
  });

  it('envía cabeceras de seguridad (helmet)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /api/v1/rulesets/v20', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/rulesets/v20').expect(200);
    expect(res.body.edition).toBe('v20');
  });

  it('GET /api/v1/rulesets/xyz responde con el formato de error común', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/rulesets/xyz').expect(404);
    expect(res.body.code).toBe('NO_ENCONTRADO');
  });

  it('GET /api/v1/rulesets/v5 responde EDICION_NO_DISPONIBLE', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/rulesets/v5').expect(404);
    expect(res.body.code).toBe('EDICION_NO_DISPONIBLE');
  });

  it('GET /api/v1/ruta-inexistente usa el formato de error común', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ruta-inexistente').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, code: 'NO_ENCONTRADO' });
    expect(typeof res.body.timestamp).toBe('string');
  });
});
