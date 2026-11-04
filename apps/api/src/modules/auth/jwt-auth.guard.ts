import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ApiException } from '../../common/api-exception.js';
import type { AccessTokenPayload, AuthUser } from '../../common/auth/auth-user.js';
import { IS_PUBLIC_KEY } from '../../common/auth/public.decorator.js';
import { UsersService } from '../users/users.service.js';

/**
 * Guard global: toda ruta exige un access token válido salvo las marcadas con @Public().
 * Comprueba además que el usuario sigue existiendo y toma su rol de la base.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Los WebSocket se autentican al conectar (middleware de RoomsGateway).
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearer(request);
    if (!token) throw unauthenticated();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw unauthenticated();
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw unauthenticated();
    request.user = { id: user.id, role: user.role };
    return true;
  }
}

function extractBearer(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : undefined;
}

const unauthenticated = () => new ApiException(401, 'NO_AUTENTICADO', 'Necesitas iniciar sesión.');
