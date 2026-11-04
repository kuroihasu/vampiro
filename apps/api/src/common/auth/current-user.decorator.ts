import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.js';

/** Inyecta el usuario autenticado en un parámetro del controlador. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    (ctx.switchToHttp().getRequest<Request>() as Request & { user: AuthUser }).user,
);
