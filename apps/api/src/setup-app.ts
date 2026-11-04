import type { INestApplication } from '@nestjs/common';

/** Configuración común de la app. La usan main.ts y los tests e2e para no divergir. */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
}
