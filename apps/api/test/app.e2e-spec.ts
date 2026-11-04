import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { ApiExceptionFilter } from './../src/common/filters/api-exception.filter.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer()).get('/api/v1/health').expect(200, { status: 'ok' });
  });

  it('GET /api/v1/rulesets/v20', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/rulesets/v20').expect(200);
    expect(res.body.edition).toBe('v20');
  });

  it('GET /api/v1/rulesets/xyz responde con el formato de error común', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/rulesets/xyz').expect(404);
    expect(res.body.code).toBe('NO_ENCONTRADO');
  });

  afterEach(async () => {
    await app.close();
  });
});
