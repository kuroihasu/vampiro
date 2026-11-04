import { describe, expect, it } from 'vitest';
import { resolveRoll } from './resolve-roll.js';

const v20 = { kind: 'difficulty', minDifficulty: 2, maxDifficulty: 10, onesCancel: true } as const;
const v5 = { kind: 'success-threshold', threshold: 6, hungerDice: true } as const;

describe('resolveRoll (V20, dificultad)', () => {
  it('cuenta los dados iguales o mayores que la dificultad', () => {
    expect(resolveRoll(v20, { dice: [7, 6, 3, 9], difficulty: 6 })).toMatchObject({
      successes: 3,
      outcome: 'success',
    });
  });

  it('cada 1 resta un éxito', () => {
    expect(resolveRoll(v20, { dice: [8, 9, 1, 4], difficulty: 6 })).toMatchObject({
      successes: 1,
      outcome: 'success',
    });
  });

  it('si los unos anulan todos los éxitos es un fallo, no un fracaso', () => {
    expect(resolveRoll(v20, { dice: [8, 1, 1, 4], difficulty: 6 })).toMatchObject({
      successes: 0,
      outcome: 'failure',
    });
  });

  it('sin ningún éxito y con algún 1 es un fracaso', () => {
    expect(resolveRoll(v20, { dice: [3, 1, 5], difficulty: 6 })).toMatchObject({
      successes: 0,
      outcome: 'botch',
    });
  });

  it('sin éxitos ni unos es un fallo', () => {
    expect(resolveRoll(v20, { dice: [2, 3, 5], difficulty: 6 }).outcome).toBe('failure');
  });

  it('la dificultad se limita al rango de la edición', () => {
    expect(resolveRoll(v20, { dice: [2], difficulty: 1 })).toMatchObject({
      difficulty: 2,
      successes: 1,
    });
    expect(resolveRoll(v20, { dice: [10], difficulty: 14 }).difficulty).toBe(10);
  });

  it('una reserva vacía es un fallo', () => {
    expect(resolveRoll(v20, { dice: [], difficulty: 6 })).toMatchObject({
      successes: 0,
      outcome: 'failure',
    });
  });
});

describe('resolveRoll (V5, umbral y Hambre)', () => {
  it('cuenta los dados de 6 o más', () => {
    expect(resolveRoll(v5, { dice: [6, 7, 2], hungerDice: [3] })).toMatchObject({
      successes: 2,
      outcome: 'success',
    });
  });

  it('una pareja de 10 vale 4 éxitos y es un crítico', () => {
    expect(resolveRoll(v5, { dice: [10, 10, 2], hungerDice: [] })).toMatchObject({
      successes: 4,
      outcome: 'critical',
    });
  });

  it('si uno de los 10 del crítico es de Hambre, es un crítico sucio', () => {
    expect(resolveRoll(v5, { dice: [10, 4], hungerDice: [10] })).toMatchObject({
      successes: 4,
      outcome: 'messy-critical',
    });
  });

  it('sin éxitos y con un 1 en los dados de Hambre es un fallo bestial', () => {
    expect(resolveRoll(v5, { dice: [3, 4], hungerDice: [1] })).toMatchObject({
      successes: 0,
      outcome: 'bestial-failure',
    });
  });

  it('los unos no restan en V5', () => {
    expect(resolveRoll(v5, { dice: [1, 1, 8], hungerDice: [] }).successes).toBe(1);
  });
});
