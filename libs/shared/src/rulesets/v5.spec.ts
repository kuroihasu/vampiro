import { describe, expect, it } from 'vitest';
import { calculateDicePool } from '../engine/dice-pool.js';
import { deriveStats } from '../engine/derived.js';
import { checkTraitChange, evaluateSheet } from '../engine/evaluate-sheet.js';
import { EDITIONS } from '../editions.js';
import { emptySheet, type CharacterSheet } from '../types/character.js';
import { getRuleset } from './index.js';
import { V5_RULESET } from './v5.js';

/** Ficha V5 completa y válida (Brujah, distribución equilibrada). */
const COMPLETE_V5_SHEET: CharacterSheet = {
  clan: 'brujah',
  priorities: {},
  patternChoices: { skills: 'equilibrada' },
  traits: {
    // Atributos 4/3/3/3/2/2/2/2/1
    fuerza: 4,
    destreza: 3,
    resistencia: 3,
    carisma: 3,
    manipulacion: 2,
    compostura: 2,
    inteligencia: 2,
    astucia: 2,
    resolucion: 1,
    // Habilidades equilibradas: 3×3, 5×2, 7×1
    pelea: 3,
    atletismo: 3,
    intimidacion: 3,
    callejeo: 2,
    sigilo: 2,
    conducir: 2,
    persuasion: 2,
    perspicacia: 2,
    academicismo: 1,
    ocultismo: 1,
    investigacion: 1,
    'armas-fuego': 1,
    etiqueta: 1,
    subterfugio: 1,
    tecnologia: 1,
    // Disciplinas de clan 2 y 1
    potencia: 2,
    presencia: 1,
    // Ventajas: 5 puntos de trasfondos + 2 de un mérito = 7
    contactos: 3,
    recursos: 2,
  },
  freebies: [],
  meritsFlaws: ['belleza', 'presa-exclusiva'],
  specialties: [
    { skill: 'academicismo', name: 'Historia del arte' },
    { skill: 'pelea', name: 'Placajes' },
  ],
};

const codes = (sheet: CharacterSheet, mode: 'draft' | 'complete' = 'draft') =>
  evaluateSheet(sheet, V5_RULESET, { mode }).violations.map(
    (v) => `${v.severity}:${v.code}:${v.path ?? ''}`,
  );
const errors = (sheet: CharacterSheet, mode: 'draft' | 'complete' = 'complete') =>
  codes(sheet, mode).filter((c) => c.startsWith('error'));

describe('V5', () => {
  it('está disponible y tiene ruleset', () => {
    expect(EDITIONS.find((e) => e.id === 'v5')?.available).toBe(true);
    expect(getRuleset('v5')).toBe(V5_RULESET);
  });

  it('la ficha completa de referencia es válida en modo completo', () => {
    expect(errors(COMPLETE_V5_SHEET)).toEqual([]);
  });

  describe('atributos por patrón 4/3/3/3/2/2/2/2/1', () => {
    it('no deja dos atributos a 4', () => {
      const sheet = { ...emptySheet(), traits: { fuerza: 4, destreza: 4 } };
      expect(codes(sheet)).toContain('error:PRESUPUESTO_EXCEDIDO:attributes');
    });

    it('no deja un atributo a 5 al crear', () => {
      expect(codes({ ...emptySheet(), traits: { fuerza: 5 } })).toContain(
        'error:PRESUPUESTO_EXCEDIDO:attributes',
      );
    });

    it('lo que falta por asignar es aviso en borrador y error al completar', () => {
      const sheet = { ...emptySheet(), traits: { fuerza: 4 } };
      expect(codes(sheet, 'draft')).toContain('warning:PUNTOS_SIN_REPARTIR:attributes');
      expect(codes(sheet, 'complete')).toContain('error:PUNTOS_SIN_REPARTIR:attributes');
    });

    it('checkTraitChange explica por qué no se puede poner otro 4', () => {
      const sheet = { ...emptySheet(), traits: { fuerza: 4 } };
      const [v] = checkTraitChange(sheet, V5_RULESET, 'destreza', 4);
      expect(v?.message).toContain('4');
      expect(checkTraitChange(sheet, V5_RULESET, 'destreza', 3)).toEqual([]);
    });

    it('el contador muestra lo asignado sobre el total del patrón', () => {
      const result = evaluateSheet({ ...emptySheet(), traits: { fuerza: 4 } }, V5_RULESET);
      expect(result.budgets.find((b) => b.path === 'attributes')).toEqual({
        path: 'attributes',
        available: 22,
        spent: 4,
      });
    });
  });

  describe('habilidades por distribución', () => {
    it('hay que elegir una distribución', () => {
      const sheet = { ...COMPLETE_V5_SHEET, patternChoices: {} };
      expect(errors(sheet)).toContain('error:PRIORIDAD_INVALIDA:skills');
    });

    it('con "especialista" se permite una habilidad a 4', () => {
      const sheet: CharacterSheet = {
        ...emptySheet(),
        patternChoices: { skills: 'especialista' },
        traits: { pelea: 4 },
      };
      expect(codes(sheet).filter((c) => c.includes(':skills'))).toEqual([
        'warning:PUNTOS_SIN_REPARTIR:skills',
      ]);
    });

    it('con "equilibrada" no', () => {
      const sheet: CharacterSheet = {
        ...emptySheet(),
        patternChoices: { skills: 'equilibrada' },
        traits: { pelea: 4 },
      };
      expect(codes(sheet)).toContain('error:PRESUPUESTO_EXCEDIDO:skills');
    });
  });

  describe('disciplinas', () => {
    it('solo de clan, una a 2 y otra a 1', () => {
      const outOfClan = {
        ...COMPLETE_V5_SHEET,
        traits: { ...COMPLETE_V5_SHEET.traits, auspex: 1 },
      };
      expect(errors(outOfClan)).toContain('error:DISCIPLINA_FUERA_DE_CLAN:auspex');
      const twoAtTwo = {
        ...COMPLETE_V5_SHEET,
        traits: { ...COMPLETE_V5_SHEET.traits, presencia: 2 },
      };
      expect(errors(twoAtTwo)).toContain('error:PRESUPUESTO_EXCEDIDO:disciplines');
    });
  });

  describe('ventajas, defectos y especialidades', () => {
    it('los méritos se pagan con los 7 puntos de ventajas', () => {
      const result = evaluateSheet(COMPLETE_V5_SHEET, V5_RULESET, { mode: 'complete' });
      expect(result.budgets.find((b) => b.path === 'background')).toEqual({
        path: 'background',
        available: 7,
        spent: 7,
      });
      const tooMany = {
        ...COMPLETE_V5_SHEET,
        traits: { ...COMPLETE_V5_SHEET.traits, recursos: 3 },
      };
      expect(errors(tooMany)).toContain('error:PRESUPUESTO_EXCEDIDO:background');
    });

    it('al completar hacen falta exactamente 2 puntos de defectos', () => {
      const none = { ...COMPLETE_V5_SHEET, meritsFlaws: ['belleza'] };
      expect(errors(none)).toContain('error:PUNTOS_SIN_REPARTIR:flaws');
      const tooMany = {
        ...COMPLETE_V5_SHEET,
        meritsFlaws: ['belleza', 'presa-exclusiva', 'enemigo'],
      };
      expect(errors(tooMany)).toContain('error:PRESUPUESTO_EXCEDIDO:flaws');
    });

    it('una especialidad exige puntos en su habilidad', () => {
      const sheet = {
        ...COMPLETE_V5_SHEET,
        specialties: [
          ...(COMPLETE_V5_SHEET.specialties ?? []),
          { skill: 'medicina', name: 'Cirugía' },
        ],
      };
      expect(errors(sheet)).toContain('error:REQUISITO_NO_CUMPLIDO:medicina');
    });

    it('Academicismo con puntos necesita especialidad; no se puede pasar del límite', () => {
      const missing = { ...COMPLETE_V5_SHEET, specialties: [{ skill: 'pelea', name: 'Placajes' }] };
      expect(errors(missing)).toContain('error:PUNTOS_SIN_REPARTIR:specialties');
      const extra = {
        ...COMPLETE_V5_SHEET,
        specialties: [
          ...(COMPLETE_V5_SHEET.specialties ?? []),
          { skill: 'atletismo', name: 'Carrera' },
        ],
      };
      expect(errors(extra)).toContain('error:PRESUPUESTO_EXCEDIDO:specialties');
    });
  });

  describe('derivados', () => {
    it('Voluntad = Compostura + Resolución, Salud = Resistencia + 3, Humanidad 7', () => {
      expect(deriveStats(COMPLETE_V5_SHEET, V5_RULESET)).toMatchObject({
        willpower: 3,
        health: 6,
        humanity: 7,
        bloodPotency: 1,
        hungerMax: 5,
      });
    });
  });

  describe('dados', () => {
    it('la reserva incluye dados de Hambre sin pasar del total', () => {
      const pool = calculateDicePool(COMPLETE_V5_SHEET, V5_RULESET, {
        traits: ['fuerza', 'pelea'],
        hunger: 2,
      });
      expect(pool).toMatchObject({ dice: 7, hungerDice: 2 });
      expect(pool.difficulty).toBeUndefined();
    });
  });
});
