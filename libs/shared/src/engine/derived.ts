import type { CharacterSheet } from '../types/character.js';
import type { Ruleset } from '../types/ruleset.js';
import { traitTotal } from './traits.js';

export interface DerivedStats {
  humanity: number;
  willpower: number;
  generation: number;
  /** V20: reserva de sangre (0 en ediciones que usan Hambre). */
  bloodPoolMax: number;
  bloodPerTurn: number;
  /** V5: niveles de salud (sin valor, 7 niveles fijos). */
  health?: number;
  bloodPotency?: number;
  hungerMax?: number;
  /** Nombre de la moral si no es la Humanidad (p. ej. "Camino de los Reyes"). */
  moralityName?: string;
}

/**
 * Valores calculados de la ficha (Humanidad, Voluntad, generación y sangre).
 * `undefined` si la edición no define rasgos derivados.
 */
export function deriveStats(sheet: CharacterSheet, ruleset: Ruleset): DerivedStats | undefined {
  const rules = ruleset.derived;
  if (!rules) return undefined;

  const sum = (keys: string[]) => keys.reduce((n, k) => n + traitTotal(sheet, ruleset, k), 0);
  const backgroundKey = rules.generation.backgroundKey;
  const generation = Math.max(
    rules.generation.min,
    rules.generation.base - (backgroundKey ? traitTotal(sheet, ruleset, backgroundKey) : 0),
  );
  const blood = rules.bloodPool?.[generation] ?? { max: 0, perTurn: 0 };

  // Edad Oscura: la moral suma las dos virtudes del Camino elegido.
  const road = ruleset.roads?.options.find((r) => r.key === sheet.road);
  const moralityFrom = ruleset.roads ? (road?.virtues ?? []) : rules.humanity.from;

  return {
    ...(road ? { moralityName: road.name } : {}),
    humanity:
      (rules.humanity.base ?? 0) +
      sum(moralityFrom) +
      traitTotal(sheet, ruleset, rules.humanity.traitKey),
    willpower: sum(rules.willpower.from) + traitTotal(sheet, ruleset, rules.willpower.traitKey),
    generation,
    bloodPoolMax: blood.max,
    bloodPerTurn: blood.perTurn,
    ...(rules.health ? { health: sum(rules.health.from) + rules.health.bonus } : {}),
    ...(rules.bloodPotency ? { bloodPotency: rules.bloodPotency.base } : {}),
    ...(rules.hunger ? { hungerMax: rules.hunger.max } : {}),
  };
}
