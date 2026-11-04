import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Sin .env, `prisma generate` (postinstall) funciona igual; migrate y seed sí lo necesitan.
    url: process.env.DATABASE_URL ?? '',
  },
});
