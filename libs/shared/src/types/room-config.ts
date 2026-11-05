/** Configuración de una sala, elegida por el master (columna JSONB `Room.config`). */
export interface DisciplineRule {
  discipline: string;
  players: boolean;
  npc: boolean;
}

export interface RoomConfig {
  allowMeritsFlaws: boolean;
  maxFlawPoints?: number;
  /** Disciplinas restringidas, p. ej. Temporis: jugadores no, NPC sí. */
  disciplineRules: DisciplineRule[];
  /** `'all'` o la lista de claves de clan permitidas. */
  allowedClans: 'all' | string[];
  minGeneration?: number;
  maxGeneration?: number;
  extraFreebies: number;
  diceVisibility: 'all' | 'master-only';
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  allowMeritsFlaws: true,
  disciplineRules: [],
  allowedClans: 'all',
  extraFreebies: 0,
  diceVisibility: 'all',
};
