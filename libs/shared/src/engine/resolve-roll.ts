import type { DiceSystem } from '../types/ruleset.js';

export type RollOutcome =
  | 'success'
  | 'failure'
  /** V20: sin éxitos y algún 1. */
  | 'botch'
  /** V5: al menos una pareja de 10. */
  | 'critical'
  /** V5: crítico con algún 10 de Hambre. */
  | 'messy-critical'
  /** V5: sin éxitos y algún 1 de Hambre. */
  | 'bestial-failure';

export interface RollInput {
  /** Caras de los dados normales (1-10). */
  dice: number[];
  /** V5: caras de los dados de Hambre. */
  hungerDice?: number[];
  /** V20: dificultad pedida (se limita al rango de la edición). */
  difficulty?: number;
}

export interface RollResult {
  dice: number[];
  hungerDice?: number[];
  difficulty?: number;
  successes: number;
  outcome: RollOutcome;
}

/** Interpreta unos dados ya tirados según el sistema de la edición. Función pura. */
export function resolveRoll(system: DiceSystem, input: RollInput): RollResult {
  return system.kind === 'difficulty'
    ? resolveDifficulty(system, input)
    : resolveThreshold(system, input);
}

function resolveDifficulty(
  system: Extract<DiceSystem, { kind: 'difficulty' }>,
  input: RollInput,
): RollResult {
  const difficulty = Math.min(
    system.maxDifficulty,
    Math.max(system.minDifficulty, input.difficulty ?? 6),
  );
  const hits = input.dice.filter((d) => d >= difficulty).length;
  const ones = input.dice.filter((d) => d === 1).length;
  const successes = Math.max(0, hits - (system.onesCancel ? ones : 0));
  const outcome: RollOutcome =
    hits === 0 && ones > 0 ? 'botch' : successes > 0 ? 'success' : 'failure';
  return { dice: input.dice, difficulty, successes, outcome };
}

function resolveThreshold(
  system: Extract<DiceSystem, { kind: 'success-threshold' }>,
  input: RollInput,
): RollResult {
  const hunger = system.hungerDice ? (input.hungerDice ?? []) : [];
  const all = [...input.dice, ...hunger];
  const tens = all.filter((d) => d === 10).length;
  const pairs = Math.floor(tens / 2);
  const successes = all.filter((d) => d >= system.threshold).length + pairs * 2;

  let outcome: RollOutcome;
  if (pairs > 0) outcome = hunger.includes(10) ? 'messy-critical' : 'critical';
  else if (successes > 0) outcome = 'success';
  else outcome = hunger.includes(1) ? 'bestial-failure' : 'failure';

  return {
    dice: input.dice,
    ...(system.hungerDice ? { hungerDice: hunger } : {}),
    successes,
    outcome,
  };
}
