import request from 'supertest';
import type { Character, DiceRollRecord, RoomCharacterInfo, RoomDetail } from '@vampiro/shared';
import { COMPLETE_DARK_AGES_SHEET, registerUser } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

describe('Edad Oscura de punta a punta (e2e)', () => {
  let t: TestApp;
  let auth: { Authorization: string };
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    auth = await registerUser(t.app.getHttpServer(), 'medieval@example.com');
  });

  afterAll(async () => {
    await t.app.close();
  });

  async function newCharacter(): Promise<Character> {
    return (
      await http()
        .post('/api/v1/characters')
        .set(auth)
        .send({ edition: 'dark-ages', name: 'Ramiro' })
        .expect(201)
    ).body as Character;
  }

  it('crea y completa una ficha; la moral es su Camino', async () => {
    const created = await newCharacter();
    const saved = (
      await http()
        .put(`/api/v1/characters/${created.id}`)
        .set(auth)
        .send({
          name: 'Ramiro',
          concept: '',
          sheet: COMPLETE_DARK_AGES_SHEET,
          updatedAt: created.updatedAt,
        })
        .expect(200)
    ).body as Character;
    await http().post(`/api/v1/characters/${saved.id}/complete`).set(auth).expect(200);
    const evaluation = await http()
      .post(`/api/v1/characters/${saved.id}/evaluate`)
      .set(auth)
      .send({})
      .expect(200);
    expect(evaluation.body.derived).toMatchObject({
      humanity: 7,
      moralityName: 'Camino de los Reyes',
      generation: 12,
    });
  });

  it('rechaza virtudes de otro Camino', async () => {
    const created = await newCharacter();
    const res = await http()
      .put(`/api/v1/characters/${created.id}`)
      .set(auth)
      .send({
        name: 'Ramiro',
        concept: '',
        sheet: { ...created.sheet, road: 'reyes', traits: { conciencia: 1 } },
        updatedAt: created.updatedAt,
      })
      .expect(422);
    expect(res.body.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'REQUISITO_NO_CUMPLIDO', path: 'conciencia' }),
      ]),
    );
  });

  it('en una sala de Edad Oscura se tira contra dificultad', async () => {
    const created = await newCharacter();
    const saved = (
      await http()
        .put(`/api/v1/characters/${created.id}`)
        .set(auth)
        .send({
          name: 'Ramiro',
          concept: '',
          sheet: COMPLETE_DARK_AGES_SHEET,
          updatedAt: created.updatedAt,
        })
        .expect(200)
    ).body as Character;
    const room = (
      await http()
        .post('/api/v1/rooms')
        .set(auth)
        .send({ name: 'Castilla, 1230', edition: 'dark-ages' })
        .expect(201)
    ).body as RoomDetail;
    const link = (
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(auth)
        .send({ characterId: saved.id })
        .expect(201)
    ).body as RoomCharacterInfo;
    expect(link.compliant).toBe(true);
    const roll = (
      await http()
        .post(`/api/v1/rooms/${room.id}/rolls`)
        .set(auth)
        .send({ roomCharacterId: link.id, actionKey: 'arengar', difficulty: 7 })
        .expect(201)
    ).body as DiceRollRecord;
    expect(roll.result.dice).toHaveLength(7);
    expect(roll.result.difficulty).toBe(7);
  });
});
