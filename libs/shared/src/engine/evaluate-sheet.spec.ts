import { describe, expect, it } from 'vitest';
import { emptySheet, type CharacterSheet } from '../types/character.js';
import { DEFAULT_ROOM_CONFIG } from '../types/room-config.js';
import { V20_RULESET } from '../rulesets/v20.js';
import { checkSheetChange, checkTraitChange, evaluateSheet } from './evaluate-sheet.js';

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

  it('los mensajes usan el nombre visible del grupo', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      priorities: { attribute: { physical: 2, social: 1, mental: 0 } },
      traits: { fuerza: 2, destreza: 2 },
    };
    const message = evaluateSheet(sheet, V20_RULESET).violations.find(
      (v) => v.code === 'PRESUPUESTO_EXCEDIDO',
    )?.message;
    expect(message).toBe('Has repartido 4 de 3 puntos en Físicos.');
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

describe('evaluateSheet (V20): entradas inválidas', () => {
  it('rechaza puntos negativos en un rasgo', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { fuerza: -1 } };
    expect(codes(sheet)).toContain('error:REQUISITO_NO_CUMPLIDO');
  });

  it('rechaza compras de gratuitos con cero o menos puntos', () => {
    const sheet: CharacterSheet = { ...emptySheet(), freebies: [{ traitKey: 'fuerza', dots: -2 }] };
    expect(codes(sheet)).toContain('error:REQUISITO_NO_CUMPLIDO');
  });
});

describe('evaluateSheet (V20): reglas de creación', () => {
  it('rechaza un rasgo que no existe en la edición', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { telepatia: 1 } };
    expect(codes(sheet)).toContain('error:RASGO_DESCONOCIDO');
  });

  it('rechaza repetir la misma prioridad en dos grupos', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      priorities: { attribute: { physical: 0, social: 0, mental: 2 } },
    };
    expect(codes(sheet)).toContain('error:PRIORIDAD_INVALIDA');
  });

  it('en modo completo los puntos sin repartir son error', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      priorities: { attribute: { physical: 0, social: 1, mental: 2 } },
    };
    expect(codes(sheet, 'complete')).toContain('error:PUNTOS_SIN_REPARTIR');
    expect(codes(sheet, 'draft')).toContain('warning:PUNTOS_SIN_REPARTIR');
  });

  it('rechaza gastar más de 15 puntos gratuitos', () => {
    // 2 disciplinas de clan a 7 puntos cada una = 14; +1 trasfondo = 15; +1 más = 16.
    const sheet: CharacterSheet = {
      ...emptySheet(),
      clan: 'brujah',
      freebies: [
        { traitKey: 'celeridad', dots: 2 },
        { traitKey: 'recursos', dots: 2 },
      ],
    };
    const result = evaluateSheet(sheet, V20_RULESET);
    expect(result.budgets.find((b) => b.path === 'freebies')).toEqual({
      path: 'freebies',
      available: 15,
      spent: 16,
    });
    expect(result.violations.map((v) => v.code)).toContain('PRESUPUESTO_EXCEDIDO');
  });

  it('la sala puede dar puntos gratuitos extra', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      freebies: [{ traitKey: 'recursos', dots: 3 }],
    };
    const result = evaluateSheet(sheet, V20_RULESET, {
      roomConfig: { ...DEFAULT_ROOM_CONFIG, extraFreebies: 5 },
    });
    expect(result.budgets.find((b) => b.path === 'freebies')?.available).toBe(20);
  });

  it('rechaza superar el máximo absoluto de un rasgo con gratuitos', () => {
    // Fuerza: 1 de base + 4 de creación + 1 gratuito = 6 > 5.
    const sheet: CharacterSheet = {
      ...emptySheet(),
      traits: { fuerza: 4 },
      freebies: [{ traitKey: 'fuerza', dots: 1 }],
    };
    expect(codes(sheet)).toContain('error:MAX_GENERACION_SUPERADO');
  });
});

describe('evaluateSheet (V20): configuración de sala', () => {
  const temporisOnlyNpc = {
    ...DEFAULT_ROOM_CONFIG,
    disciplineRules: [{ discipline: 'temporis', players: false, npc: true }],
  };
  const withTemporis: CharacterSheet = {
    ...emptySheet(),
    freebies: [{ traitKey: 'temporis', dots: 1 }],
  };

  it('una disciplina vetada a jugadores se permite a un NPC', () => {
    const asPlayer = evaluateSheet(withTemporis, V20_RULESET, { roomConfig: temporisOnlyNpc });
    const asNpc = evaluateSheet(withTemporis, V20_RULESET, {
      roomConfig: temporisOnlyNpc,
      isNpc: true,
    });
    expect(asPlayer.violations.map((v) => v.code)).toContain('DISCIPLINA_NO_PERMITIDA');
    expect(asNpc.violations.map((v) => v.code)).not.toContain('DISCIPLINA_NO_PERMITIDA');
  });

  it('rechaza un clan que el master no permite', () => {
    const sheet: CharacterSheet = { ...emptySheet(), clan: 'tremere' };
    const result = evaluateSheet(sheet, V20_RULESET, {
      roomConfig: { ...DEFAULT_ROOM_CONFIG, allowedClans: ['brujah', 'gangrel'] },
    });
    expect(result.violations.map((v) => v.code)).toContain('CLAN_NO_PERMITIDO');
  });

  it('rechaza una generación fuera del rango de la sala', () => {
    // 5 puntos de Generación: 8ª generación.
    const sheet: CharacterSheet = { ...emptySheet(), traits: { generacion: 5 } };
    const result = evaluateSheet(sheet, V20_RULESET, {
      roomConfig: { ...DEFAULT_ROOM_CONFIG, minGeneration: 10, maxGeneration: 13 },
    });
    expect(result.violations.map((v) => v.code)).toContain('REQUISITO_NO_CUMPLIDO');
  });
});

describe('checkSheetChange (V20)', () => {
  it('detecta que una compra con gratuitos excede el total', () => {
    const sheet: CharacterSheet = {
      ...emptySheet(),
      clan: 'brujah',
      freebies: [{ traitKey: 'celeridad', dots: 2 }],
    };
    const next: CharacterSheet = {
      ...sheet,
      freebies: [...sheet.freebies, { traitKey: 'recursos', dots: 2 }],
    };
    expect(checkSheetChange(sheet, next, V20_RULESET).map((v) => v.code)).toEqual([
      'PRESUPUESTO_EXCEDIDO',
    ]);
  });

  it('no repite errores que ya existían antes del cambio', () => {
    const sheet: CharacterSheet = { ...emptySheet(), traits: { pelea: 4 } };
    const next: CharacterSheet = { ...sheet, traits: { ...sheet.traits, fuerza: 1 } };
    expect(checkSheetChange(sheet, next, V20_RULESET)).toEqual([]);
  });
});
