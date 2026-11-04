import request from 'supertest';
import type {
  Character,
  CharacterSheet,
  InvitePreview,
  RoomDetail,
  RoomSummary,
} from '@vampiro/shared';
import { DEFAULT_ROOM_CONFIG } from '@vampiro/shared';
import { COMPLETE_V20_SHEET, registerUser } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

type Auth = { Authorization: string };

describe('Rooms (e2e)', () => {
  let t: TestApp;
  let master: Auth;
  let player: Auth;
  let stranger: Auth;
  const http = () => request(t.app.getHttpServer());

  const createRoom = (
    auth: Auth = master,
    body: object = { name: 'Chicago by Night', edition: 'v20' },
  ) => http().post('/api/v1/rooms').set(auth).send(body);

  const detail = async (roomId: string, auth: Auth = master) =>
    (await http().get(`/api/v1/rooms/${roomId}`).set(auth).expect(200)).body as RoomDetail;

  /** Crea una ficha del usuario y le guarda la hoja indicada. */
  async function characterWith(
    auth: Auth,
    sheet: CharacterSheet,
    edition = 'v20',
  ): Promise<Character> {
    const created = (
      await http().post('/api/v1/characters').set(auth).send({ edition, name: 'Ficha' }).expect(201)
    ).body as Character;
    const saved = await http()
      .put(`/api/v1/characters/${created.id}`)
      .set(auth)
      .send({ name: 'Ficha', concept: '', sheet, updatedAt: created.updatedAt })
      .expect(200);
    return saved.body as Character;
  }

  async function joinAsPlayer(roomId: string): Promise<void> {
    const { invite } = await detail(roomId);
    await http().post('/api/v1/rooms/join').set(player).send({ code: invite?.code }).expect(201);
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    const server = t.app.getHttpServer();
    master = await registerUser(server, 'master@example.com');
    player = await registerUser(server, 'jugadora@example.com');
    stranger = await registerUser(server, 'ajeno@example.com');
  });

  afterAll(async () => {
    await t.app.close();
  });

  describe('crear y listar', () => {
    it('quien crea la sala es su master y recibe un código de invitación', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      expect(room).toMatchObject({ name: 'Chicago by Night', edition: 'v20', myRole: 'master' });
      expect(room.config).toEqual(DEFAULT_ROOM_CONFIG);
      expect(room.invite?.code).toMatch(/^[A-Z2-9]{8}$/);
      expect(room.members).toEqual([expect.objectContaining({ role: 'master' })]);
    });

    it('rechaza una edición sin reglas y una configuración inválida', async () => {
      const v5 = await createRoom(master, { name: 'X', edition: 'v5' }).expect(422);
      expect(v5.body.code).toBe('EDICION_NO_DISPONIBLE');
      const bad = await createRoom(master, {
        name: 'X',
        edition: 'v20',
        config: { ...DEFAULT_ROOM_CONFIG, extraFreebies: -3 },
      }).expect(400);
      expect(bad.body.code).toBe('VALIDATION_ERROR');
    });

    it('GET /rooms lista solo las salas donde soy miembro', async () => {
      await createRoom().expect(201);
      await createRoom(stranger, { name: 'Otra', edition: 'v20' }).expect(201);
      const res = await http().get('/api/v1/rooms').set(master).expect(200);
      expect((res.body as RoomSummary[]).map((r) => [r.name, r.myRole, r.memberCount])).toEqual([
        ['Chicago by Night', 'master', 1],
      ]);
    });
  });

  describe('acceso', () => {
    it('un no miembro recibe 404 y un jugador no ve el código de invitación', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await http().get(`/api/v1/rooms/${room.id}`).set(stranger).expect(404);
      await joinAsPlayer(room.id);
      const asPlayer = await detail(room.id, player);
      expect(asPlayer.myRole).toBe('player');
      expect(asPlayer.invite).toBeUndefined();
    });

    it('solo el master cambia la configuración (403 PROHIBIDO)', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const res = await http()
        .patch(`/api/v1/rooms/${room.id}/config`)
        .set(player)
        .send(DEFAULT_ROOM_CONFIG)
        .expect(403);
      expect(res.body.code).toBe('PROHIBIDO');
    });
  });

  describe('invitaciones', () => {
    it('la vista previa del código no exige sesión', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      const res = await http().get(`/api/v1/rooms/invite/${room.invite?.code}`).expect(200);
      expect(res.body as InvitePreview).toMatchObject({
        roomName: 'Chicago by Night',
        edition: 'v20',
        memberCount: 1,
      });
    });

    it('un código inexistente responde INVITACION_INVALIDA (404)', async () => {
      const res = await http()
        .post('/api/v1/rooms/join')
        .set(player)
        .send({ code: 'ZZZZZZZZ' })
        .expect(404);
      expect(res.body.code).toBe('INVITACION_INVALIDA');
    });

    it('unirse dos veces responde YA_ES_MIEMBRO (409)', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const res = await http()
        .post('/api/v1/rooms/join')
        .set(player)
        .send({ code: room.invite?.code })
        .expect(409);
      expect(res.body.code).toBe('YA_ES_MIEMBRO');
    });

    it('regenerar el código invalida el anterior; un código caducado responde 410', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      const fresh = await http()
        .post(`/api/v1/rooms/${room.id}/invite-code`)
        .set(master)
        .send({ expiresInHours: 1 })
        .expect(201);
      expect(fresh.body.code).not.toBe(room.invite?.code);
      await http()
        .post('/api/v1/rooms/join')
        .set(player)
        .send({ code: room.invite?.code })
        .expect(404);

      await t.prisma.room.update({
        where: { id: room.id },
        data: { inviteExpiresAt: new Date(Date.now() - 1000) },
      });
      const expired = await http()
        .post('/api/v1/rooms/join')
        .set(player)
        .send({ code: fresh.body.code })
        .expect(410);
      expect(expired.body.code).toBe('INVITACION_VENCIDA');
    });
  });

  describe('miembros', () => {
    it('el master expulsa a un jugador; un jugador puede irse; el master no puede irse', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const playerId = (await detail(room.id)).members.find((m) => m.role === 'player')!.userId;

      await http()
        .delete(`/api/v1/rooms/${room.id}/members/${room.masterId}`)
        .set(master)
        .expect(403);
      await http().delete(`/api/v1/rooms/${room.id}/members/${playerId}`).set(master).expect(204);
      await http().get(`/api/v1/rooms/${room.id}`).set(player).expect(404);

      await joinAsPlayer(room.id);
      await http().delete(`/api/v1/rooms/${room.id}/members/${playerId}`).set(player).expect(204);
    });

    it('un jugador no puede expulsar a otro', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      await http()
        .delete(`/api/v1/rooms/${room.id}/members/${room.masterId}`)
        .set(player)
        .expect(403);
    });
  });

  describe('fichas en la sala', () => {
    it('vincula una ficha completa y la marca como válida', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const character = await characterWith(player, COMPLETE_V20_SHEET);
      const res = await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(player)
        .send({ characterId: character.id })
        .expect(201);
      expect(res.body).toMatchObject({ characterId: character.id, compliant: true, isNpc: false });
    });

    it('un borrador se vincula pero queda marcado como no válido, con el motivo', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      const draft = await characterWith(master, { priorities: {}, traits: {}, freebies: [] });
      const res = await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(master)
        .send({ characterId: draft.id })
        .expect(201);
      expect(res.body.compliant).toBe(false);
      expect(res.body.violations.length).toBeGreaterThan(0);
    });

    it('no se puede vincular la ficha de otro ni la misma ficha dos veces', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const mine = await characterWith(master, COMPLETE_V20_SHEET);
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(player)
        .send({ characterId: mine.id })
        .expect(404);
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(master)
        .send({ characterId: mine.id })
        .expect(201);
      const dup = await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(master)
        .send({ characterId: mine.id })
        .expect(409);
      expect(dup.body.code).toBe('FICHA_YA_VINCULADA');
    });

    it('solo el master puede llevar NPC', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const c = await characterWith(player, COMPLETE_V20_SHEET);
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(player)
        .send({ characterId: c.id, isNpc: true })
        .expect(403);
    });

    it('al cambiar la configuración se re-evalúan las fichas; un NPC puede usar lo vetado', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const sheet: CharacterSheet = {
        ...COMPLETE_V20_SHEET,
        freebies: [{ traitKey: 'temporis', dots: 1 }],
      };
      const pc = await characterWith(player, sheet);
      const npc = await characterWith(master, sheet);
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(player)
        .send({ characterId: pc.id })
        .expect(201);
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(master)
        .send({ characterId: npc.id, isNpc: true })
        .expect(201);

      await http()
        .patch(`/api/v1/rooms/${room.id}/config`)
        .set(master)
        .send({
          ...DEFAULT_ROOM_CONFIG,
          disciplineRules: [{ discipline: 'temporis', players: false, npc: true }],
        })
        .expect(200);

      const after = await detail(room.id);
      const byChar = Object.fromEntries(after.characters.map((c) => [c.characterId, c]));
      expect(byChar[pc.id]?.compliant).toBe(false);
      expect(byChar[pc.id]?.violations.map((v) => v.code)).toContain('DISCIPLINA_NO_PERMITIDA');
      expect(byChar[npc.id]?.compliant).toBe(true);
    });

    it('rechaza una ficha de otra edición (EDICION_INCOMPATIBLE)', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      const c = await characterWith(master, COMPLETE_V20_SHEET);
      await t.prisma.character.update({ where: { id: c.id }, data: { edition: 'v5' } });
      const res = await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(master)
        .send({ characterId: c.id })
        .expect(422);
      expect(res.body.code).toBe('EDICION_INCOMPATIBLE');
    });

    it('el master cambia el tipo y quien la controla puede retirarla', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      await joinAsPlayer(room.id);
      const c = await characterWith(player, COMPLETE_V20_SHEET);
      const linked = (
        await http()
          .post(`/api/v1/rooms/${room.id}/characters`)
          .set(player)
          .send({ characterId: c.id })
          .expect(201)
      ).body;
      await http()
        .patch(`/api/v1/rooms/${room.id}/characters/${linked.id}`)
        .set(player)
        .send({ isNpc: true })
        .expect(403);
      const patched = await http()
        .patch(`/api/v1/rooms/${room.id}/characters/${linked.id}`)
        .set(master)
        .send({ isNpc: true })
        .expect(200);
      expect(patched.body.isNpc).toBe(true);
      await http()
        .delete(`/api/v1/rooms/${room.id}/characters/${linked.id}`)
        .set(player)
        .expect(204);
      expect((await detail(room.id)).characters).toEqual([]);
    });

    it('al guardar la ficha se actualiza su validez en la sala', async () => {
      const room = (await createRoom().expect(201)).body as RoomDetail;
      const draft = await characterWith(master, { priorities: {}, traits: {}, freebies: [] });
      await http()
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(master)
        .send({ characterId: draft.id })
        .expect(201);
      await http()
        .put(`/api/v1/characters/${draft.id}`)
        .set(master)
        .send({ name: 'Ficha', concept: '', sheet: COMPLETE_V20_SHEET, updatedAt: draft.updatedAt })
        .expect(200);
      expect((await detail(room.id)).characters[0]?.compliant).toBe(true);
    });
  });
});
