import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { HealthModule } from './modules/health/health.module.js';
import { RulesModule } from './modules/rules/rules.module.js';

/*
 * Módulos previstos en la arquitectura (se agregan por fases):
 * auth, users, wiki, characters, rooms, dice, realtime.
 */
@Module({
  imports: [HealthModule, RulesModule],
  providers: [
    // Filtro global registrado por DI: aplica también en los tests e2e y puede inyectar servicios.
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
