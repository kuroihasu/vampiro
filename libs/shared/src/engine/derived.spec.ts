import { describe, expect, it } from 'vitest';
import { V20_RULESET } from '../rulesets/v20.js';
import { emptySheet, type CharacterSheet } from '../types/character.js';
import { deriveStats } from './derived.js';
import { evaluateSheet } from './evaluate-sheet.js';

const codes = (sheet: CharacterSheet) =>
  evaluateSheet(sheet, V20_RULESET).violations.map((v) => `${v.severity}:${v.code}:${v.path}`);

describe('deriveStats (V20)', () => {
  it('una ficha vacía: Humanidad 2, Voluntad 1, generación 13 y 10 de sangre', () => {
    expect(deriveStats(emptySheet(), V20_RULESET)).toEqual({
      humanity: 2,
      willpower: 1,
      generation: 13,
      bloodPoolMax: 10,
      bloodPerTurn: 1,
    });
  });

  it('Humanidad = Conciencia + Autocontrol; Voluntad = Coraje', () => {
    // Las virtudes empiezan en 1: 1+2 de Conciencia, 1+3 de Autocontrol, 1+1 de Coraje.
    const sheet: CharacterSheet = {
      ...emptySheet(),
      traits: { conciencia: 2, autocontrol: 3, coraje: 1 },
    };
    expect(deriveStats(sheet, V20_RULESET)).toMatchObject({ humanity: 7, willpower: 2 });
  });

  it('los puntos gratuitos suben Humanidad y Voluntad', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      freebies: [
        { traitKey: 'humanidad', dots: 1 },
        { traitKey: 'voluntad', dots: 2 },
      ],
    };
    expect(deriveStats(sheet, V20_RULESET)).toMatchObject({ humanity: 3, willpower: 3 });
  });

  it('cada punto del trasfondo Generación baja una generación y amplía la sangre', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { generacion: 3 } };
    expect(deriveStats(sheet, V20_RULESET)).toMatchObject({
      generation: 10,
      bloodPoolMax: 13,
      bloodPerTurn: 1,
    });
    const elder: CharacterSheet = { ...emptySheet(), traits: { generacion: 5 } };
    expect(deriveStats(elder, V20_RULESET)).toMatchObject({
      generation: 8,
      bloodPoolMax: 15,
      bloodPerTurn: 3,
    });
  });
});

describe('evaluateSheet (V20): rasgos derivados', () => {
  it('Humanidad y Voluntad cuestan 2 y 1 puntos gratuitos', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      freebies: [
        { traitKey: 'humanidad', dots: 2 },
        { traitKey: 'voluntad', dots: 3 },
      ],
    };
    const freebies = evaluateSheet(sheet, V20_RULESET).budgets.find((b) => b.path === 'freebies');
    expect(freebies?.spent).toBe(7);
  });

  it('Humanidad y Voluntad no se reparten con puntos de creación', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { humanidad: 3 } };
    expect(codes(sheet)).toContain('error:REQUISITO_NO_CUMPLIDO:humanidad');
  });

  it('Humanidad no puede pasar de 10', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      traits: { conciencia: 4, autocontrol: 3 },
      freebies: [
        { traitKey: 'autocontrol', dots: 1 },
        { traitKey: 'humanidad', dots: 1 },
      ],
    };
    // 5 + 5 + 1 = 11
    expect(codes(sheet)).toContain('error:MAX_GENERACION_SUPERADO:humanidad');
  });
});
