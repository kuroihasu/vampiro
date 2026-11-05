import request from 'supertest';
import { DEFAULT_ROOM_CONFIG, type DiceRollRecord, type RollsPage } from '@vampiro/shared';
import { registerUser } from './utils/fixtures.js';
import { type Auth, roomScenario, type RoomScenario } from './utils/rooms.js';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

describe('Dados y estado en partida (e2e)', () => {
  let t: TestApp;
  let master: Auth;
  let player: Auth;
  let other: Auth;
  let s: RoomScenario;
  const http = () => request(t.app.getHttpServer());
  const url = (path: string) => `/api/v1/rooms/${s.room.id}${path}`;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    const server = t.app.getHttpServer();
    master = await registerUser(server, 'master@example.com');
    player = await registerUser(server, 'jugadora@example.com');
    other = await registerUser(server, 'otra@example.com');
    s = await roomScenario(server, master, player);
    await http()
      .post('/api/v1/rooms/join')
      .set(other)
      .send({ code: s.room.invite?.code })
      .expect(201);
  });

  afterAll(async () => {
    await t.app.close();
  });

  describe('POST /rooms/:id/dice-pool', () => {
    it('calcula la reserva desde la ficha: Destreza 3 + Pelea 3', async () => {
      const res = await http()
        .post(url('/dice-pool'))
        .set(player)
        .send({ roomCharacterId: s.playerChar.id, traits: ['destreza', 'pelea'], difficulty: 7 })
        .expect(200);
      expect(res.body).toMatchObject({ dice: 6, difficulty: 7 });
    });

    it('acepta una acción sugerida del ruleset y un modificador', async () => {
      const res = await http()
        .post(url('/dice-pool'))
        .set(player)
        .send({ roomCharacterId: s.playerChar.id, actionKey: 'golpear', modifier: -2 })
        .expect(200);
      expect(res.body.dice).toBe(4);
    });

    it('un jugador no puede tirar con la ficha de otro; el master sí', async () => {
      await http()
        .post(url('/dice-pool'))
        .set(other)
        .send({ roomCharacterId: s.playerChar.id, traits: ['fuerza'] })
        .expect(403);
      await http()
        .post(url('/dice-pool'))
        .set(master)
        .send({ roomCharacterId: s.playerChar.id, traits: ['fuerza'] })
        .expect(200);
    });

    it('rechaza rasgos o acciones que no existen', async () => {
      const res = await http()
        .post(url('/dice-pool'))
        .set(player)
        .send({ roomCharacterId: s.playerChar.id, traits: ['telepatia'] })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /rooms/:id/rolls', () => {
    it('tira en el servidor y guarda una tirada coherente con su reserva', async () => {
      const res = await http()
        .post(url('/rolls'))
        .set(player)
        .send({ roomCharacterId: s.playerChar.id, traits: ['destreza', 'pelea'], difficulty: 6 })
        .expect(201);
      const roll = res.body as DiceRollRecord;
      expect(roll.result.dice).toHaveLength(6);
      expect(roll.result.dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 10)).toBe(true);
      const hits = roll.result.dice.filter((d) => d >= 6).length;
      const ones = roll.result.dice.filter((d) => d === 1).length;
      expect(roll.result.successes).toBe(Math.max(0, hits - ones));
      expect(roll).toMatchObject({
        label: 'Destreza + Pelea',
        userName: 'jugadora',
        visibility: 'all',
      });
    });

    it('permite tiradas libres sin ficha', async () => {
      const res = await http().post(url('/rolls')).set(other).send({ dice: 4 }).expect(201);
      expect(res.body.result.dice).toHaveLength(4);
    });

    it('rechaza tiradas sin reserva o con demasiados dados', async () => {
      await http().post(url('/rolls')).set(other).send({}).expect(400);
      await http().post(url('/rolls')).set(other).send({ dice: 99 }).expect(400);
    });

    it('quien no es miembro recibe 404', async () => {
      const stranger = await registerUser(t.app.getHttpServer(), 'ajena@example.com');
      await http().post(url('/rolls')).set(stranger).send({ dice: 3 }).expect(404);
    });

    it('limita las tiradas por persona (DEMASIADAS_SOLICITUDES)', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) {
        statuses.push((await http().post(url('/rolls')).set(other).send({ dice: 1 })).status);
      }
      expect(statuses.slice(0, 10).every((code) => code === 201)).toBe(true);
      expect(statuses[10]).toBe(429);
    });
  });

  describe('GET /rooms/:id/rolls', () => {
    it('devuelve el historial de la más nueva a la más antigua, por páginas', async () => {
      for (const dice of [1, 2, 3]) {
        await http().post(url('/rolls')).set(player).send({ dice }).expect(201);
      }
      const first = (await http().get(url('/rolls?limit=2')).set(master).expect(200))
        .body as RollsPage;
      expect(first.items.map((r) => r.result.dice.length)).toEqual([3, 2]);
      expect(first.nextCursor).toEqual(expect.any(String));

      const second = (
        await http()
          .get(url(`/rolls?limit=2&cursor=${first.nextCursor}`))
          .set(master)
          .expect(200)
      ).body as RollsPage;
      expect(second.items.map((r) => r.result.dice.length)).toEqual([1]);
      expect(second.nextCursor).toBeUndefined();
    });

    it('con visibilidad "solo master", cada jugador ve solo sus tiradas', async () => {
      await http()
        .patch(url('/config'))
        .set(master)
        .send({ ...DEFAULT_ROOM_CONFIG, diceVisibility: 'master-only' })
        .expect(200);
      await http().post(url('/rolls')).set(player).send({ dice: 2 }).expect(201);

      const asMaster = (await http().get(url('/rolls')).set(master).expect(200)).body as RollsPage;
      const asPlayer = (await http().get(url('/rolls')).set(player).expect(200)).body as RollsPage;
      const asOther = (await http().get(url('/rolls')).set(other).expect(200)).body as RollsPage;
      expect(asMaster.items).toHaveLength(1);
      expect(asPlayer.items).toHaveLength(1);
      expect(asOther.items).toHaveLength(0);
    });
  });

  describe('PATCH /rooms/:id/characters/:linkId/state', () => {
    it('quien controla la ficha actualiza su estado; los derivados dan los máximos', async () => {
      const res = await http()
        .patch(url(`/characters/${s.playerChar.id}/state`))
        .set(player)
        .send({ damage: 2, willpowerSpent: 1, blood: 7 })
        .expect(200);
      expect(res.body.state).toMatchObject({ damage: 2, willpowerSpent: 1, blood: 7 });
      expect(res.body.derived).toMatchObject({ willpower: 5, bloodPoolMax: 10 });
    });

    it('el master también puede; otro jugador no', async () => {
      await http()
        .patch(url(`/characters/${s.playerChar.id}/state`))
        .set(master)
        .send({ notes: 'Herida de estaca' })
        .expect(200);
      await http()
        .patch(url(`/characters/${s.playerChar.id}/state`))
        .set(other)
        .send({ damage: 1 })
        .expect(403);
    });

    it('valida los rangos (salud 0-7, sangre hasta su máximo)', async () => {
      await http()
        .patch(url(`/characters/${s.playerChar.id}/state`))
        .set(player)
        .send({ damage: 9 })
        .expect(400);
      const res = await http()
        .patch(url(`/characters/${s.playerChar.id}/state`))
        .set(player)
        .send({ blood: 11 })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
