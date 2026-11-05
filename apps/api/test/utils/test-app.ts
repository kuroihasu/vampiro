import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { setupApp } from '../../src/setup-app.js';

export interface TestApp {
  app: INestApplication<App>;
  prisma: PrismaService;
}

export interface TestAppOptions {
  /**
   * Límite de intentos de login/registro. Por defecto se sube para que las pruebas
   * funcionales no choquen con él; la prueba del 429 pasa el límite real.
   */
  authThrottleLimit?: number;
}

/** Levanta la app completa (misma configuración que main.ts) contra la base de tests. */
export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(getOptionsToken())
    .useValue([{ ttl: 60_000, limit: options.authThrottleLimit ?? 1_000 }])
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Vacía las tablas entre pruebas. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "RoomCharacter", "RoomMember", "Room", "Character", "RefreshToken", "User", "WikiArticle" RESTART IDENTITY CASCADE',
  );
}
