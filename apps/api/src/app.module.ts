import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { AppConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RulesModule } from './modules/rules/rules.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WikiModule } from './modules/wiki/wiki.module.js';

/*
 * Monolito modular. Fase 1: auth, users y wiki (solo lectura).
 * Próximos módulos: characters, rooms, dice, realtime.
 */
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    RulesModule,
    AuthModule,
    UsersModule,
    WikiModule,
  ],
  providers: [
    // Filtro global registrado por DI: aplica también en los tests e2e y puede inyectar servicios.
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
