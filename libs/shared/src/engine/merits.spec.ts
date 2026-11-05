import { describe, expect, it } from 'vitest';
import { V20_RULESET } from '../rulesets/v20.js';
import { emptySheet, type CharacterSheet } from '../types/character.js';
import { DEFAULT_ROOM_CONFIG } from '../types/room-config.js';
import { evaluateSheet, type EvaluateOptions } from './evaluate-sheet.js';

const evaluate = (sheet: CharacterSheet, options: EvaluateOptions = {}) =>
  evaluateSheet(sheet, V20_RULESET, options);
const codes = (sheet: CharacterSheet, options: EvaluateOptions = {}) =>
  evaluate(sheet, options).violations.map((v) => `${v.severity}:${v.code}:${v.path ?? ''}`);
const freebies = (sheet: CharacterSheet, options: EvaluateOptions = {}) =>
  evaluate(sheet, options).budgets.find((b) => b.path === 'freebies');

describe('méritos y defectos (V20)', () => {
  it('el catálogo tiene méritos y defectos con coste', () => {
    const merits = V20_RULESET.catalog.filter((t) => t.category === 'merit');
    const flaws = V20_RULESET.catalog.filter((t) => t.category === 'flaw');
    expect(merits.length).toBeGreaterThanOrEqual(15);
    expect(flaws.length).toBeGreaterThanOrEqual(15);
    expect([...merits, ...flaws].every((t) => (t.cost ?? 0) > 0)).toBe(true);
  });

  it('un mérito se paga con puntos gratuitos', () => {
    // Sentidos agudos: 1 punto.
    const sheet: CharacterSheet = { ...emptySheet(), meritsFlaws: ['sentidos-agudos'] };
    expect(freebies(sheet)).toMatchObject({ available: 15, spent: 1 });
  });

  it('un defecto devuelve puntos gratuitos', () => {
    // Pesadillas: 1 punto; Fobia: 2 puntos.
    const sheet: CharacterSheet = { ...emptySheet(), meritsFlaws: ['pesadillas', 'fobia'] };
    expect(freebies(sheet)).toMatchObject({ available: 18, spent: 0 });
  });

  it('los defectos solo devuelven hasta 7 puntos y pasarse es un error', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      // 3 + 3 + 2 = 8 puntos de defectos
      meritsFlaws: ['presa-exclusiva', 'enemigo', 'fobia'],
    };
    expect(freebies(sheet)?.available).toBe(22);
    expect(codes(sheet)).toContain('error:PRESUPUESTO_EXCEDIDO:flaws');
  });

  it('la sala puede bajar el límite de defectos', () => {
    const sheet: CharacterSheet = { ...emptySheet(), meritsFlaws: ['fobia', 'pesadillas'] };
    const roomConfig = { ...DEFAULT_ROOM_CONFIG, maxFlawPoints: 2 };
    expect(codes(sheet, { roomConfig })).toContain('error:PRESUPUESTO_EXCEDIDO:flaws');
    expect(freebies(sheet, { roomConfig })?.available).toBe(17);
  });

  it('si la sala desactiva méritos y defectos, tenerlos es MERITOS_DESACTIVADOS', () => {
    const sheet: CharacterSheet = { ...emptySheet(), meritsFlaws: ['sentidos-agudos'] };
    const roomConfig = { ...DEFAULT_ROOM_CONFIG, allowMeritsFlaws: false };
    expect(codes(sheet, { roomConfig })).toContain('error:MERITOS_DESACTIVADOS:sentidos-agudos');
  });

  it('un mérito con requisitos sin cumplir es REQUISITO_NO_CUMPLIDO', () => {
    // Reflejos rápidos exige Destreza 3.
    const without: CharacterSheet = { ...emptySheet(), meritsFlaws: ['reflejos-rapidos'] };
    expect(codes(without)).toContain('error:REQUISITO_NO_CUMPLIDO:reflejos-rapidos');
    const with3: CharacterSheet = {
      ...without,
      priorities: { attribute: { physical: 0, social: 1, mental: 2 } },
      traits: { destreza: 2 },
    };
    expect(codes(with3)).not.toContain('error:REQUISITO_NO_CUMPLIDO:reflejos-rapidos');
  });

  it('respeta los clanes que no pueden tomar un mérito', () => {
    // Un Nosferatu no puede tener Atractivo.
    const sheet: CharacterSheet = {
      ...emptySheet(),
      clan: 'nosferatu',
      meritsFlaws: ['atractivo'],
    };
    expect(codes(sheet)).toContain('error:REQUISITO_NO_CUMPLIDO:atractivo');
  });

  it('rechaza méritos desconocidos o repetidos', () => {
    const sheet: CharacterSheet = { ...emptySheet(), meritsFlaws: ['volar', 'fobia', 'fobia'] };
    const result = codes(sheet);
    expect(result).toContain('error:RASGO_DESCONOCIDO:volar');
    expect(result).toContain('error:REQUISITO_NO_CUMPLIDO:fobia');
  });

  it('los méritos no se compran como puntos de rasgo', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      freebies: [{ traitKey: 'sentidos-agudos', dots: 1 }],
    };
    expect(codes(sheet)).toContain('error:REQUISITO_NO_CUMPLIDO:sentidos-agudos');
  });
});
