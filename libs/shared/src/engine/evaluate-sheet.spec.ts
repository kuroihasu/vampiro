import { describe, expect, it } from 'vitest';
import { emptySheet, type CharacterSheet } from '../types/character.js';
import { V20_RULESET } from '../rulesets/v20.js';
import { checkTraitChange, evaluateSheet } from './evaluate-sheet.js';
import { calculateDicePool } from './dice-pool.js';

const codes = (sheet: CharacterSheet, mode: 'draft' | 'complete' = 'draft') =>
  evaluateSheet(sheet, V20_RULESET, { mode }).violations.map((v) => `${v.severity}:${v.code}`);

describe('evaluateSheet (V20)', () => {
  it('una ficha vacía es un borrador válido con avisos', () => {
    const result = evaluateSheet(emptySheet(), V20_RULESET);
    expect(result.valid).toBe(true);
    expect(result.violations.every((v) => v.severity === 'warning')).toBe(true);
  });

  it('la misma ficha vacía no se puede completar', () => {
    expect(evaluateSheet(emptySheet(), V20_RULESET, { mode: 'complete' }).valid).toBe(false);
  });

  it('calcula los puntos disponibles según la prioridad', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      priorities: { attribute: { physical: 0, social: 1, mental: 2 } },
      traits: { fuerza: 2, destreza: 2 },
    };
    const physical = evaluateSheet(sheet, V20_RULESET).budgets.find(
      (b) => b.path === 'attribute.physical',
    );
    expect(physical).toEqual({ path: 'attribute.physical', available: 7, spent: 4 });
  });

  it('rechaza exceder el presupuesto de un grupo', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      priorities: { attribute: { physical: 2, social: 1, mental: 0 } },
      traits: { fuerza: 2, destreza: 2 },
    };
    expect(codes(sheet)).toContain('error:PRESUPUESTO_EXCEDIDO');
  });

  it('rechaza una habilidad sobre 3 antes de gratuitos', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { pelea: 4 } };
    expect(codes(sheet)).toContain('error:MAX_CREACION_SUPERADO');
  });

  it('rechaza disciplinas fuera de clan', () => {
    const sheet: CharacterSheet = { ...emptySheet(), clan: 'brujah', traits: { auspex: 1 } };
    expect(codes(sheet)).toContain('error:DISCIPLINA_FUERA_DE_CLAN');
  });

  it('respeta las disciplinas vetadas por el master', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      clan: 'brujah',
      freebies: [{ traitKey: 'temporis', dots: 1 }],
    };
    const result = evaluateSheet(sheet, V20_RULESET, {
      roomConfig: {
        allowMeritsFlaws: true,
        allowedClans: 'all',
        extraFreebies: 0,
        diceVisibility: 'all',
        disciplineRules: [{ discipline: 'temporis', players: false, npc: true }],
      },
    });
    expect(result.violations.map((v) => v.code)).toContain('DISCIPLINA_NO_PERMITIDA');
  });

  it('checkTraitChange explica por qué no se puede subir un punto', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { pelea: 2 } };
    const [violation] = checkTraitChange(sheet, V20_RULESET, 'pelea', 4);
    expect(violation?.code).toBe('MAX_CREACION_SUPERADO');
    expect(checkTraitChange(sheet, V20_RULESET, 'pelea', 3)).toEqual([]);
  });
});

describe('calculateDicePool (V20)', () => {
  it('suma atributo + habilidad incluyendo la base', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { destreza: 2, pelea: 3 } };
    const pool = calculateDicePool(sheet, V20_RULESET, {
      traits: ['destreza', 'pelea'],
      difficulty: 7,
    });
    expect(pool.dice).toBe(6);
    expect(pool.difficulty).toBe(7);
  });
});
