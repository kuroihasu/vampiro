import type { ApiErrorBody, ApiErrorCode, RuleViolation } from '@vampiro/shared';

/** Error de la API ya normalizado (lo produce errorInterceptor). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown[],
    readonly violations?: RuleViolation[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromBody(status: number, body: Partial<ApiErrorBody> | null | undefined): ApiError {
    return new ApiError(
      status,
      body?.code ?? 'ERROR_INTERNO',
      body?.message ?? 'Algo ha fallado en el servidor. Inténtalo de nuevo en un momento.',
      body?.details,
      body?.violations,
    );
  }
}

/** Mensaje para mostrar al usuario a partir de cualquier error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Algo ha fallado. Inténtalo de nuevo en un momento.';
}
