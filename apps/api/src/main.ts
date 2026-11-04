import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4200' });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
