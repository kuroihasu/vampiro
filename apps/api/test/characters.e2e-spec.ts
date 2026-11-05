import request from 'supertest';
import type { Character, CharacterSummary } from '@vampiro/shared';
import { COMPLETE_V20_SHEET, registerUser } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

describe('Characters (e2e)', () => {
  let t: TestApp;
  let nadia: { Authorization: string };
  let otro: { Authorization: string };
  const http = () => request(t.app.getHttpServer());

  const create = (auth = nadia, body: object = { edition: 'v20', name: 'Lucía Valdés' }) =>
    http().post('/api/v1/characters').set(auth).send(body);

  const save = (c: Character, patch: Partial<Character> = {}) =>
    http()
      .put(`/api/v1/characters/${c.id}`)
      .set(nadia)
      .send({
        name: patch.name ?? c.name,
        concept: patch.concept ?? c.concept,
        sheet: patch.sheet ?? c.sheet,
        updatedAt: patch.updatedAt ?? c.updatedAt,
      });

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    nadia = await registerUser(t.app.getHttpServer(), 'nadia@example.com');
    otro = await registerUser(t.app.getHttpServer(), 'otro@example.com');
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('exige sesión', async () => {
    const res = await http().get('/api/v1/characters').expect(401);
    expect(res.body.code).toBe('NO_AUTENTICADO');
  });

  describe('POST /characters', () => {
    it('crea un borrador con la ficha vacía y la versión del ruleset', async () => {
      const res = await create().expect(201);
      const c = res.body as Character;
      expect(c).toMatchObject({
        name: 'Lucía Valdés',
        concept: '',
        edition: 'v20',
        status: 'draft',
        sheet: { priorities: {}, traits: {}, freebies: [] },
      });
      expect(c.rulesetVersion).toEqual(expect.any(String));
    });

    it('rechaza una edición sin ruleset (EDICION_NO_DISPONIBLE)', async () => {
      const res = await create(nadia, { edition: 'v5', name: 'X' }).expect(422);
      expect(res.body.code).toBe('EDICION_NO_DISPONIBLE');
    });

    it('valida el cuerpo', async () => {
      const res = await create(nadia, { edition: 'v99', name: '' }).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /characters', () => {
    it('lista solo mis fichas, sin la hoja completa, y filtra por edición', async () => {
      await create().expect(201);
      await create(otro, { edition: 'v20', name: 'Ajena' }).expect(201);

      const res = await http().get('/api/v1/characters?edicion=v20').set(nadia).expect(200);
      const list = res.body as CharacterSummary[];
      expect(list.map((c) => c.name)).toEqual(['Lucía Valdés']);
      expect(list[0]).not.toHaveProperty('sheet');

      const none = await http().get('/api/v1/characters?edicion=v5').set(nadia).expect(200);
      expect(none.body).toEqual([]);
    });
  });

  describe('GET /characters/:id', () => {
    it('devuelve mi ficha y responde 404 con la de otro usuario', async () => {
      const mine = (await create().expect(201)).body as Character;
      await http().get(`/api/v1/characters/${mine.id}`).set(nadia).expect(200);
      const res = await http().get(`/api/v1/characters/${mine.id}`).set(otro).expect(404);
      expect(res.body.code).toBe('NO_ENCONTRADO');
    });

    it('responde 404 con un id que no es UUID', async () => {
      await http().get('/api/v1/characters/no-es-uuid').set(nadia).expect(404);
    });
  });

  describe('PUT /characters/:id', () => {
    it('guarda la ficha, replica el clan y devuelve la versión nueva', async () => {
      const c = (await create().expect(201)).body as Character;
      const res = await save(c, {
        concept: 'Periodista',
        sheet: { ...c.sheet, clan: 'brujah', traits: { fuerza: 2 } },
      }).expect(200);
      const saved = res.body as Character;
      expect(saved).toMatchObject({ concept: 'Periodista', clan: 'brujah' });
      expect(saved.sheet.traits).toEqual({ fuerza: 2 });
      expect(saved.updatedAt).not.toBe(c.updatedAt);
    });

    it('responde 422 RULE_VIOLATION con las violaciones y no guarda', async () => {
      const c = (await create().expect(201)).body as Character;
      const res = await save(c, { sheet: { ...c.sheet, traits: { pelea: 4 } } }).expect(422);
      expect(res.body.code).toBe('RULE_VIOLATION');
      expect(res.body.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'MAX_CREACION_SUPERADO', path: 'pelea' }),
        ]),
      );
      const stored = await http().get(`/api/v1/characters/${c.id}`).set(nadia).expect(200);
      expect(stored.body.sheet.traits).toEqual({});
    });

    it('guarda méritos y defectos, y rechaza los que no cumplen requisitos', async () => {
      const c = (await create().expect(201)).body as Character;
      const ok = await save(c, {
        sheet: { ...c.sheet, meritsFlaws: ['sentidos-agudos', 'pesadillas'] },
      }).expect(200);
      expect(ok.body.sheet.meritsFlaws).toEqual(['sentidos-agudos', 'pesadillas']);

      const bad = await save(ok.body as Character, {
        sheet: { ...c.sheet, clan: 'nosferatu', meritsFlaws: ['atractivo'] },
      }).expect(422);
      expect(bad.body.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'REQUISITO_NO_CUMPLIDO', path: 'atractivo' }),
        ]),
      );
    });

    it('responde 409 CONFLICTO_VERSION si otra pestaña guardó antes', async () => {
      const c = (await create().expect(201)).body as Character;
      await save(c, { name: 'Primera' }).expect(200);
      const res = await save(c, { name: 'Segunda' }).expect(409);
      expect(res.body.code).toBe('CONFLICTO_VERSION');
    });

    it('rechaza una ficha con forma inválida (400)', async () => {
      const c = (await create().expect(201)).body as Character;
      const res = await save(c, { sheet: { traits: 'mucho' } as never }).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('no deja editar la ficha de otro usuario', async () => {
      const c = (await create().expect(201)).body as Character;
      await http()
        .put(`/api/v1/characters/${c.id}`)
        .set(otro)
        .send({ name: 'Robada', concept: '', sheet: c.sheet, updatedAt: c.updatedAt })
        .expect(404);
    });
  });

  describe('POST /characters/:id/evaluate', () => {
    it('evalúa una ficha candidata sin guardarla y devuelve los derivados', async () => {
      const c = (await create().expect(201)).body as Character;
      const res = await http()
        .post(`/api/v1/characters/${c.id}/evaluate`)
        .set(nadia)
        .send({ sheet: { ...c.sheet, traits: { generacion: 2 } } })
        .expect(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.derived).toMatchObject({ generation: 11 });
      expect(res.body.budgets).toEqual(
        expect.arrayContaining([{ path: 'background', available: 5, spent: 2 }]),
      );
    });
  });

  describe('POST /characters/:id/complete', () => {
    it('no completa una ficha con puntos sin repartir', async () => {
      const c = (await create().expect(201)).body as Character;
      const res = await http().post(`/api/v1/characters/${c.id}/complete`).set(nadia).expect(422);
      expect(res.body.code).toBe('RULE_VIOLATION');
      expect(res.body.violations.length).toBeGreaterThan(0);
    });

    it('completa una ficha con todo repartido', async () => {
      const c = (await create().expect(201)).body as Character;
      const saved = (await save(c, { sheet: COMPLETE_V20_SHEET }).expect(200)).body as Character;
      const res = await http()
        .post(`/api/v1/characters/${saved.id}/complete`)
        .set(nadia)
        .expect(200);
      expect(res.body.status).toBe('complete');
    });
  });

  describe('DELETE /characters/:id', () => {
    it('borra mi ficha; la de otro responde 404', async () => {
      const c = (await create().expect(201)).body as Character;
      await http().delete(`/api/v1/characters/${c.id}`).set(otro).expect(404);
      await http().delete(`/api/v1/characters/${c.id}`).set(nadia).expect(204);
      await http().get(`/api/v1/characters/${c.id}`).set(nadia).expect(404);
    });
  });
});
