import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './app-config.service.js';
import { validateEnv } from './env.validation.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      // Los e2e (NODE_ENV=test) usan .env.test y la base vampiro_test.
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validateEnv,
      cache: true,
    }),
  ],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}
