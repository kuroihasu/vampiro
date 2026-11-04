import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse } from '@vampiro/shared';
import { ApiException } from '../../common/api-exception.js';
import type { AccessTokenPayload } from '../../common/auth/auth-user.js';
import { AppConfig } from '../../config/app-config.service.js';
import type { User } from '../../generated/prisma/client.js';
import { emailInUse, toPublicUser, UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { type IssuedRefreshToken, RefreshTokensService } from './refresh-tokens.service.js';

/** Resultado de una operación que abre sesión: cuerpo de la respuesta + refresh para la cookie. */
export interface SessionResult {
  body: AuthResponse;
  refresh: IssuedRefreshToken;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly refreshTokens: RefreshTokensService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  async register(dto: RegisterDto): Promise<SessionResult> {
    if (await this.users.findByEmail(dto.email)) throw emailInUse();
    const user = await this.users.create({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash: await this.hasher.hash(dto.password),
    });
    return this.openSession(user);
  }

  async login(dto: LoginDto): Promise<SessionResult> {
    const user = await this.users.findByEmail(dto.email);
    const ok = user
      ? await this.hasher.verify(user.passwordHash, dto.password)
      : await this.hasher.verifyDummy(dto.password);
    if (!user || !ok) {
      throw new ApiException(401, 'CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos.');
    }
    return this.openSession(user);
  }

  async refresh(token: string | undefined): Promise<SessionResult> {
    const rotated = await this.refreshTokens.rotate(token);
    const user = await this.users.findById(rotated.userId);
    if (!user) throw new ApiException(401, 'NO_AUTENTICADO', 'La sesión ya no es válida.');
    return { body: await this.buildResponse(user), refresh: rotated };
  }

  logout(token: string | undefined): Promise<void> {
    return this.refreshTokens.revoke(token);
  }

  private async openSession(user: User): Promise<SessionResult> {
    return {
      body: await this.buildResponse(user),
      refresh: await this.refreshTokens.issue(user.id),
    };
  }

  private async buildResponse(user: User): Promise<AuthResponse> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
      user: toPublicUser(user),
    };
  }
}
