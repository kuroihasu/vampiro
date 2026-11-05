import { validateEnv } from './env.validation.js';

const valid = {
  DATABASE_URL: 'postgresql://vampiro:vampiro@localhost:5432/vampiro',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('aplica valores por defecto y convierte números', () => {
    const env = validateEnv({ ...valid, PORT: '4000' });
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 4000,
      WEB_ORIGIN: 'http://localhost:4200',
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 7,
      AUTH_THROTTLE_LIMIT: 5,
      AUTH_THROTTLE_TTL_SECONDS: 60,
    });
  });

  it('falla si falta DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_ACCESS_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('exige un secreto JWT de al menos 32 caracteres', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'corto' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
