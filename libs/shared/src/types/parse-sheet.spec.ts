import { describe, expect, it } from 'vitest';
import { parseCharacterSheet } from './parse-sheet.js';

describe('parseCharacterSheet', () => {
  it('acepta una ficha válida', () => {
    const sheet = {
      clan: 'brujah',
      priorities: { attribute: { physical: 0, social: 1, mental: 2 } },
      traits: { fuerza: 2, pelea: 3 },
      freebies: [{ traitKey: 'celeridad', dots: 1 }],
    };
    expect(parseCharacterSheet(sheet)).toEqual({ ok: true, sheet });
  });

  it('acepta la ficha vacía', () => {
    expect(parseCharacterSheet({ priorities: {}, traits: {}, freebies: [] }).ok).toBe(true);
  });

  it('rechaza lo que no es un objeto', () => {
    expect(parseCharacterSheet(null).ok).toBe(false);
    expect(parseCharacterSheet([]).ok).toBe(false);
    expect(parseCharacterSheet('ficha').ok).toBe(false);
  });

  it('explica qué campo está mal', () => {
    const result = parseCharacterSheet({
      clan: 7,
      priorities: { attribute: { physical: 'alta' }, magia: {} },
      traits: { fuerza: 1.5, 'Mal Nombre': 1 },
      freebies: [{ traitKey: 'celeridad' }],
      extra: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'clan debe ser un texto',
        'priorities.attribute.physical debe ser un entero',
        'priorities.magia no es una categoría con prioridades',
        'traits.fuerza debe ser un entero',
        'traits contiene una clave inválida: "Mal Nombre"',
        'freebies[0].dots debe ser un entero',
        'campo desconocido: extra',
      ]),
    );
  });

  it('limita el tamaño para no aceptar fichas gigantes', () => {
    const traits = Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`r${i}`, 1]));
    expect(parseCharacterSheet({ priorities: {}, traits, freebies: [] }).ok).toBe(false);
  });
});
