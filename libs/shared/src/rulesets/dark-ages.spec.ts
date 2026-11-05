import { describe, expect, it } from 'vitest';
import { calculateDicePool } from '../engine/dice-pool.js';
import { deriveStats } from '../engine/derived.js';
import { evaluateSheet } from '../engine/evaluate-sheet.js';
import { EDITIONS } from '../editions.js';
import { emptySheet, type CharacterSheet } from '../types/character.js';
import { DARK_AGES_RULESET } from './dark-ages.js';
import { getRuleset } from './index.js';

/** Ficha completa de Edad Oscura: Lasombra en el Camino de los Reyes. */
const COMPLETE_DA_SHEET: CharacterSheet = {
  clan: 'lasombra',
  road: 'reyes',
  priorities: {
    attribute: { physical: 2, social: 0, mental: 1 },
    ability: { talents: 0, skills: 1, knowledges: 2 },
  },
  traits: {
    fuerza: 1,
    destreza: 1,
    resistencia: 1,
    carisma: 3,
    manipulacion: 3,
    apariencia: 1,
    percepcion: 2,
    inteligencia: 2,
    astucia: 1,
    alerta: 2,
    consciencia: 1,
    empatia: 2,
    expresion: 2,
    intimidacion: 3,
    liderazgo: 3,
    etiqueta: 3,
    'pelea-armas': 3,
    cabalgar: 3,
    politica: 3,
    leyes: 2,
    dominacion: 2,
    obtenebracion: 1,
    dominio: 2,
    recursos: 2,
    estatus: 1,
    conviccion: 3,
    autocontrol: 2,
    coraje: 2,
  },
  freebies: [{ traitKey: 'voluntad', dots: 2 }],
};

const errors = (sheet: CharacterSheet, mode: 'draft' | 'complete' = 'complete') =>
  evaluateSheet(sheet, DARK_AGES_RULESET, { mode })
    .violations.filter((v) => v.severity === 'error')
    .map((v) => `${v.code}:${v.path ?? ''}`);

describe('Edad Oscura', () => {
  it('está disponible y tiene ruleset', () => {
    expect(EDITIONS.find((e) => e.id === 'dark-ages')?.available).toBe(true);
    expect(getRuleset('dark-ages')).toBe(DARK_AGES_RULESET);
  });

  it('la ficha de referencia es válida en modo completo', () => {
    expect(errors(COMPLETE_DA_SHEET)).toEqual([]);
  });

  it('reutiliza las prioridades de V20 (7/5/3)', () => {
    const budget = DARK_AGES_RULESET.creation.priorities.find((b) => b.category === 'attribute');
    expect(budget?.points).toEqual([7, 5, 3]);
  });

  it('hay que elegir un Camino', () => {
    const { road: _road, ...withoutRoad } = COMPLETE_DA_SHEET;
    expect(errors(withoutRoad)).toContain('REQUISITO_NO_CUMPLIDO:road');
  });

  it('un Camino desconocido es un error', () => {
    expect(errors({ ...COMPLETE_DA_SHEET, road: 'nirvana' })).toContain('RASGO_DESCONOCIDO:road');
  });

  it('solo se reparten las virtudes del Camino elegido (y Coraje)', () => {
    const sheet = {
      ...COMPLETE_DA_SHEET,
      traits: { ...COMPLETE_DA_SHEET.traits, conciencia: 1, conviccion: 2 },
    };
    expect(errors(sheet)).toContain('REQUISITO_NO_CUMPLIDO:conciencia');
  });

  it('el Camino vale la suma de sus dos virtudes y la Voluntad sale del Coraje', () => {
    // Convicción 1+3 y Autocontrol 1+2 → Camino 7; Coraje 1+2 + 2 gratuitos → Voluntad 5.
    expect(deriveStats(COMPLETE_DA_SHEET, DARK_AGES_RULESET)).toMatchObject({
      humanity: 7,
      moralityName: 'Camino de los Reyes',
      willpower: 5,
      generation: 12,
    });
    const beast: CharacterSheet = { ...emptySheet(), road: 'bestia', traits: { instinto: 2 } };
    expect(deriveStats(beast, DARK_AGES_RULESET)).toMatchObject({
      humanity: 4,
      moralityName: 'Camino de la Bestia',
    });
  });

  it('cambia las habilidades por las de la época', () => {
    const keys = DARK_AGES_RULESET.catalog
      .filter((t) => t.category === 'ability')
      .map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['cabalgar', 'arqueria', 'sabiduria-popular']));
    expect(keys).not.toContain('armas-fuego');
    expect(keys).not.toContain('informatica');
  });

  it('tira contra dificultad como V20', () => {
    const pool = calculateDicePool(COMPLETE_DA_SHEET, DARK_AGES_RULESET, {
      traits: ['carisma', 'liderazgo'],
      difficulty: 7,
    });
    expect(pool).toMatchObject({ dice: 7, difficulty: 7 });
  });
});
