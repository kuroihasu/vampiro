import type { UserRole } from '@vampiro/shared';

/** Usuario autenticado que el guard deja en `request.user`. */
export interface AuthUser {
  id: string;
  role: UserRole;
}

/** Contenido del access token. Solo datos no sensibles. */
export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}
