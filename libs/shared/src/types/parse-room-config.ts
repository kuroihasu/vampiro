import type { RoomConfig } from './room-config.js';

export type ParseRoomConfigResult =
  { ok: true; config: RoomConfig } | { ok: false; errors: string[] };

const KEY = /^[a-z0-9-]{1,40}$/;
const FIELDS = new Set([
  'allowMeritsFlaws',
  'maxFlawPoints',
  'disciplineRules',
  'allowedClans',
  'minGeneration',
  'maxGeneration',
  'extraFreebies',
  'diceVisibility',
]);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/** Comprueba la forma de la configuración de una sala que llega de fuera. */
export function parseRoomConfig(value: unknown): ParseRoomConfigResult {
  if (!isObject(value)) return { ok: false, errors: ['la configuración debe ser un objeto'] };
  const errors: string[] = [];

  for (const key of Object.keys(value)) {
    if (!FIELDS.has(key)) errors.push(`campo desconocido: ${key}`);
  }

  if (typeof value['allowMeritsFlaws'] !== 'boolean') {
    errors.push('allowMeritsFlaws debe ser true o false');
  }
  if (value['maxFlawPoints'] !== undefined && !isInt(value['maxFlawPoints'], 0, 20)) {
    errors.push('maxFlawPoints debe ser un entero entre 0 y 20');
  }

  const rules = value['disciplineRules'];
  if (!Array.isArray(rules) || rules.length > 50) {
    errors.push('disciplineRules debe ser una lista (máximo 50)');
  } else {
    const seen = new Set<string>();
    rules.forEach((rule: unknown, i) => {
      if (!isObject(rule)) {
        errors.push(`disciplineRules[${i}] debe ser un objeto`);
        return;
      }
      const discipline = rule['discipline'];
      if (typeof discipline !== 'string' || !KEY.test(discipline)) {
        errors.push(`disciplineRules[${i}].discipline no es una clave válida`);
      } else if (seen.has(discipline)) {
        errors.push(`disciplineRules: ${discipline} aparece más de una vez`);
      } else {
        seen.add(discipline);
      }
      for (const flag of ['players', 'npc']) {
        if (typeof rule[flag] !== 'boolean') {
          errors.push(`disciplineRules[${i}].${flag} debe ser true o false`);
        }
      }
    });
  }

  const clans = value['allowedClans'];
  if (
    clans !== 'all' &&
    !(
      Array.isArray(clans) &&
      clans.length <= 50 &&
      clans.every((c) => typeof c === 'string' && KEY.test(c))
    )
  ) {
    errors.push("allowedClans debe ser 'all' o una lista de clanes");
  }

  const min = value['minGeneration'];
  const max = value['maxGeneration'];
  if (min !== undefined && !isInt(min, 1, 15))
    errors.push('minGeneration debe ser un entero entre 1 y 15');
  if (max !== undefined && !isInt(max, 1, 15))
    errors.push('maxGeneration debe ser un entero entre 1 y 15');
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    errors.push('minGeneration no puede ser mayor que maxGeneration');
  }

  if (!isInt(value['extraFreebies'], 0, 50)) {
    errors.push('extraFreebies debe ser un entero entre 0 y 50');
  }
  if (value['diceVisibility'] !== 'all' && value['diceVisibility'] !== 'master-only') {
    errors.push("diceVisibility debe ser 'all' o 'master-only'");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, config: value as unknown as RoomConfig };
}
