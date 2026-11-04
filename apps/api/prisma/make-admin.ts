/*
 * Da el rol de administrador a una cuenta que ya existe:
 *   pnpm db:admin tu@email.com
 * Crea primero la cuenta desde la web (/registro); este script no guarda contraseñas.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Uso: pnpm db:admin <email>');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No hay ninguna cuenta con ${email}. Regístrate primero en la web.`);
    process.exitCode = 1;
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
    console.log(`${user.displayName} (${email}) ya es administrador.`);
  }
} finally {
  await prisma.$disconnect();
}
