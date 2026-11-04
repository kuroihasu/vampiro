import { describe, expect, it } from 'vitest';
import { emptySheet, type CharacterSheet } from '../types/character.js';
import type { Ruleset } from '../types/ruleset.js';
import { V20_RULESET } from '../rulesets/v20.js';
import { calculateDicePool } from './dice-pool.js';

describe('calculateDicePool (V20)', () => {
  const sheet: CharacterSheet = { ...emptySheet(), traits: { destreza: 2, pelea: 3 } };

  it('suma atributo + habilidad incluyendo la base', () => {
    const pool = calculateDicePool(sheet, V20_RULESET, {
      traits: ['destreza', 'pelea'],
      difficulty: 7,
    });
    expect(pool.dice).toBe(6);
    expect(pool.difficulty).toBe(7);
  });

  it('muestra el desglose con nombres legibles y el modificador', () => {
    const pool = calculateDicePool(sheet, V20_RULESET, {
      traits: ['destreza', 'pelea'],
      modifier: -2,
    });
    expect(pool.breakdown).toEqual([
      { source: 'Destreza', dice: 3 },
      { source: 'Pelea', dice: 3 },
      { source: 'Modificador', dice: -2 },
    ]);
    expect(pool.dice).toBe(4);
  });

  it('nunca devuelve una reserva negativa', () => {
    const pool = calculateDicePool(sheet, V20_RULESET, { traits: ['pelea'], modifier: -10 });
    expect(pool.dice).toBe(0);
  });

  it('usa dificultad 6 por defecto y la limita entre 2 y 10', () => {
    const traits = ['pelea'];
    expect(calculateDicePool(sheet, V20_RULESET, { traits }).difficulty).toBe(6);
    expect(calculateDicePool(sheet, V20_RULESET, { traits, difficulty: 1 }).difficulty).toBe(2);
    expect(calculateDicePool(sheet, V20_RULESET, { traits, difficulty: 12 }).difficulty).toBe(10);
  });
});

describe('calculateDicePool (sistema de umbral con Hambre)', () => {
  // Ruleset mínimo de prueba: V5 aún no está cargado.
  const hungerRuleset: Ruleset = {
    ...V20_RULESET,
    dice: { kind: 'success-threshold', threshold: 6, hungerDice: true },
  };
  const sheet: CharacterSheet = { ...emptySheet(), traits: { destreza: 1, pelea: 1 } };

  it('no da dificultad y limita los dados de Hambre a la reserva', () => {
    const pool = calculateDicePool(sheet, hungerRuleset, {
      traits: ['destreza', 'pelea'],
      hunger: 5,
    });
    expect(pool.dice).toBe(3);
    expect(pool.difficulty).toBeUndefined();
    expect(pool.hungerDice).toBe(3);
  });
});
