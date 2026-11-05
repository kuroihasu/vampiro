import { describe, expect, it } from 'vitest';
import { EDITIONS } from '../editions.js';
import { getRuleset, RULESETS } from './index.js';

describe('rulesets', () => {
  it('solo las ediciones marcadas como disponibles tienen ruleset', () => {
    for (const edition of EDITIONS) {
      expect(getRuleset(edition.id) !== undefined, edition.id).toBe(edition.available);
    }
  });

  describe.each(Object.values(RULESETS))('$edition', (ruleset) => {
    const keys = new Set(ruleset.catalog.map((t) => t.key));

    it('no repite claves en el catálogo', () => {
      expect(keys.size).toBe(ruleset.catalog.length);
    });

    it('las disciplinas de clan existen en el catálogo', () => {
      const missing = ruleset.clans.flatMap((c) => c.disciplines).filter((k) => !keys.has(k));
      expect(missing).toEqual([]);
    });

    it('las acciones sugeridas usan rasgos del catálogo', () => {
      const missing = ruleset.actions.flatMap((a) => a.traits).filter((k) => !keys.has(k));
      expect(missing).toEqual([]);
    });
  });
});
