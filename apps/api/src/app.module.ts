import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { RulesModule } from './modules/rules/rules.module.js';

/*
 * Módulos previstos en la arquitectura (se agregan por fases):
 * auth, users, wiki, characters, rooms, dice, realtime.
 */
@Module({
  imports: [HealthModule, RulesModule],
})
export class AppModule {}
