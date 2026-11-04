import type { CharacterSheet } from '../types/character.js';
import type { Ruleset } from '../types/ruleset.js';
import type { TraitDefinition } from '../types/trait.js';

export function findTrait(ruleset: Ruleset, key: string): TraitDefinition | undefined {
  return ruleset.catalog.find((t) => t.key === key);
}

/** Puntos comprados con gratuitos para un rasgo. */
export function freebieDots(sheet: CharacterSheet, key: string): number {
  return sheet.freebies.filter((f) => f.traitKey === key).reduce((sum, f) => sum + f.dots, 0);
}

/**
 * Valor total de un rasgo: base + puntos de creación + puntos gratuitos.
 * `sheet.traits` guarda solo lo repartido por encima de la base.
 */
export function traitTotal(sheet: CharacterSheet, ruleset: Ruleset, key: string): number {
  const def = findTrait(ruleset, key);
  return (def?.base ?? 0) + (sheet.traits[key] ?? 0) + freebieDots(sheet, key);
}
