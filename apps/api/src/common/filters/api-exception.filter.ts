import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ApiErrorBody, ApiErrorCode } from '@vampiro/shared';
import { ApiException } from '../api-exception.js';

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'NO_AUTENTICADO',
  403: 'PROHIBIDO',
  404: 'NO_ENCONTRADO',
  429: 'DEMASIADAS_SOLICITUDES',
};

/** Convierte cualquier excepción al formato de error común (ApiErrorBody). */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        `[${body.traceId}]`,
        exception instanceof Error ? exception.stack : exception,
      );
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof ApiException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        violations: exception.violations,
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && response !== null && 'message' in response
          ? (response as { message: unknown }).message
          : exception.message;
      return {
        statusCode: status,
        code: CODE_BY_STATUS[status] ?? 'ERROR_INTERNO',
        message: Array.isArray(message) ? 'Datos inválidos.' : String(message),
        details: Array.isArray(message) ? message : undefined,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'ERROR_INTERNO',
      message: 'Error inesperado.',
      traceId: randomUUID(),
      timestamp,
    };
  }
}
