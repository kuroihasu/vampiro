import request from 'supertest';
import type { WikiArticle, WikiArticleSummary, WikiCategory } from '@vampiro/shared';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

const slugs = (res: request.Response) => (res.body as WikiArticleSummary[]).map((a) => a.slug);

describe('Wiki (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
    await resetDatabase(t.prisma);
    await t.prisma.wikiArticle.createMany({
      data: [
        {
          slug: 'disciplina-celeridad',
          title: 'Celeridad',
          category: 'disciplinas',
          editions: ['v20'],
          traitKey: 'celeridad',
          bodyMarkdown: 'Velocidad sobrehumana.',
        },
        {
          slug: 'clan-brujah',
          title: 'Brujah',
          category: 'clanes',
          editions: ['v20', 'v5'],
          bodyMarkdown: 'Rebeldes con [Celeridad](rasgo:celeridad).',
        },
        {
          slug: 'clan-ventrue',
          title: 'Ventrue',
          category: 'clanes',
          editions: ['v20'],
          bodyMarkdown: 'Aristócratas de la Camarilla.',
        },
      ],
    });
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('es pública: no pide token', async () => {
    await http().get('/api/v1/wiki/articles').expect(200);
  });

  it('GET /wiki/categories devuelve todas las categorías con su recuento', async () => {
    const res = await http().get('/api/v1/wiki/categories').expect(200);
    const categories = res.body as WikiCategory[];
    expect(categories.find((c) => c.id === 'clanes')).toEqual({
      id: 'clanes',
      name: 'Clanes',
      count: 2,
    });
    expect(categories.find((c) => c.id === 'reglas')?.count).toBe(0);
  });

  it('lista resúmenes ordenados por título, sin el cuerpo', async () => {
    const res = await http().get('/api/v1/wiki/articles').expect(200);
    expect(slugs(res)).toEqual(['clan-brujah', 'disciplina-celeridad', 'clan-ventrue']);
    expect(res.body[0]).not.toHaveProperty('bodyMarkdown');
  });

  it('filtra por categoría', async () => {
    const res = await http().get('/api/v1/wiki/articles?categoria=clanes').expect(200);
    expect(slugs(res)).toEqual(['clan-brujah', 'clan-ventrue']);
  });

  it('filtra por edición', async () => {
    const res = await http().get('/api/v1/wiki/articles?edicion=v5').expect(200);
    expect(slugs(res)).toEqual(['clan-brujah']);
  });

  it('busca en título y cuerpo sin distinguir mayúsculas', async () => {
    const res = await http().get('/api/v1/wiki/articles?q=CAMARILLA').expect(200);
    expect(slugs(res)).toEqual(['clan-ventrue']);
  });

  it('rechaza una categoría o edición desconocida', async () => {
    const res = await http().get('/api/v1/wiki/articles?categoria=hechizos').expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    await http().get('/api/v1/wiki/articles?edicion=v99').expect(400);
  });

  it('GET /wiki/articles/:slug devuelve el artículo con su Markdown', async () => {
    const res = await http().get('/api/v1/wiki/articles/disciplina-celeridad').expect(200);
    expect(res.body as WikiArticle).toMatchObject({
      title: 'Celeridad',
      traitKey: 'celeridad',
      bodyMarkdown: 'Velocidad sobrehumana.',
    });
  });

  it('responde NO_ENCONTRADO para un slug inexistente', async () => {
    const res = await http().get('/api/v1/wiki/articles/no-existe').expect(404);
    expect(res.body.code).toBe('NO_ENCONTRADO');
  });
});
