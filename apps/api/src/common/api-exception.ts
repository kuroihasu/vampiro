import { HttpException } from '@nestjs/common';
import type { ApiErrorCode, RuleViolation } from '@vampiro/shared';

/** Excepción de dominio con código propio. El filtro global la convierte en ApiErrorBody. */
export class ApiException extends HttpException {
  constructor(
    status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly violations?: RuleViolation[],
  ) {
    super(message, status);
  }
}

/** 422 con la lista de violaciones del motor de reglas. */
export class RuleViolationException extends ApiException {
  constructor(violations: RuleViolation[]) {
    super(422, 'RULE_VIOLATION', 'La ficha no cumple las reglas de la edición.', violations);
  }
}
