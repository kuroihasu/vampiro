import type { EditionId } from '../editions.js';
import type { TraitDefinition } from './trait.js';

export interface ClanDefinition {
  key: string;
  name: string;
  disciplines: string[];
  weakness: string;
}

/**
 * Presupuesto de creación para una categoría repartida por prioridades
 * (p. ej. atributos en V20: el jugador asigna 7/5/3 a físicos, sociales y mentales).
 */
export interface PriorityBudget {
  category: 'attribute' | 'ability';
  /** Grupos entre los que se reparten las prioridades. */
  groups: string[];
  /** Puntos por prioridad: primaria, secundaria, terciaria. */
  points: number[];
  /** Máximo por rasgo antes de gastar puntos gratuitos. */
  maxPerTraitAtCreation?: number;
}

/** Presupuesto fijo para una categoría (p. ej. 3 puntos de disciplinas en V20). */
export interface FixedBudget {
  category: 'discipline' | 'background' | 'virtue';
  points: number;
  /** Solo disciplinas de clan al crear. */
  clanOnly?: boolean;
}

export interface FreebieRules {
  total: number;
  /** Coste por punto según categoría. */
  costs: Partial<Record<string, number>>;
}

export interface MeritsFlawsRules {
  maxFlawPoints: number;
}

export type DiceSystem =
  /** V20 / Revisada / Edad Oscura: d10 contra dificultad, los unos restan éxitos. */
  | { kind: 'difficulty'; minDifficulty: number; maxDifficulty: number; onesCancel: boolean }
  /** V5: éxitos a 6+, pares de 10 = crítico, dados de Hambre. */
  | { kind: 'success-threshold'; threshold: number; hungerDice: boolean };

export interface SuggestedAction {
  key: string;
  label: string;
  traits: [string, string];
}

/** Reglas completas de una edición. Son datos: el motor las interpreta. */
export interface Ruleset {
  edition: EditionId;
  /** Se guarda en cada ficha para saber con qué reglas se validó. */
  version: string;
  catalog: TraitDefinition[];
  clans: ClanDefinition[];
  creation: {
    priorities: PriorityBudget[];
    fixed: FixedBudget[];
  };
  freebies?: FreebieRules;
  meritsFlaws?: MeritsFlawsRules;
  dice: DiceSystem;
  actions: SuggestedAction[];
}
