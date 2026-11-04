import { type INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppConfig } from './config/app-config.service.js';

/** Configuración común de la app. La usan main.ts y los tests e2e para no divergir. */
export function setupApp(app: INestApplication): void {
  const config = app.get(AppConfig);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get('WEB_ORIGIN'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
