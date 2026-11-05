import type { ApiErrorCode } from './codes.js';
import type { RuleViolation } from './violation.js';

/** Formato único de error que devuelve la API (lo produce el filtro global de NestJS). */
export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  /** Detalle de validación (400) o violaciones de reglas (422). */
  details?: unknown[];
  violations?: RuleViolation[];
  traceId?: string;
  timestamp: string;
}
