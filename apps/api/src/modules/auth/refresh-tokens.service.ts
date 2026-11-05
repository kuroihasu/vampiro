import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ApiException } from '../../common/api-exception.js';
import { AppConfig } from '../../config/app-config.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface IssuedRefreshToken {
  /** Valor que recibe el cliente (en la cookie). Nunca se guarda en la base. */
  token: string;
  expiresAt: Date;
}

/**
 * Refresh tokens opacos y rotados. Se guarda solo su hash SHA-256: tienen 256 bits
 * aleatorios, así que no hace falta un hash lento y se pueden buscar por índice.
 */
@Injectable()
export class RefreshTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async issue(userId: string): Promise<IssuedRefreshToken> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.config.get('REFRESH_TOKEN_TTL_DAYS') * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
    return { token, expiresAt };
  }

  /**
   * Revoca el token recibido y emite uno nuevo para el mismo usuario.
   * Si el token ya estaba revocado, alguien lo está reutilizando (posible robo):
   * se revocan todas las sesiones del usuario.
   */
  async rotate(token: string | undefined): Promise<{ userId: string } & IssuedRefreshToken> {
    if (!token) throw invalidSession();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!stored) throw invalidSession();

    if (stored.revokedAt) {
      await this.revokeAllForUser(stored.userId);
      throw invalidSession();
    }
    if (stored.expiresAt <= new Date()) throw invalidSession();

    // updateMany con revokedAt: null evita que dos peticiones simultáneas roten el mismo token.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      await this.revokeAllForUser(stored.userId);
      throw invalidSession();
    }

    return { userId: stored.userId, ...(await this.issue(stored.userId)) };
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const invalidSession = () =>
  new ApiException(401, 'NO_AUTENTICADO', 'La sesión ha caducado. Vuelve a entrar.');
