import request from 'supertest';
import type { Character, DiceRollRecord, RoomCharacterInfo, RoomDetail } from '@vampiro/shared';
import { COMPLETE_V5_SHEET, registerUser } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

describe('V5 de punta a punta (e2e)', () => {
  let t: TestApp;
  let auth: { Authorization: string };
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    auth = await registerUser(t.app.getHttpServer(), 'v5@example.com');
  });

  afterAll(async () => {
    await t.app.close();
  });

  async function completeV5Character(): Promise<Character> {
    const created = (
      await http()
        .post('/api/v1/characters')
        .set(auth)
        .send({ edition: 'v5', name: 'Rosa' })
        .expect(201)
    ).body as Character;
    const saved = (
      await http()
        .put(`/api/v1/characters/${created.id}`)
        .set(auth)
        .send({ name: 'Rosa', concept: '', sheet: COMPLETE_V5_SHEET, updatedAt: created.updatedAt })
        .expect(200)
    ).body as Character;
    return (await http().post(`/api/v1/characters/${saved.id}/complete`).set(auth).expect(200))
      .body as Character;
  }

  it('el ruleset de V5 está disponible', async () => {
    const res = await http().get('/api/v1/rulesets/v5').expect(200);
    expect(res.body.creation.patterns.map((p: { key: string }) => p.key)).toEqual([
      'attributes',
      'skills',
      'disciplines',
    ]);
  });

  it('crea y completa una ficha V5; los derivados son los de V5', async () => {
    const c = await completeV5Character();
    expect(c.status).toBe('complete');
    const evaluation = await http()
      .post(`/api/v1/characters/${c.id}/evaluate`)
      .set(auth)
      .send({})
      .expect(200);
    expect(evaluation.body.derived).toMatchObject({
      willpower: 3,
      health: 6,
      humanity: 7,
      hungerMax: 5,
    });
  });

  it('rechaza dos atributos a 4 con el patrón', async () => {
    const created = (
      await http()
        .post('/api/v1/characters')
        .set(auth)
        .send({ edition: 'v5', name: 'X' })
        .expect(201)
    ).body as Character;
    const res = await http()
      .put(`/api/v1/characters/${created.id}`)
      .set(auth)
      .send({
        name: 'X',
        concept: '',
        sheet: { ...created.sheet, traits: { fuerza: 4, destreza: 4 } },
        updatedAt: created.updatedAt,
      })
      .expect(422);
    expect(res.body.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PRESUPUESTO_EXCEDIDO', path: 'attributes' }),
      ]),
    );
  });

  it('en una sala V5 las tiradas incluyen los dados de Hambre del personaje', async () => {
    const c = await completeV5Character();
    const room = (
      await http()
        .post('/api/v1/rooms')
        .set(auth)
        .send({ name: 'Anarquía', edition: 'v5' })
        .expect(201)
    ).body as RoomDetail;
    const link = (
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(auth)
        .send({ characterId: c.id })
        .expect(201)
    ).body as RoomCharacterInfo;
    expect(link.compliant).toBe(true);

    await http()
      .patch(`/api/v1/rooms/${room.id}/characters/${link.id}/state`)
      .set(auth)
      .send({ hunger: 3 })
      .expect(200);
    await http()
      .patch(`/api/v1/rooms/${room.id}/characters/${link.id}/state`)
      .set(auth)
      .send({ hunger: 6 })
      .expect(400);

    const pool = await http()
      .post(`/api/v1/rooms/${room.id}/dice-pool`)
      .set(auth)
      .send({ roomCharacterId: link.id, actionKey: 'golpear' })
      .expect(200);
    expect(pool.body).toMatchObject({ dice: 7, hungerDice: 3 });
    expect(pool.body.difficulty).toBeUndefined();

    const roll = (
      await http()
        .post(`/api/v1/rooms/${room.id}/rolls`)
        .set(auth)
        .send({ roomCharacterId: link.id, actionKey: 'golpear' })
        .expect(201)
    ).body as DiceRollRecord;
    expect(roll.result.dice).toHaveLength(4);
    expect(roll.result.hungerDice).toHaveLength(3);
    expect(['success', 'failure', 'critical', 'messy-critical', 'bestial-failure']).toContain(
      roll.result.outcome,
    );
  });

  it('una tirada libre en V5 acepta dados de Hambre', async () => {
    const room = (
      await http()
        .post('/api/v1/rooms')
        .set(auth)
        .send({ name: 'Libre', edition: 'v5' })
        .expect(201)
    ).body as RoomDetail;
    const roll = (
      await http()
        .post(`/api/v1/rooms/${room.id}/rolls`)
        .set(auth)
        .send({ dice: 5, hunger: 2 })
        .expect(201)
    ).body as DiceRollRecord;
    expect(roll.result.dice).toHaveLength(3);
    expect(roll.result.hungerDice).toHaveLength(2);
  });
});
