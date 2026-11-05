import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import {
  DEFAULT_ROOM_CONFIG,
  type DiceRollRecord,
  type RoomClientEvents,
  type RoomConfig,
  ROOMS_NAMESPACE,
  type RoomServerEvents,
} from '@vampiro/shared';
import { registerUser } from './utils/fixtures.js';
import { type Auth, roomScenario, type RoomScenario } from './utils/rooms.js';
import { createTestApp, resetDatabase, type TestApp } from './utils/test-app.js';

type RoomSocket = Socket<RoomServerEvents, RoomClientEvents>;

describe('WebSocket de salas (e2e)', () => {
  let t: TestApp;
  let baseUrl: string;
  let master: Auth;
  let player: Auth;
  let other: Auth;
  let s: RoomScenario;
  const sockets: RoomSocket[] = [];
  const http = () => request(t.app.getHttpServer());

  const tokenOf = (auth: Auth) => auth.Authorization.replace('Bearer ', '');

  function connect(token?: string): RoomSocket {
    const socket: RoomSocket = io(`${baseUrl}${ROOMS_NAMESPACE}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  }

  /** Conecta y entra en la sala; resuelve con el socket listo para recibir eventos. */
  async function joined(auth: Auth): Promise<RoomSocket> {
    const socket = connect(tokenOf(auth));
    const ack = await socket.timeout(3000).emitWithAck('room.join', { roomId: s.room.id });
    expect(ack).toEqual({ ok: true });
    return socket;
  }

  function next<E extends keyof RoomServerEvents>(
    socket: RoomSocket,
    event: E,
    ms = 3000,
  ): Promise<Parameters<RoomServerEvents[E]>[0]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`No llegó ${event}`)), ms);
      socket.once(
        event as never,
        ((payload: never) => {
          clearTimeout(timer);
          resolve(payload);
        }) as never,
      );
    });
  }

  /** Comprueba que un evento NO llega en `ms` milisegundos. */
  function silence(socket: RoomSocket, event: keyof RoomServerEvents, ms = 400): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = () => resolve(false);
      socket.once(event as never, handler as never);
      setTimeout(() => {
        socket.off(event as never, handler as never);
        resolve(true);
      }, ms);
    });
  }

  beforeAll(async () => {
    t = await createTestApp({ listen: true });
    const server = t.app.getHttpServer() as unknown as Server;
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
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

  afterEach(() => {
    while (sockets.length) sockets.pop()?.disconnect();
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('rechaza la conexión sin un token válido', async () => {
    const socket = connect('no-es-un-jwt');
    const error = await new Promise<Error>((resolve) => socket.once('connect_error', resolve));
    expect(error.message).toBe('NO_AUTENTICADO');
  });

  it('no deja entrar en una sala de la que no se es miembro', async () => {
    const stranger = await registerUser(t.app.getHttpServer(), 'ajena@example.com');
    const socket = connect(tokenOf(stranger));
    const ack = await socket.timeout(3000).emitWithAck('room.join', { roomId: s.room.id });
    expect(ack.ok).toBe(false);
  });

  it('difunde las tiradas creadas por REST', async () => {
    const masterSocket = await joined(master);
    const incoming = next(masterSocket, 'roll.created');
    const created = (
      await http()
        .post(`/api/v1/rooms/${s.room.id}/rolls`)
        .set(player)
        .send({ dice: 3 })
        .expect(201)
    ).body as DiceRollRecord;
    expect((await incoming).id).toBe(created.id);
  });

  it('con "solo master" la tirada llega al master y a quien tira, no al resto', async () => {
    await http()
      .patch(`/api/v1/rooms/${s.room.id}/config`)
      .set(master)
      .send({ ...DEFAULT_ROOM_CONFIG, diceVisibility: 'master-only' } satisfies RoomConfig)
      .expect(200);
    const [m, p, o] = await Promise.all([joined(master), joined(player), joined(other)]);
    const toMaster = next(m, 'roll.created');
    const toPlayer = next(p, 'roll.created');
    const otherSilent = silence(o, 'roll.created');

    await http().post(`/api/v1/rooms/${s.room.id}/rolls`).set(player).send({ dice: 2 }).expect(201);
    await Promise.all([toMaster, toPlayer]);
    expect(await otherSilent).toBe(true);
  });

  it('avisa de cambios de configuración, estado de fichas y miembros', async () => {
    const p = await joined(player);

    const config = next(p, 'room.config.updated');
    await http()
      .patch(`/api/v1/rooms/${s.room.id}/config`)
      .set(master)
      .send({ ...DEFAULT_ROOM_CONFIG, extraFreebies: 3 })
      .expect(200);
    expect((await config).extraFreebies).toBe(3);

    const updated = next(p, 'character.updated');
    await http()
      .patch(`/api/v1/rooms/${s.room.id}/characters/${s.masterChar.id}/state`)
      .set(master)
      .send({ damage: 1 })
      .expect(200);
    expect((await updated).state.damage).toBe(1);

    const left = next(p, 'member.left');
    const otherId = (
      await http().get(`/api/v1/rooms/${s.room.id}`).set(master).expect(200)
    ).body.members.find((m: { displayName: string }) => m.displayName === 'otra').userId;
    await http().delete(`/api/v1/rooms/${s.room.id}/members/${otherId}`).set(master).expect(204);
    expect((await left).userId).toBe(otherId);
  });

  it('quien sale de la sala deja de recibir sus eventos', async () => {
    const o = await joined(other);
    const otherId = (
      await http().get(`/api/v1/rooms/${s.room.id}`).set(master).expect(200)
    ).body.members.find((m: { displayName: string }) => m.displayName === 'otra').userId;
    await http().delete(`/api/v1/rooms/${s.room.id}/members/${otherId}`).set(other).expect(204);

    const silent = silence(o, 'roll.created');
    await http().post(`/api/v1/rooms/${s.room.id}/rolls`).set(player).send({ dice: 1 }).expect(201);
    expect(await silent).toBe(true);
  });
});
