import type { ViolationCode } from './codes.js';

export type ViolationSeverity = 'error' | 'warning';

/**
 * Una regla incumplida. `error` bloquea guardar/aplicar el punto;
 * `warning` solo informa (p. ej. puntos sin repartir en un borrador).
 */
export interface RuleViolation {
  code: ViolationCode;
  severity: ViolationSeverity;
  message: string;
  /** Rasgo o grupo afectado, para pintar la alerta junto a él. */
  path?: string;
}
