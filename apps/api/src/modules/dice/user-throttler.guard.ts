import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '../../common/auth/auth-user.js';

/** Limita por usuario autenticado (y por IP si no lo hay), no solo por IP. */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as AuthUser | undefined;
    return Promise.resolve(user?.id ?? String(req['ip'] ?? 'desconocido'));
  }
}
