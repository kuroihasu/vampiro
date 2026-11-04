import { execSync } from 'node:child_process';
import { config } from 'dotenv';

/** Aplica las migraciones a la base de tests (vampiro_test) antes de los e2e. */
export default function setup() {
  const env = config({ path: '.env.test', quiet: true }).parsed;
  if (!env?.DATABASE_URL?.includes('_test')) {
    throw new Error('Los e2e necesitan apps/api/.env.test apuntando a una base *_test.');
  }
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
  });
}
