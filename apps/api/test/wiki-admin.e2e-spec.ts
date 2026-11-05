import request from 'supertest';
import type { WikiArticleInput } from '@vampiro/shared';
import { registerUser } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

const article: WikiArticleInput = {
  slug: 'clan-ventrue',
  title: 'Ventrue',
  category: 'clanes',
  editions: ['v20'],
  bodyMarkdown: 'Aristócratas de la Camarilla. Usan [Dominación](rasgo:dominacion).',
};

describe('Wiki: gestión para administradores (e2e)', () => {
  let t: TestApp;
  let admin: { Authorization: string };
  let user: { Authorization: string };
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    admin = await registerUser(t.app.getHttpServer(), 'admin@example.com');
    user = await registerUser(t.app.getHttpServer(), 'jugadora@example.com');
    await t.prisma.user.update({ where: { email: 'admin@example.com' }, data: { role: 'admin' } });
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('sin sesión responde 401 y sin rol de admin 403', async () => {
    await http().post('/api/v1/wiki/articles').send(article).expect(401);
    const res = await http().post('/api/v1/wiki/articles').set(user).send(article).expect(403);
    expect(res.body.code).toBe('PROHIBIDO');
  });

  it('un admin crea un artículo y queda publicado', async () => {
    const res = await http().post('/api/v1/wiki/articles').set(admin).send(article).expect(201);
    expect(res.body).toMatchObject({ slug: 'clan-ventrue', title: 'Ventrue', category: 'clanes' });
    await http().get('/api/v1/wiki/articles/clan-ventrue').expect(200);
  });

  it('un slug repetido responde SLUG_EN_USO (409)', async () => {
    await http().post('/api/v1/wiki/articles').set(admin).send(article).expect(201);
    const res = await http().post('/api/v1/wiki/articles').set(admin).send(article).expect(409);
    expect(res.body.code).toBe('SLUG_EN_USO');
  });

  it('valida slug, categoría, ediciones y que el rasgo exista', async () => {
    const bad = [
      { ...article, slug: 'Con Espacios' },
      { ...article, category: 'hechizos' },
      { ...article, editions: [] },
      { ...article, traitKey: 'telepatia' },
    ];
    for (const body of bad) {
      const res = await http().post('/api/v1/wiki/articles').set(admin).send(body).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('PUT reemplaza el artículo (también el slug)', async () => {
    await http().post('/api/v1/wiki/articles').set(admin).send(article).expect(201);
    const res = await http()
      .put('/api/v1/wiki/articles/clan-ventrue')
      .set(admin)
      .send({ ...article, slug: 'ventrue', title: 'Clan Ventrue' })
      .expect(200);
    expect(res.body).toMatchObject({ slug: 'ventrue', title: 'Clan Ventrue' });
    await http().get('/api/v1/wiki/articles/clan-ventrue').expect(404);
    await http().put('/api/v1/wiki/articles/no-existe').set(admin).send(article).expect(404);
  });

  it('DELETE borra el artículo; un jugador no puede', async () => {
    await http().post('/api/v1/wiki/articles').set(admin).send(article).expect(201);
    await http().delete('/api/v1/wiki/articles/clan-ventrue').set(user).expect(403);
    await http().delete('/api/v1/wiki/articles/clan-ventrue').set(admin).expect(204);
    await http().get('/api/v1/wiki/articles/clan-ventrue').expect(404);
  });
});
