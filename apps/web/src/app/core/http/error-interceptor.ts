import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import type { ApiErrorBody } from '@vampiro/shared';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../api-error';

/**
 * Convierte los errores HTTP en ApiError con el código de @vampiro/shared,
 * para que las pantallas muestren mensajes concretos sin conocer HttpErrorResponse.
 * Va primero en la cadena, así authInterceptor sigue viendo el 401 original.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      if (error.status === 0) {
        return throwError(
          () =>
            new ApiError(
              0,
              'ERROR_INTERNO',
              'No se pudo conectar con el servidor. Comprueba tu conexión.',
            ),
        );
      }
      const body = isErrorBody(error.error) ? error.error : undefined;
      return throwError(() => ApiError.fromBody(error.status, body));
    }),
  );

function isErrorBody(value: unknown): value is Partial<ApiErrorBody> {
  return typeof value === 'object' && value !== null && 'code' in value;
}
