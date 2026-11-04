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
  /** Nombre visible de cada grupo (p. ej. physical → Físicos). */
  groupLabels: Record<string, string>;
  /** Puntos por prioridad: primaria, secundaria, terciaria. */
  points: number[];
  /** Máximo por rasgo antes de gastar puntos gratuitos. */
  maxPerTraitAtCreation?: number;
}

/** Presupuesto fijo para una categoría (p. ej. 3 puntos de disciplinas en V20). */
export interface FixedBudget {
  category: 'discipline' | 'background' | 'virtue';
  points: number;
  /** Nombre visible del presupuesto (p. ej. Disciplinas). */
  label: string;
  /** Solo disciplinas de clan al crear. */
  clanOnly?: boolean;
}

export interface FreebieRules {
  total: number;
  /** Coste por punto según categoría. */
  costs: Partial<Record<string, number>>;
  /** Coste por rasgo concreto; tiene prioridad sobre `costs` (p. ej. Humanidad, Voluntad). */
  traitCosts?: Partial<Record<string, number>>;
}

/** Rasgos que no se reparten directamente sino que se calculan a partir de otros. */
export interface DerivedRules {
  /** Humanidad = suma de estas virtudes + gratuitos en `traitKey`. */
  humanity: { from: string[]; traitKey: string; max: number };
  /** Fuerza de Voluntad = suma de estas virtudes + gratuitos en `traitKey`. */
  willpower: { from: string[]; traitKey: string; max: number };
  /** Generación = base − puntos del trasfondo (sin bajar de `min`). */
  generation: { base: number; min: number; backgroundKey: string };
  /** Reserva de sangre por generación. */
  bloodPool: Record<number, { max: number; perTurn: number }>;
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
  derived?: DerivedRules;
  dice: DiceSystem;
  actions: SuggestedAction[];
}
