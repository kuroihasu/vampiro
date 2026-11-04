import type { EditionId } from '../editions.js';

export type CharacterStatus = 'draft' | 'complete';

/** Prioridad elegida para un grupo: 0 = primaria, 1 = secundaria, 2 = terciaria. */
export type PriorityChoice = Record<string, number>;

export interface Specialty {
  skill: string;
  name: string;
}

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
  /** Prioridades por categoría: { attribute: { physical: 0, social: 1, mental: 2 } }. */
  priorities: Partial<Record<'attribute' | 'ability', PriorityChoice>>;
  /** Puntos repartidos con el presupuesto de creación, por clave de rasgo. */
  traits: Record<string, number>;
  /** Compras con puntos gratuitos, como lista para poder deshacerlas. */
  freebies: FreebiePurchase[];
  /** Claves de los méritos y defectos elegidos (se pagan o devuelven puntos gratuitos). */
  meritsFlaws?: string[];
  /** Distribución elegida en los presupuestos por patrón (V5), p. ej. { skills: 'equilibrada' }. */
  patternChoices?: Record<string, string>;
  /** Especialidades de habilidad (V5). */
  specialties?: Specialty[];
  /** Camino elegido (Edad Oscura). */
  road?: string;
}

export interface Character {
  id: string;
  ownerId: string;
  edition: EditionId;
  rulesetVersion: string;
  name: string;
  concept: string;
  clan?: string;
  status: CharacterStatus;
  sheet: CharacterSheet;
  createdAt: string;
  /** También es la versión para el control optimista: se reenvía al guardar. */
  updatedAt: string;
}

export type CharacterSummary = Omit<Character, 'sheet' | 'ownerId' | 'rulesetVersion'>;

export interface CreateCharacterRequest {
  edition: EditionId;
  name: string;
  concept?: string;
}

export interface UpdateCharacterRequest {
  name: string;
  concept: string;
  sheet: CharacterSheet;
  /** `updatedAt` de la versión que se editó. Si no coincide: 409 CONFLICTO_VERSION. */
  updatedAt: string;
}

export interface EvaluateCharacterRequest {
  /** Ficha candidata; si falta se evalúa la guardada. */
  sheet?: CharacterSheet;
  mode?: 'draft' | 'complete';
}

export const CHARACTER_NAME_MAX_LENGTH = 60;
export const CHARACTER_CONCEPT_MAX_LENGTH = 120;

export function emptySheet(): CharacterSheet {
  return { priorities: {}, traits: {}, freebies: [] };
}
