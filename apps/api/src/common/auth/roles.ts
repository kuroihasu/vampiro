import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@vampiro/shared';
import type { Request } from 'express';
import { ApiException } from '../api-exception.js';
import type { AuthUser } from './auth-user.js';

export const ROLES_KEY = 'roles';

/** Exige uno de estos roles (se usa junto con RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Comprueba el rol del usuario autenticado. El rol viene de la base (lo pone JwtAuthGuard),
 * no del token, así que quitar el rol a alguien surte efecto al momento.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user || !roles.includes(user.role)) {
      throw new ApiException(403, 'PROHIBIDO', 'No tienes permiso para hacer esto.');
    }
    return true;
  }
}
