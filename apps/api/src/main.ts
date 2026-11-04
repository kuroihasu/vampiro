import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.service.js';
import { setupApp } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await app.listen(app.get(AppConfig).get('PORT'));
}
await bootstrap();
