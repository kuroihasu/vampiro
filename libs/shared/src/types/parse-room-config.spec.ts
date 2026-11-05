import { describe, expect, it } from 'vitest';
import { parseRoomConfig } from './parse-room-config.js';
import { DEFAULT_ROOM_CONFIG } from './room-config.js';

describe('parseRoomConfig', () => {
  it('acepta la configuración por defecto', () => {
    expect(parseRoomConfig(DEFAULT_ROOM_CONFIG)).toEqual({ ok: true, config: DEFAULT_ROOM_CONFIG });
  });

  it('acepta una configuración completa', () => {
    const config = {
      allowMeritsFlaws: false,
      maxFlawPoints: 3,
      disciplineRules: [{ discipline: 'temporis', players: false, npc: true }],
      allowedClans: ['brujah', 'toreador'],
      minGeneration: 10,
      maxGeneration: 13,
      extraFreebies: 5,
      diceVisibility: 'master-only',
    };
    expect(parseRoomConfig(config)).toEqual({ ok: true, config });
  });

  it('explica cada error', () => {
    const result = parseRoomConfig({
      allowMeritsFlaws: 'sí',
      disciplineRules: [{ discipline: 'Temporis!', players: true }],
      allowedClans: 'ninguno',
      minGeneration: 14,
      maxGeneration: 9,
      extraFreebies: -1,
      diceVisibility: 'nadie',
      otro: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'allowMeritsFlaws debe ser true o false',
        'disciplineRules[0].discipline no es una clave válida',
        'disciplineRules[0].npc debe ser true o false',
        "allowedClans debe ser 'all' o una lista de clanes",
        'extraFreebies debe ser un entero entre 0 y 50',
        "diceVisibility debe ser 'all' o 'master-only'",
        'minGeneration no puede ser mayor que maxGeneration',
        'campo desconocido: otro',
      ]),
    );
  });

  it('no admite reglas repetidas para la misma disciplina', () => {
    const result = parseRoomConfig({
      ...DEFAULT_ROOM_CONFIG,
      disciplineRules: [
        { discipline: 'temporis', players: false, npc: true },
        { discipline: 'temporis', players: true, npc: true },
      ],
    });
    expect(result.ok).toBe(false);
  });
});
