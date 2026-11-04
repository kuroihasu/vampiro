import type { DerivedStats } from '../engine/derived.js';
import type { EditionId } from '../editions.js';
import type { RuleViolation } from '../errors/violation.js';
import type { CharacterStatus } from './character.js';
import type { RoomConfig } from './room-config.js';

export type RoomRole = 'master' | 'player';

/** Estado de un personaje durante la partida (lo edita el master o quien lo controla). */
export interface CharacterState {
  /** Niveles de salud perdidos (0 = ileso). */
  damage: number;
  /** Fuerza de Voluntad gastada. */
  willpowerSpent: number;
  /** Puntos de sangre actuales. */
  blood: number;
  notes: string;
}

export interface RoomSummary {
  id: string;
  name: string;
  edition: EditionId;
  myRole: RoomRole;
  memberCount: number;
  createdAt: string;
}

export interface RoomMemberInfo {
  userId: string;
  displayName: string;
  role: RoomRole;
  joinedAt: string;
}

export interface RoomCharacterInfo {
  id: string;
  characterId: string;
  name: string;
  clan?: string;
  status: CharacterStatus;
  /** Usuario que lo maneja en la sala. */
  controlledBy: string;
  controllerName: string;
  isNpc: boolean;
  /** Cumple las reglas de la edición y la configuración de la sala. */
  compliant: boolean;
  /** Errores que impiden cumplir (vacío si compliant). */
  violations: RuleViolation[];
  state: Partial<CharacterState>;
  /** Máximos de la ficha (Voluntad, sangre) para el estado en partida. */
  derived?: DerivedStats;
}

export interface RoomDetail {
  id: string;
  name: string;
  edition: EditionId;
  masterId: string;
  myRole: RoomRole;
  config: RoomConfig;
  /** Solo lo ve el master. */
  invite?: { code: string; expiresAt?: string };
  members: RoomMemberInfo[];
  characters: RoomCharacterInfo[];
  createdAt: string;
}

export interface CreateRoomRequest {
  name: string;
  edition: EditionId;
  config?: RoomConfig;
}

export interface InviteCodeRequest {
  /** Horas de validez; sin valor, el código no caduca. */
  expiresInHours?: number;
}

export interface InvitePreview {
  roomId: string;
  roomName: string;
  edition: EditionId;
  masterName: string;
  memberCount: number;
  alreadyMember: boolean;
}

export interface JoinRoomRequest {
  code: string;
}

export interface LinkCharacterRequest {
  characterId: string;
  isNpc?: boolean;
}

export interface UpdateRoomCharacterRequest {
  isNpc?: boolean;
}

export const ROOM_NAME_MAX_LENGTH = 60;
