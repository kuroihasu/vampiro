import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/** Variables de entorno de la API. Se validan al arrancar: si falta algo, no levanta. */
export class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Type(() => Number)
  @IsInt()
  PORT = 3000;

  @IsUrl({ require_tld: false })
  WEB_ORIGIN = 'http://localhost:4200';

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL debe ser una URL de PostgreSQL' })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS = 7;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_THROTTLE_LIMIT = 5;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_THROTTLE_TTL_SECONDS = 60;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`Configuración inválida. ${detail}`);
  }
  return env;
}
