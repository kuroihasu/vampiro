import type { CharacterSheet } from './character.js';

export type ParseSheetResult =
  { ok: true; sheet: CharacterSheet } | { ok: false; errors: string[] };

const KEY = /^[a-z0-9-]{1,40}$/;
const MAX_ENTRIES = 300;
const PRIORITY_CATEGORIES = ['attribute', 'ability'] as const;
const SHEET_FIELDS = new Set([
  'clan',
  'priorities',
  'traits',
  'freebies',
  'meritsFlaws',
  'patternChoices',
  'specialties',
]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Comprueba la forma de una ficha que llega de fuera (cuerpo HTTP, JSONB).
 * No aplica reglas del juego: eso lo hace evaluateSheet.
 */
export function parseCharacterSheet(value: unknown): ParseSheetResult {
  if (!isObject(value)) return { ok: false, errors: ['la ficha debe ser un objeto'] };
  const errors: string[] = [];

  for (const key of Object.keys(value)) {
    if (!SHEET_FIELDS.has(key)) errors.push(`campo desconocido: ${key}`);
  }

  if (value['clan'] !== undefined) {
    if (typeof value['clan'] !== 'string') errors.push('clan debe ser un texto');
    else if (value['clan'] !== '' && !KEY.test(value['clan']))
      errors.push('clan no es una clave válida');
  }

  const priorities = value['priorities'];
  if (!isObject(priorities)) {
    errors.push('priorities debe ser un objeto');
  } else {
    for (const [category, groups] of Object.entries(priorities)) {
      if (!(PRIORITY_CATEGORIES as readonly string[]).includes(category)) {
        errors.push(`priorities.${category} no es una categoría con prioridades`);
        continue;
      }
      checkIntRecord(groups, `priorities.${category}`, errors);
    }
  }

  checkIntRecord(value['traits'], 'traits', errors);

  const freebies = value['freebies'];
  if (!Array.isArray(freebies)) {
    errors.push('freebies debe ser una lista');
  } else if (freebies.length > MAX_ENTRIES) {
    errors.push(`freebies admite como mucho ${MAX_ENTRIES} compras`);
  } else {
    freebies.forEach((item: unknown, i) => {
      if (!isObject(item)) {
        errors.push(`freebies[${i}] debe ser un objeto`);
        return;
      }
      if (typeof item['traitKey'] !== 'string' || !KEY.test(item['traitKey'])) {
        errors.push(`freebies[${i}].traitKey no es una clave válida`);
      }
      if (!Number.isInteger(item['dots'])) errors.push(`freebies[${i}].dots debe ser un entero`);
      for (const key of Object.keys(item)) {
        if (key !== 'traitKey' && key !== 'dots')
          errors.push(`freebies[${i}]: campo desconocido ${key}`);
      }
    });
  }

  const meritsFlaws = value['meritsFlaws'];
  if (meritsFlaws !== undefined) {
    if (!Array.isArray(meritsFlaws) || meritsFlaws.length > 60) {
      errors.push('meritsFlaws debe ser una lista (máximo 60)');
    } else if (!meritsFlaws.every((k) => typeof k === 'string' && KEY.test(k))) {
      errors.push('meritsFlaws contiene una clave inválida');
    }
  }

  const choices = value['patternChoices'];
  if (choices !== undefined) {
    if (!isObject(choices) || Object.keys(choices).length > 10) {
      errors.push('patternChoices debe ser un objeto');
    } else if (
      !Object.entries(choices).every(
        ([k, v]) => KEY.test(k) && typeof v === 'string' && KEY.test(v),
      )
    ) {
      errors.push('patternChoices contiene claves o valores inválidos');
    }
  }

  const specialties = value['specialties'];
  if (specialties !== undefined) {
    if (!Array.isArray(specialties) || specialties.length > 30) {
      errors.push('specialties debe ser una lista (máximo 30)');
    } else {
      specialties.forEach((item: unknown, i) => {
        const valid =
          isObject(item) &&
          typeof item['skill'] === 'string' &&
          KEY.test(item['skill']) &&
          typeof item['name'] === 'string' &&
          item['name'].trim().length > 0 &&
          item['name'].length <= 40 &&
          Object.keys(item).every((k) => k === 'skill' || k === 'name');
        if (!valid)
          errors.push(`specialties[${i}] debe tener skill y un nombre de hasta 40 caracteres`);
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, sheet: value as unknown as CharacterSheet };
}

function checkIntRecord(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} debe ser un objeto`);
    return;
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_ENTRIES) {
    errors.push(`${path} admite como mucho ${MAX_ENTRIES} claves`);
    return;
  }
  for (const [key, n] of entries) {
    if (!KEY.test(key)) errors.push(`${path} contiene una clave inválida: "${key}"`);
    else if (!Number.isInteger(n)) errors.push(`${path}.${key} debe ser un entero`);
  }
}
