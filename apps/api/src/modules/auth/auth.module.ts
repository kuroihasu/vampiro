import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfig } from '../../config/app-config.service.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PasswordHasher } from './password-hasher.js';
import { RefreshTokensService } from './refresh-tokens.service.js';

const JWT_ISSUER = 'vampiro-api';
const JWT_AUDIENCE = 'vampiro-web';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_TTL_SECONDS'),
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
        verifyOptions: { issuer: JWT_ISSUER, audience: JWT_AUDIENCE, algorithms: ['HS256'] },
      }),
    }),
    // Solo se aplica (con ThrottlerGuard) a login y registro.
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [
        {
          ttl: config.get('AUTH_THROTTLE_TTL_SECONDS') * 1000,
          limit: config.get('AUTH_THROTTLE_LIMIT'),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    RefreshTokensService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
