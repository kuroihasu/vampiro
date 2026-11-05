import type { Character, CharacterSheet, RoomCharacterInfo, RoomDetail } from '@vampiro/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { COMPLETE_V20_SHEET } from './fixtures.js';

export type Auth = { Authorization: string };

/** Sala con master y jugadora; cada una con una ficha completa vinculada. */
export interface RoomScenario {
  room: RoomDetail;
  masterChar: RoomCharacterInfo;
  playerChar: RoomCharacterInfo;
}

export async function createCharacter(
  server: App,
  auth: Auth,
  sheet: CharacterSheet = COMPLETE_V20_SHEET,
): Promise<Character> {
  const created = (
    await request(server)
      .post('/api/v1/characters')
      .set(auth)
      .send({ edition: 'v20', name: 'Ficha' })
      .expect(201)
  ).body as Character;
  return (
    await request(server)
      .put(`/api/v1/characters/${created.id}`)
      .set(auth)
      .send({ name: 'Ficha', concept: '', sheet, updatedAt: created.updatedAt })
      .expect(200)
  ).body as Character;
}

export async function roomScenario(server: App, master: Auth, player: Auth): Promise<RoomScenario> {
  const room = (
    await request(server)
      .post('/api/v1/rooms')
      .set(master)
      .send({ name: 'Sala', edition: 'v20' })
      .expect(201)
  ).body as RoomDetail;
  await request(server)
    .post('/api/v1/rooms/join')
    .set(player)
    .send({ code: room.invite?.code })
    .expect(201);

  const link = async (auth: Auth) => {
    const c = await createCharacter(server, auth);
    return (
      await request(server)
        .post(`/api/v1/rooms/${room.id}/characters`)
        .set(auth)
        .send({ characterId: c.id })
        .expect(201)
    ).body as RoomCharacterInfo;
  };
  return { room, masterChar: await link(master), playerChar: await link(player) };
}
