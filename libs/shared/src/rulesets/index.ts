import type { EditionId } from '../editions.js';
import type { Ruleset } from '../types/ruleset.js';
import { V20_RULESET } from './v20.js';
import { V5_RULESET } from './v5.js';

/** Rulesets cargados. Las ediciones que aún no tienen ruleset no aparecen aquí. */
export const RULESETS: Partial<Record<EditionId, Ruleset>> = {
  v20: V20_RULESET,
  v5: V5_RULESET,
};

export function getRuleset(edition: EditionId): Ruleset | undefined {
  return RULESETS[edition];
}

export { V20_RULESET, V5_RULESET };
