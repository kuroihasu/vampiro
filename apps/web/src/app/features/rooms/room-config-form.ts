import type { RoomConfig } from '@vampiro/shared';

export type DisciplineAudience = 'players' | 'npc';

/** ¿Puede usar esta disciplina ese tipo de personaje? Sin regla, sí. */
export function disciplineAllowed(
  config: RoomConfig,
  discipline: string,
  who: DisciplineAudience,
): boolean {
  return config.disciplineRules.find((r) => r.discipline === discipline)?.[who] ?? true;
}

/**
 * Cambia el permiso de una disciplina. Las reglas que permiten todo se eliminan,
 * así la configuración solo guarda las restricciones reales.
 */
export function setDisciplineAllowed(
  config: RoomConfig,
  discipline: string,
  who: DisciplineAudience,
  allowed: boolean,
): RoomConfig {
  const current = config.disciplineRules.find((r) => r.discipline === discipline) ?? {
    discipline,
    players: true,
    npc: true,
  };
  const next = { ...current, [who]: allowed };
  const others = config.disciplineRules.filter((r) => r.discipline !== discipline);
  const keep = !(next.players && next.npc);
  const disciplineRules = keep
    ? config.disciplineRules.some((r) => r.discipline === discipline)
      ? config.disciplineRules.map((r) => (r.discipline === discipline ? next : r))
      : [...others, next]
    : others;
  return { ...config, disciplineRules };
}

export function clanAllowed(config: RoomConfig, clan: string): boolean {
  return config.allowedClans === 'all' || config.allowedClans.includes(clan);
}

/** Marca o desmarca un clan. Si quedan todos marcados, se guarda como 'all'. */
export function setClanAllowed(
  config: RoomConfig,
  allClans: string[],
  clan: string,
  allowed: boolean,
): RoomConfig {
  const current = config.allowedClans === 'all' ? allClans : config.allowedClans;
  const next = allowed ? [...new Set([...current, clan])] : current.filter((c) => c !== clan);
  const allowedClans = allClans.every((c) => next.includes(c))
    ? 'all'
    : allClans.filter((c) => next.includes(c));
  return { ...config, allowedClans };
}
