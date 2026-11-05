import type { CharacterSheet } from '../types/character.js';
import type { DicePool, DicePoolRequest } from '../types/dice.js';
import type { Ruleset } from '../types/ruleset.js';
import { findTrait, traitTotal } from './traits.js';

/**
 * Calcula la reserva de dados para una acción (normalmente atributo + habilidad).
 * El front la usa como vista previa; el back la recalcula antes de tirar.
 */
export function calculateDicePool(
  sheet: CharacterSheet,
  ruleset: Ruleset,
  request: DicePoolRequest,
): DicePool {
  const breakdown = request.traits.map((key) => ({
    source: findTrait(ruleset, key)?.name ?? key,
    dice: traitTotal(sheet, ruleset, key),
  }));
  if (request.modifier) {
    breakdown.push({ source: 'Modificador', dice: request.modifier });
  }
  const dice = Math.max(
    0,
    breakdown.reduce((sum, b) => sum + b.dice, 0),
  );

  if (ruleset.dice.kind === 'difficulty') {
    const { minDifficulty, maxDifficulty } = ruleset.dice;
    const difficulty = Math.min(maxDifficulty, Math.max(minDifficulty, request.difficulty ?? 6));
    return { dice, difficulty, breakdown };
  }

  const hungerDice = ruleset.dice.hungerDice ? Math.min(dice, request.hunger ?? 0) : undefined;
  return { dice, hungerDice, breakdown };
}
