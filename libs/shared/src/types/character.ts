import type { EditionId } from '../editions.js';

export type CharacterStatus = 'draft' | 'complete';

/** Prioridad elegida para un grupo: 0 = primaria, 1 = secundaria, 2 = terciaria. */
export type PriorityChoice = Record<string, number>;

export interface FreebiePurchase {
  traitKey: string;
  /** Puntos comprados. */
  dots: number;
}

/**
 * Hoja de personaje tal como se guarda (columna JSONB `Character.sheet`).
 * Un mapa de clave de rasgo a puntos, más las decisiones de creación.
 */
export interface CharacterSheet {
  clan?: string;
  generation?: number;
  /** Prioridades por categoría: { attribute: { physical: 0, social: 1, mental: 2 } }. */
  priorities: Partial<Record<'attribute' | 'ability', PriorityChoice>>;
  /** Puntos repartidos con el presupuesto de creación, por clave de rasgo. */
  traits: Record<string, number>;
  /** Compras con puntos gratuitos, como lista para poder deshacerlas. */
  freebies: FreebiePurchase[];
}

export interface Character {
  id: string;
  ownerId: string;
  edition: EditionId;
  rulesetVersion: string;
  name: string;
  concept?: string;
  status: CharacterStatus;
  sheet: CharacterSheet;
  createdAt: string;
  updatedAt: string;
}

export function emptySheet(): CharacterSheet {
  return { priorities: {}, traits: {}, freebies: [] };
}
