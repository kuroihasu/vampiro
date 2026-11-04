import type { RollResult } from '../engine/resolve-roll.js';
import type { DicePool } from './dice.js';
import type { RoomConfig } from './room-config.js';
import type { CharacterState, RoomCharacterInfo, RoomMemberInfo } from './room.js';

/** Una tirada guardada. Es inmutable: no se edita ni se borra. */
export interface DiceRollRecord {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  roomCharacterId?: string;
  characterName?: string;
  label: string;
  pool: DicePool;
  result: RollResult;
  /** Visibilidad con la que se hizo (la de la sala en ese momento). */
  visibility: 'all' | 'master-only';
  createdAt: string;
}

/**
 * Pedir una reserva o una tirada. Con `roomCharacterId` la reserva sale de la ficha
 * (rasgos o acción sugerida); sin él, es una tirada libre de `dice` dados.
 */
export interface RoomDicePoolRequest {
  roomCharacterId?: string;
  /** Acción sugerida del ruleset (p. ej. "golpear"); tiene prioridad sobre `traits`. */
  actionKey?: string;
  traits?: string[];
  modifier?: number;
  difficulty?: number;
  /** Tirada libre: número de dados. */
  dice?: number;
}

export interface RollRequest extends RoomDicePoolRequest {
  /** Texto que verá la mesa; si falta se genera ("Destreza + Pelea"). */
  label?: string;
}

export interface RollsPage {
  items: DiceRollRecord[];
  /** Pasa este valor como ?cursor= para la página siguiente (más antigua). */
  nextCursor?: string;
}

export type UpdateCharacterStateRequest = Partial<CharacterState>;

export const MAX_DICE = 30;
export const HEALTH_LEVELS = [
  'Magullado',
  'Lastimado',
  'Lesionado',
  'Herido',
  'Malherido',
  'Tullido',
  'Incapacitado',
] as const;

/** Espacio de nombres del WebSocket de salas. */
export const ROOMS_NAMESPACE = '/rooms';

/** Eventos que el servidor envía a los clientes de una sala. */
export interface RoomServerEvents {
  'member.joined': (member: RoomMemberInfo) => void;
  'member.left': (payload: { userId: string }) => void;
  'character.linked': (character: RoomCharacterInfo) => void;
  'character.updated': (character: RoomCharacterInfo) => void;
  'character.unlinked': (payload: { id: string }) => void;
  'room.config.updated': (config: RoomConfig) => void;
  'roll.created': (roll: DiceRollRecord) => void;
}

/** Eventos que el cliente envía. */
export interface RoomClientEvents {
  'room.join': (
    payload: { roomId: string },
    ack: (result: { ok: boolean; error?: string }) => void,
  ) => void;
}
