import type { CharacterSheet } from '../types/character.js';
import type { Ruleset } from '../types/ruleset.js';
import { traitTotal } from './traits.js';

export interface DerivedStats {
  humanity: number;
  willpower: number;
  generation: number;
  bloodPoolMax: number;
  bloodPerTurn: number;
}

/**
 * Valores calculados de la ficha (Humanidad, Voluntad, generación y sangre).
 * `undefined` si la edición no define rasgos derivados.
 */
export function deriveStats(sheet: CharacterSheet, ruleset: Ruleset): DerivedStats | undefined {
  const rules = ruleset.derived;
  if (!rules) return undefined;

  const sum = (keys: string[]) => keys.reduce((n, k) => n + traitTotal(sheet, ruleset, k), 0);
  const generation = Math.max(
    rules.generation.min,
    rules.generation.base - traitTotal(sheet, ruleset, rules.generation.backgroundKey),
  );
  const blood = rules.bloodPool[generation] ?? { max: 0, perTurn: 0 };

  return {
    humanity: sum(rules.humanity.from) + traitTotal(sheet, ruleset, rules.humanity.traitKey),
    willpower: sum(rules.willpower.from) + traitTotal(sheet, ruleset, rules.willpower.traitKey),
    generation,
    bloodPoolMax: blood.max,
    bloodPerTurn: blood.perTurn,
  };
}
